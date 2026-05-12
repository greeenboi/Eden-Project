# yt_downloader_worker

FastAPI worker that downloads YouTube audio as OGG via yt-dlp and forwards it into Eden upload APIs.

## Runtime

- Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

- Health endpoint:

```text
GET /health
```

## Environment Variables

- `API_BASE_DEFAULT`: Eden API base URL.
- `YTDLP_COOKIES_PATH`: local cookies.txt path used for cookie fallback retries.
- `YTDLP_COOKIES_GIST_URL`: optional URL used to refresh cookies file on failure.
- `YTDLP_YOUTUBE_PO_TOKEN`: optional YouTube PO token extractor arg value.
- `YTDLP_YOUTUBE_VISITOR_DATA`: optional YouTube visitor data extractor arg value.

## yt-dlp Strategy

The worker attempts multiple YouTube clients when no cookies are used:

1. `ios`
2. `android`
3. `tv_simply`
4. default client

On failures, the worker logs bounded stderr tails per attempt and returns structured failure metadata to make Render/datacenter-IP bot detection easier to debug.

## PO Token Notes

- PO token and visitor data are passed through `--extractor-args` when env vars are configured.
- YouTube PO token behavior changes frequently and may require provider-based automation for long-term reliability.
- Keep yt-dlp current; this worker pins and upgrades yt-dlp in Docker builds.

## Docker

Dependencies are installed from `requirements.txt`, and yt-dlp is explicitly refreshed to a known version during image build to reduce stale cache issues.
