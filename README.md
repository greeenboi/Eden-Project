<img width="1454" height="758" alt="eden_product_mockup" src="https://github.com/user-attachments/assets/5b4dbad9-fc69-49b3-9299-1969e3640010" />

---
[![License: GPLV3](https://img.shields.io/badge/License-GPLV3-green.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2055-blue)](https://expo.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![API Docs](https://img.shields.io/badge/API-Scalar%20Docs-purple)](https://eden-server.suvan-gowrishanker-204.workers.dev/scalar)
---
🌿 Eden Project
Your music. Your server. Your rules.
A fully self-hosted, open-source music ecosystem — built and deployable for free — that lets you rip, store, and stream your favorite songs across Android, desktop, and the web.


## What is Eden?
 
Eden is a **self-hosted music platform** — an open alternative to Spotify — that gives you complete control over your music library. Instead of paying for a streaming subscription, you migrate your favourite songs from YouTube, Spotify, or SoundCloud into your own server, and then listen to them on any Eden client.
 
The ecosystem is split into five modular components that work together:
 
| Component | Role |
|---|---|
| **Eden** | Android / iOS music player app |
| **Eden Garden** | Chrome extension to rip songs from the web |
| **Eden Server** | Authoritative API server for all music operations |
| **Eden Desktop** | WIP desktop music player |
| **Workers** | Cloudflare Worker microservices (gateway, metadata, downloader) |
 
Everything is **free to build and deploy** — Eden Server and all Workers run on Cloudflare's free tier.

## Components
 
### Eden — Mobile App
> React Native · Expo SDK 55 · Android & iOS
 
The primary listening experience. Eden is a full-featured mobile music player that connects to your Eden Server instance and streams your personal library.
 
**Features:**
- Stream songs directly from your self-hosted Eden Server
- Auth-backed personalised song lists and listening history
- AI-powered song suggestions based on your library
- Full metadata display — song title, artist, album art, album info, duration
- Browse by artist, album, or playlist
- Offline-ready architecture
---
 
### Eden Garden — Chrome Extension
> Plasmo Framework · React · Chrome Web Store
 
Eden Garden is the ingestion pipeline for your library. When you're listening to a track anywhere on the web, Garden lets you grab it and push it to your server — with full metadata control.
 
**Features:**
- Detects currently playing songs on **YouTube**, **Spotify**, and **SoundCloud**
- Automatically fetches rich metadata (title, artist, album, cover art) via the `yt-metadata` worker
- Lets you review and **manually edit any metadata field** before uploading
- Sends the finalized song and metadata to Eden Server with one click
- Works seamlessly with the Eden Worker pipeline for downloading and processing
---
 
### Eden Server — API Backend
> Cloudflare Workers · Hono · REST API
 
The authoritative server that powers every Eden client. All song playback, uploads, user auth, and library management flows through here.
 
**Full API specification:** [Scalar Docs →](https://eden-server.suvan-gowrishanker-204.workers.dev/scalar)
 
**Responsibilities:**
- Song upload, storage, and streaming endpoints
- User authentication and personalisation logic
- Library management — songs, artists, albums, playlists
- Queue management and playback state
- Acts as the orchestration layer for Worker calls
---
 
### Eden Desktop — Desktop App *(WIP)*
> In active development
 
A desktop counterpart to the Eden mobile app. Planned to be a full alternative to Spotify desktop, offering the same listening features as Eden mobile plus desktop-specific enhancements like local file integration and richer keyboard controls.
 
---
 
### Workers — Cloudflare Microservices
 
Three purpose-built Cloudflare Workers that handle the heavy lifting. Each is modular and independently deployable.
 
#### Eden Gateway
The API gateway, service registry, and queue manager for the Worker layer.
- Routes requests to the appropriate downstream worker
- Maintains a service registry for worker discovery
- Queues multiple concurrent worker jobs (e.g., bulk downloads)
- Acts as the single entry point for Eden Server → Worker communication
#### yt-metadata
A metadata enrichment worker that fetches detailed song information from streaming platforms.
- Resolves metadata for tracks, albums, artists, and playlists
- Sources data from **Spotify**, **SoundCloud**, and **YouTube Music**
- Results are consumed by Eden Garden and Eden Server to populate song records
#### yt-downloader
A modular, queueable download worker powered by `yt-dlp`.
- Downloads audio from YouTube when queued by the Eden Gateway
- Processes the audio and hands it off to Eden Server for storage
- Designed to be horizontally scalable through the gateway queue
---

## Architecture Overview


<img width="2872" height="4142" alt="diagram-export-11-21-2025-7_00_27-PM" src="https://github.com/user-attachments/assets/8611e59e-2548-42f0-8a33-730f03ca7b2f" />

<img width="1197" height="640" alt="diagram-export-11-21-2025-7_00_40-PM" src="https://github.com/user-attachments/assets/95d6948f-bb7d-4d92-8d9f-24b85c047923" />

<img width="1935" height="753" alt="image" src="https://github.com/user-attachments/assets/aeccd27c-d227-4356-88c4-0b51981dc663" />

---
 
## Getting Started
 
### Prerequisites
 
- [Node.js](https://nodejs.org) v22+
- [Bun](https://bun.sh) (recommended) or npm
- [Cloudflare account](https://dash.cloudflare.com) (free tier is sufficient)
- [Expo CLI](https://expo.dev/tools) for mobile development
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for deploying Workers
---
 
### 1. Deploy Eden Server
 
```bash
cd eden-server
bun install
wrangler deploy
```
 
Note the deployed Worker URL — you'll need it for the clients and other Workers.
 
---
 
### 2. Deploy the Workers
 
```bash
# Gateway
cd workers/eden-gateway
wrangler deploy
 
# Metadata worker
cd workers/yt-metadata
wrangler deploy
 
# Downloader
cd workers/yt-downloader
wrangler deploy
```
 
Configure each worker's bindings and environment variables in `wrangler.toml`.
 
---
 
### 3. Run Eden (Mobile App)
 
```bash
cd eden
bun install
npx expo start
```
 
Point the app to your Eden Server URL in the config, then scan the QR code with Expo Go or build a native binary with `eas build`.
 
---
 
### 4. Load Eden Garden (Chrome Extension)
 
```bash
cd eden-garden
bun install
bun run build
```
 
1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** and select the `build/chrome-mv3-prod` directory
4. Configure the extension with your Eden Server URL
---
 
## API Reference
 
The full Eden Server API is documented with Scalar:
 
🔗 **[https://eden-server.suvan-gowrishanker-204.workers.dev/scalar](https://eden-server.suvan-gowrishanker-204.workers.dev/scalar)**
 
Covers all endpoints for auth, song upload, streaming, library management, and worker orchestration.
 
---
 
## 🛠️ Tech Stack
 
| Layer | Technology |
|---|---|
| Mobile App | React Native, Expo SDK 55 |
| Desktop App | *(WIP)* |
| Chrome Extension | Plasmo, React |
| API Server | Cloudflare Workers, Hono |
| Worker Microservices | Cloudflare Workers, yt-dlp |
| Metadata Sources | YouTube Music, Spotify, SoundCloud |
 
---
 
## 🗺️ Roadmap
 
- [x] Eden mobile app (Expo SDK 55)
- [x] Eden Garden Chrome extension
- [x] Eden Server (auth, upload, streaming)
- [x] Eden Gateway (worker queue + registry)
- [x] yt-metadata worker
- [x] yt-downloader worker
- [ ] Eden Desktop (in progress)
- [ ] iOS support
- [ ] Playlist sync across clients
- [ ] Offline playback (mobile)
- [ ] Eden Garden — Firefox extension
---
 
## 🤝 Contributing
 
Contributions are welcome! Each component lives in its own directory and can be developed independently. Please open an issue before submitting a large PR so we can discuss the approach.
 
---
 
## License
 
This project is Source Open.. more on that later.
 
---
 
<div align="center">
  Built with 💚 by <a href="https://github.com/greeenboi">@greeenboi</a>
</div>
