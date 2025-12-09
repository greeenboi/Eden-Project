# YouTube Extension Worker

Python Cloudflare Worker that fetches Spotify metadata for YouTube uploads and forwards uploads to the Eden API.

## Endpoints

- `GET /` – Health/info plus echoes Cloudflare binding `MESSAGE` when set.
- `POST /metadata/spotify` – Body `{ "query": "song or artist" }`; returns track + artist metadata from Spotify.

## Environment

- Bindings (set in `wrangler.jsonc` or dashboard):
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` – required for Spotify API calls.
  - `MESSAGE` – optional; shown in `/` response.
- `EDEN_API_BASE` – optional override of Eden server base URL (defaults to production Workers endpoint).

## Local Dev / Deploy

1) Install `uv`: see the [uv installer guide](https://docs.astral.sh/uv/getting-started/installation/#standalone-installer)
2) Run locally: `uv run pywrangler dev` (uses `wrangler.jsonc`).
3) Deploy: `uv run pywrangler deploy`.

## Notes

- Cloudflare worker env bindings are available on `req.scope["env"]` and are passed into Spotify helpers for credentials.
- Spotify calls raise clear HTTP errors when credentials are missing or the API returns non-200 responses.
