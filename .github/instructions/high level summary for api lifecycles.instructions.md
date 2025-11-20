---
applyTo: 'eden-server/**/*.ts'
---
(what happens when an end user clicks Play / streams a song) and the "API lifecycle" (what the backend/API does as requests travel through Cloudflare load balancing, the API gateway (Workers), R2 and D1). I also document the artist upload flow (how files get into R2 and metadata into D1), signed URL generation, streaming considerations (range requests, caching), and security/performance notes. I include example Cloudflare Worker snippets (minimal) to show signed-URL and upload patterns.

High level summary

Edge / CDN (Cloudflare) + Load Balancer receives client requests.
Cloudflare Workers act as API gateway and business logic layer (auth, signed-URL generation, metadata queries).
Cloudflare D1 stores relational metadata (tracks, albums, playlists, users).
Cloudflare R2 stores audio objects (originals, encoded variants).
Cloudflare KV used as a read cache for metadata / rate-limits / signed URL TTL tracking.
Cloudflare Queues / background Workers or external transcoding services used for CPU-heavy processing (transcoding, waveform extraction).
Streaming uses short-lived signed URLs to R2 objects served through Cloudflare CDN; Workers issue the signed URLs after auth & checks.
Part A — Click lifecycle (user taps Play in web/mobile player)

User action

User clicks "Play" in the web or native client.
The client checks local state (is track cached locally?). If not, it sends a request to the API endpoint: GET /tracks/:id/stream (or /tracks/:id/manifest).
Edge / Load Balancer

DNS resolves to Cloudflare's edge.
If you have Cloudflare Load Balancer configured in front of origin groups (for advanced failover / multi-region origins), the LB routes to the best origin or edge-handles the request. With full Cloudflare-native stack you typically let Workers handle routing and LB is optional.
Cloudflare edge terminates TLS and enforces WAF / Rate Limiting rules before Workers.
Cloudflare Worker (API Gateway)

Worker receives GET /tracks/:id/stream.
Worker performs: a. Authentication/authorization: validate session cookie or Authorization: Bearer <JWT>. This can be a token issued by your auth provider or Cloudflare Access. Verify token signature and claims. b. Rate limiting / entitlement check: ensure user is allowed to stream (premium/free limits). c. Metadata lookup: query D1 (or KV cache) for track metadata: available formats, R2 object key(s), license/geo restrictions, DRM flags. d. Policy checks: e.g., region locks, device limit, concurrent streams.
Outcome:
If Worker should return audio directly (Edge-serve), it can proxy a fetch to R2 or the URL and stream the bytes.
More commonly: Worker generates a short-lived signed URL to the R2 object and returns that to the client. This lets Cloudflare CDN serve the audio directly while keeping R2 protected.
Signed URL returned to client

The Worker responds 200 with a payload like: { "stream_url": "https://<r2-host>/<bucket>/<key>?sig=...", "expires_at": "...", "mime": "audio/mpeg", "range_supported": true }
Client uses the signed URL in an HTMLAudioElement, MediaSource, or native player.
Client streams via CDN

The client requests the signed URL; Cloudflare CDN will cache the object at edge locations.
The client sends Range requests for seeking; the CDN responds with 206 Partial Content served from edge if cached or proxied from R2.
Playback metrics and events (play, pause, percent listened) are sent back to the API (Workers) as analytics events — optionally batched and pushed to analytics ingestion.
Part B — API lifecycle (detailed backend flow, including signed-URL generation) Sequence: Client -> Load Balancer/Edge -> Workers (gateway) -> D1/KV -> Worker generates signed URL -> Client <- CDN+R2

Request reaches Workers (API gateway)

Validate incoming request (CORS for web).
Authenticate user:
Check cookie or Authorization header.
Validate JWT (iss, aud, exp).
Optionally call an auth provider endpoint for refresh/token introspection.
Use KV as a fast cache for session + frequently read metadata to minimize D1 hits.
Read metadata (D1 or KV)

Worker tries KV.get("track:metadata:<id>").
On cache miss: D1 SQL: SELECT key, bucket, encodings FROM tracks WHERE id = ?
Worker can populate KV with the D1 result, with a TTL appropriate for frequency of changes.
Authorization & policy checks

Ensure user has entitlement to stream track: check user's subscription, track license, geo-allowlist.
If not authorized, return 403.
Signed URL generation

Option A: Use R2 signed URLs (if you choose to sign R2 URLs). There are two ways:
If using Workers' native R2 bindings in the same account, you can use R2.get() in Workers to serve content directly or to create a pre-signed URL if supported by your setup/SDK.
Create a signed URL by computing a signature with a server-side secret (HMAC) and embed TTL and object key in query params; Worker that serves R2 verifies signature on request (a "self-signed proxy" pattern).
Option B (simpler): Worker acts as authenticated proxy so the client fetches the Worker endpoint /r2-proxy/:key which then fetches the object from R2 and streams it back through the edge. This keeps R2 private but adds some worker bandwidth/CPU cost.
Recommended: generate signed URL with short TTL (e.g., 15–60s) that the client can use to fetch from the CDN; Cloudflare will cache signed-URL responses at edge (use cache key normalization policy).
Include response headers: Accept-Ranges: bytes, Content-Type, Cache-Control: public, max-age=..., stale-while-revalidate=....
Notes:

Use env.SECRET stored in Workers Secrets.
If you rely on Cloudflare's R2 S3-compatible pre-signed signing APIs, use the SDK to generate canonical presigned URLs instead.
Caching & CDN behavior

Use strong Cache-Control on R2 responses for immutable encodings (e.g., v1 encoded file).
Use Cache-Tag or surrogate-key headers if you need to invalidate cached objects after replacement.
For dynamic responses (signed URLs), do not cache on edge except where appropriate; the CDN will cache the asset itself once the client fetches the signed URL.
Playback reporting & analytics

The client should send pings to /events (Workers) with play/pause/seek metrics.
Workers batch and write to an analytics pipeline (e.g., Cloudflare Logs, third-party analytics, or a streaming ingestion). Use Cloudflare Queues to buffer writes, reduce latency, and process asynchronously.
Optionally store counters or aggregated metrics in D1 or an OLAP store for recommendations.
Part C — Upload flow for artists (high-level + detailed steps) Goal: Artist uploads source audio; system ingests, validates, stores original to R2, writes metadata to D1, kicks off encoding/transcoding jobs, then makes encoded files available for streaming.

Two main upload models: A. Direct-to-Worker upload (small files, simple) B. Direct-to-R2 upload using signed PUT URL (recommended for large files) — client uploads object directly to R2 (or proxied through Workers if necessary) to avoid worker CPU/bandwidth limits.

Recommended: Use a multi-step “initiate upload -> signed PUT url -> client uploads -> complete upload” flow.

Upload lifecycle (recommended flow)

Artist requests upload token

Client (artist dashboard) calls POST /uploads/initiate with auth.
Worker validates artist, checks quotas, creates an upload record in D1 (status: initiated) and returns an upload_id and a signed PUT URL for R2 (or parameters for multipart upload).
Generate signed PUT URL for R2

Worker generates a signed PUT URL valid for a reasonable short TTL (e.g., 10 minutes).
Return signed PUT URL and upload_id to client.
Example payload: { upload_id: "uuid", put_url: "https://r2.example.com/bucket/key?signature=...", expires_at: "..." }
Client uploads audio file to R2 directly

Client does PUT/POST to the signed URL (multipart or single PUT).
Client sets Content-Type, Content-Length.
For web clients, use fetch() with PUT or use a form upload endpoint if necessary.
Complete upload / notify backend

After successful PUT, client calls POST /uploads/:upload_id/complete.
Worker verifies that object exists in R2 (head request) and updates upload record in D1 to status: uploaded.
Worker enqueues a job (Cloudflare Queues) to process the file (transcoding, fingerprinting, metadata extraction). D1 stores raw metadata: track title, artist-id, r2_key, duration (if available), encoding statuses.
Transcoding & processing (background)

Background Workers triggered by the queue pick up the job. IMPORTANT: Cloudflare Workers have limited CPU time (and not suited for heavy transcoding).
For CPU-heavy transcoding, push job to a specialised transcoding cluster (e.g., Lambda, Fargate, or a third-party media service). Pattern:
Background Worker reads original from R2 and sends to transcoder service (or instructs service where to fetch).
Transcoder produces target bitrates (96kbps, 160kbps, 320kbps), and writes encoded artifacts back to R2 under deterministic keys (e.g., trackId/v1/320.mp3).
Transcoder writes encoding metadata back to D1 (status, keys, waveforms).
If using a managed transcoder, you can have it read original from R2 (R2 public URL or via signed url) and write back to R2.
Finalize & publish

When encodings are ready, update D1 tracks table with available encodings and set status: published.
Invalidate cache or publish cache tags to edge (if replacing old assets).
Artist receives confirmation

Worker returns success to the client when the track is in "processing" or "published".
Artist UI shows progress based on status polled from GET /uploads/:upload_id/status.
Example Worker snippet to create a signed PUT URL stub (conceptual):


Alternative: Use R2's S3-compatible presigned URL generation via SDK if available in your environment.

Part D — Signed URL mechanics (security & TTL)

Use mutual server-side secrets to compute HMAC-based signatures or use S3-style presigned URLs with credentials.
Always keep TTL short (15–60s for streaming URLs; 5–10min for upload URLs).
Protect upload URLs with scope (PUT only) and single-use tokens if possible (store one-time nonce in KV or D1).
For streaming, use signed GET URLs that include allowed ranges or allow Accept-Ranges: bytes. Use signature validation on the Worker/R2 side for additional checks.
For extra security, bind signed URLs to client IP or session id (increases convenience complexity).
Part E — Streaming considerations (Range requests, caching, seeking)

Ensure responses support Accept-Ranges: bytes and 206 Partial Content to enable seek.
Use Cache-Control headers on R2 objects:
For immutable files (versioned keys): Cache-Control: public, max-age=86400 (or more).
For dynamic/replaceable files: Cache-Control: public, max-age=60, stale-while-revalidate=300.
Normalize cache keys: if you generate signed URLs that differ per-user, configure CDN to ignore query strings (or use cache-key normalization) and rely on authorization at Worker level for access checks. Alternatively, make signed URLs short-lived but allow CDN caching by mapping to a canonical cache key (use Worker to set cache-control and surrogate keys).
Use chunked transfer or ranged GET for low-latency playback start.
If you need DRM, the Worker can perform license token issuance to the DRM service (FairPlay/PlayReady/CENC) instead of raw signed URLs.
Part F — Metadata & D1 usage patterns

Use D1 as the source-of-truth relational DB:
Tracks table: id, artist_id, title, r2_key_original, encodings (JSON), duration, published_at, status
Artists table: id, name, profile, legal metadata
Users table: id, subscription_tier, region, device_limits
Play events: for high-volume events, send to event ingestion (not D1 row-per-event), or aggregate into D1.
Use KV for:
Frequently read but rarely updated items (track metadata caches, album artwork small items).
Session tokens and quick lookups.
Use D1 for writes that require transactions and relational queries (playlist membership, ownership checks).
Part G — Error handling & edge cases

Signed URL expired: return 401/403 and provide refresh endpoint to get new signed URL.
Concurrency limits exceeded: return 429 with Retry-After header.
Failed transcoding: mark status: failed in D1 and notify artist.
Partial uploads: allow resumable uploads (multipart or by using byte-range PUTs) by storing parts in R2 or using multipart upload support.
Hotlinking: deny direct access to R2 by public URLs without valid signature or worker mediation.
Part H — Performance & cost optimizations

Cache metadata in KV for low-latency reads.
Use Cloudflare CDN aggressively for audio assets (R2 has no egress fee to Cloudflare edges in many regions).
Use versioned keys to let CDN cache long-lived objects without complex invalidation.
Batch or buffer analytics events using Queues to avoid synchronous writes.
Use small TTLs on signed URLs to prevent stolen URLs from being used long.
Part I — Example sequence diagrams (compact)

Play request (stream)

Client -> Cloudflare Edge -> Worker: GET /tracks/:id/stream + Auth
Worker -> KV: try get metadata
KV miss -> Worker -> D1: SELECT track
Worker validates user entitlement
Worker -> (create signed URL or proxy) -> respond with stream_url
Client -> CDN: GET signed_url (Range requests allowed)
CDN -> R2 or cached edge -> return bytes to client
Upload (recommended direct-to-R2)

Artist client -> Worker: POST /uploads/initiate (auth)
Worker -> D1: create upload record
Worker -> Return signed PUT URL to client
Client -> R2 signed PUT URL: PUT file
Client -> Worker: POST /uploads/:id/complete
Worker -> head R2 -> confirm uploaded -> D1 status updated -> enqueue processing job
Transcoder -> write encodings to R2 -> update D1
Worker / system -> publish track, invalidate caches
Part J — Operational & security notes

Secrets: store HMAC keys and any S3 credentials in Worker secrets.
Auditing: log upload/create/publish events in a secure traceable log.
Legal: ensure you store licensing metadata, geographic restrictions in D1 and enforce via Worker.
Rate limiting: use Cloudflare Rate Limits and Workers logic for per-user throttles.
Monitoring: instrument Worker functions, D1 query latencies, R2 operation latencies. Use synthetic checks for streaming start times.

Closing notes / recommendations

The Cloudflare stack (Workers, R2, D1, KV, CDN, Queues) can implement a full Spotify-like streaming flow for core functionality: metadata, storage, delivery, and signed URLs.
Heavy CPU processes (audio transcoding, fingerprinting, machine-learning recommendation training) are better offloaded to specialized compute or serverless functions outside Workers (or to a worker-backed service if that fits limits).
Design for immutable, versioned keys in R2 to maximize CDN cache benefits and simplify invalidation.
Use short-lived signed URLs + edge caching patterns to balance security and CDN efficiency.
Prototype the signed-URL approach and test range/seek UX and caching behavior before scaling.