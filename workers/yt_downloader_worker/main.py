import json
import logging
import os
import queue
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Callable, List, Optional, TypeVar

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("yt_downloader_worker")

# Enable httpx request/response logging
logging.getLogger("httpx").setLevel(logging.DEBUG)
logging.getLogger("httpcore").setLevel(logging.DEBUG)

cleanup_queue: "queue.SimpleQueue[str]" = queue.SimpleQueue()
_cleanup_worker_started = False


def _cleanup_worker() -> None:
    while True:
        tmp_path = cleanup_queue.get()
        try:
            shutil.rmtree(tmp_path)
            logger.info("[cleanup] removed temp dir: %s", tmp_path)
        except FileNotFoundError:
            logger.debug("[cleanup] temp dir already missing: %s", tmp_path)
        except Exception:
            logger.exception("[cleanup] failed to remove temp dir: %s", tmp_path)


def start_cleanup_worker() -> None:
    global _cleanup_worker_started
    if _cleanup_worker_started:
        return
    thread = threading.Thread(target=_cleanup_worker, name="cleanup_worker", daemon=True)
    thread.start()
    _cleanup_worker_started = True
    logger.info("[cleanup] background cleanup worker started")


def enqueue_cleanup(path: Path) -> None:
    cleanup_queue.put(str(path))


start_cleanup_worker()


API_BASE_DEFAULT = os.getenv(
    "API_BASE_DEFAULT",
)
YTDLP_COOKIES_PATH = os.getenv("YTDLP_COOKIES_PATH")


class ArtistInput(BaseModel):
    name: str
    bio: Optional[str] = None
    avatarUrl: Optional[str] = None
    spotifyUri: Optional[str] = None
    followers: Optional[int] = None
    popularity: Optional[int] = None


class TrackInput(BaseModel):
    title: Optional[str] = None
    duration: Optional[float] = None
    isrc: Optional[str] = None
    genre: Optional[str] = None
    explicit: Optional[bool] = False
    image: Optional[str] = None
    album: Optional[str] = None
    spotifyTrackId: Optional[str] = None
    spotifyUri: Optional[str] = None


class YoutubeToOggRequest(BaseModel):
    url: HttpUrl
    artist: ArtistInput
    track: TrackInput
    source: Optional[str] = None


def download_ogg(url: str) -> dict[str, Any]:
    logger.info("[download] starting download: %s", url)
    temp_dir = Path(tempfile.mkdtemp(prefix="yt_ogg_"))
    output_template = str(temp_dir / "%(id)s.%(ext)s")
    cmd_base: List[str] = [
        "yt-dlp",
        "--no-playlist",
        "--restrict-filenames",
        "-f",
        "bestaudio/best",
        "-o",
        output_template,
        "--extract-audio",
        "--audio-format",
        "vorbis",
        "--audio-quality",
        "192",
        "--print-json",
        "--no-progress",
    ]

    has_cookies = False
    cookie_path: Optional[Path] = None
    if YTDLP_COOKIES_PATH:
        cookie_path = Path(YTDLP_COOKIES_PATH)
        if cookie_path.exists():
            has_cookies = True
            cmd_base.extend(["--cookies", str(cookie_path)])
            logger.info("[download] using cookies file: %s", cookie_path)
        else:
            logger.warning("[download] YTDLP_COOKIES_PATH set but file missing: %s", cookie_path)

    attempts: List[tuple[str, List[str]]] = []
    if not has_cookies:
        # Android client avoids some restrictions but does not support cookies.
        attempts.append(("android-client", ["--extractor-args", "youtube:player_client=android"]))
    # Default web client (works with cookies); placed last as fallback.
    attempts.append(("default", []))

    try:
        last_logs: List[str] = []
        for attempt_name, extra_args in attempts:
            cmd = cmd_base + extra_args + [url]
            logger.info("[download] running yt-dlp attempt=%s", attempt_name)
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            stdout_lines = result.stdout.splitlines()
            stderr_lines = result.stderr.splitlines()
            last_logs = stdout_lines + stderr_lines

            if result.returncode != 0:
                logger.warning("[download] yt-dlp attempt failed rc=%s attempt=%s", result.returncode, attempt_name)
                continue

            info: Optional[dict[str, Any]] = None
            for line in reversed(stdout_lines):
                if not line.strip():
                    continue
                try:
                    parsed = json.loads(line)
                    if isinstance(parsed, dict):
                        info = parsed
                        break
                except json.JSONDecodeError:
                    continue

            if not info:
                logger.warning("[download] yt-dlp JSON output missing attempt=%s", attempt_name)
                continue

            ogg_path = temp_dir / f"{info.get('id')}.ogg"
            if not ogg_path.exists():
                ogg_files = list(temp_dir.glob("*.ogg"))
                if ogg_files:
                    ogg_path = ogg_files[0]
            if not ogg_path.exists():
                logger.warning("[download] expected OGG file not found attempt=%s", attempt_name)
                continue

            logger.info("[download] completed: %s", ogg_path)
            return {
                "video_id": info.get("id"),
                "title": info.get("title"),
                "output_path": str(ogg_path),
                "tmp_dir": str(temp_dir),
                "info": info,
                "logs": last_logs,
            }

        raise HTTPException(
            status_code=400,
            detail={
                "message": "Failed to download audio via yt-dlp CLI",
                "logs": last_logs,
            },
        )
    except HTTPException:
        enqueue_cleanup(temp_dir)
        raise
    except Exception as exc:
        enqueue_cleanup(temp_dir)
        logger.exception("[download] unexpected failure")
        raise HTTPException(
            status_code=500,
            detail={"message": f"Unexpected error while converting to OGG: {exc}"},
        ) from exc


def get_api_base() -> str:
    return os.getenv("EDEN_API_BASE", API_BASE_DEFAULT).rstrip("/")


T = TypeVar("T")


def with_retry(
    fn: Callable[[], T],
    retries: int = 3,
    backoff: float = 1.0,
    label: str = "request",
) -> T:
    """Execute fn with exponential backoff on transient network errors."""
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return fn()
        except httpx.RequestError as exc:
            last_exc = exc
            exc_type = type(exc).__name__
            exc_cause = type(exc.__cause__).__name__ if exc.__cause__ else "None"
            if attempt < retries:
                wait = backoff * (2 ** (attempt - 1))
                logger.warning(
                    "[%s] transient error (%s, cause=%s), retrying in %.1fs (attempt %d/%d): %s",
                    label, exc_type, exc_cause, wait, attempt, retries, exc,
                )
                time.sleep(wait)
            else:
                logger.error(
                    "[%s] failed after %d attempts (%s, cause=%s): %s",
                    label, retries, exc_type, exc_cause, exc,
                    exc_info=True,
                )
    raise HTTPException(
        status_code=502,
        detail={
            "message": f"Network error during {label}",
            "exception": type(last_exc).__name__ if last_exc else "Unknown",
            "cause": str(last_exc),
        },
    ) from last_exc


def find_or_create_artist(client: httpx.Client, artist: ArtistInput) -> str:
    logger.info("[artist] searching for artist: %s", artist.name)

    def do_search() -> httpx.Response:
        return client.get(f"{get_api_base()}/artists/search", params={"q": artist.name, "limit": 1})

    search_resp = with_retry(do_search, label="artist-search")
    if search_resp.status_code not in (200, 400):
        logger.error("[artist] search failed status=%s", search_resp.status_code)
        raise HTTPException(status_code=502, detail="Artist search failed")
    if search_resp.status_code == 200:
        data = search_resp.json()
        artists = data.get("artists") or []
        if artists:
            logger.info("[artist] found existing artist id=%s", artists[0]["id"])
            return artists[0]["id"]

    create_payload = {
        "name": artist.name,
        "bio": artist.bio,
        "avatarUrl": artist.avatarUrl,
    }
    logger.info("[artist] creating artist")

    def do_create() -> httpx.Response:
        return client.post(f"{get_api_base()}/artists", json=create_payload)

    create_resp = with_retry(do_create, label="artist-create")
    if create_resp.status_code != 201:
        logger.error("[artist] create failed status=%s body=%s", create_resp.status_code, create_resp.text)
        raise HTTPException(status_code=502, detail="Artist creation failed")
    return create_resp.json()["id"]


def initiate_upload(client: httpx.Client, artist_id: str, file_path: Path) -> dict[str, Any]:
    stat = file_path.stat()
    payload = {
        "artistId": artist_id,
        "filename": file_path.name,
        "fileSize": stat.st_size,
        "mimeType": "audio/ogg",
        "metadata": {},
    }
    logger.info("[upload] initiating upload for artist=%s file=%s size=%s", artist_id, file_path.name, stat.st_size)

    def do_initiate() -> httpx.Response:
        return client.post(f"{get_api_base()}/uploads/initiate", json=payload)

    resp = with_retry(do_initiate, label="upload-initiate")
    if resp.status_code != 200:
        logger.error("[upload] initiate failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to initiate upload")
    return resp.json()


def upload_file(signed_url: str, file_path: Path) -> None:
    logger.info("[upload] uploading to signed URL for file=%s", file_path.name)
    file_bytes = file_path.read_bytes()

    def do_upload() -> httpx.Response:
        return httpx.put(
            signed_url,
            content=file_bytes,
            headers={"Content-Type": "audio/ogg"},
            timeout=60,
        )

    resp = with_retry(do_upload, label="upload-file")
    if resp.status_code not in (200, 201):
        logger.error("[upload] put failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to upload file to storage")


def build_track_metadata(
    track: TrackInput,
    default_title: str,
    default_duration: Optional[float],
    album_id: Optional[str],
) -> dict[str, Any]:
    return {
        "title": track.title or default_title,
        "albumId": album_id,
        "artworkUrl": track.image,
        "duration": track.duration if track.duration is not None else (default_duration or 0),
        "isrc": track.isrc,
        "genre": track.genre or "Other",
        "explicit": bool(track.explicit) if track.explicit is not None else False,
    }


def complete_upload(client: httpx.Client, upload_id: str, track_metadata: dict[str, Any]) -> dict[str, Any]:
    payload = {"trackMetadata": track_metadata}
    logger.info("[upload] completing upload uploadId=%s title=%s", upload_id, track_metadata.get("title"))

    def do_complete() -> httpx.Response:
        return client.post(f"{get_api_base()}/uploads/{upload_id}/complete", json=payload)

    resp = with_retry(do_complete, label="upload-complete")
    if resp.status_code != 200:
        logger.error("[upload] complete failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to complete upload")
    return resp.json()


def update_upload_status(client: httpx.Client, upload_id: str) -> dict[str, Any]:
    def do_status() -> httpx.Response:
        return client.get(f"{get_api_base()}/uploads/{upload_id}/status")

    resp = with_retry(do_status, label="upload-status")
    if resp.status_code != 200:
        logger.error("[upload] status fetch failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to fetch upload status")
    return resp.json()


def find_or_create_album(client: httpx.Client, artist_id: str, album_name: str, artwork_url: Optional[str]) -> str:
    logger.info("[album] searching for album: %s", album_name)

    def do_list() -> httpx.Response:
        return client.get(
            f"{get_api_base()}/albums",
            params={"artistId": artist_id, "page": 1, "limit": 50},
        )

    list_resp = with_retry(do_list, label="album-list")
    if list_resp.status_code == 200:
        albums = list_resp.json().get("albums") or []
        for album in albums:
            if album.get("title", "").lower() == album_name.lower():
                logger.info("[album] found existing album id=%s", album.get("id"))
                return album["id"]

    payload = {"artistId": artist_id, "title": album_name, "artworkUrl": artwork_url}
    logger.info("[album] creating album: %s", album_name)

    def do_create() -> httpx.Response:
        return client.post(f"{get_api_base()}/albums", json=payload)

    create_resp = with_retry(do_create, label="album-create")
    if create_resp.status_code != 201:
        logger.error("[album] create failed status=%s body=%s", create_resp.status_code, create_resp.text)
        raise HTTPException(status_code=502, detail="Album creation failed")
    return create_resp.json()["id"]


@app.post("/youtube-to-ogg")
async def youtube_to_ogg(payload: YoutubeToOggRequest):
    dl_result = await run_in_threadpool(download_ogg, str(payload.url))

    def workflow() -> dict[str, Any]:
        try:
            # Use explicit transport settings to handle transient SSL issues
            transport = httpx.HTTPTransport(retries=1)
            with httpx.Client(timeout=60, transport=transport) as client:
                artist_id = find_or_create_artist(client, payload.artist)

                album_id: Optional[str] = None
                if payload.track.album:
                    album_id = find_or_create_album(
                        client,
                        artist_id,
                        payload.track.album,
                        payload.track.image,
                    )

                upload_init = initiate_upload(client, artist_id, Path(dl_result["output_path"]))
                upload_file(upload_init["signedUrl"], Path(dl_result["output_path"]))
                track_meta = build_track_metadata(
                    payload.track,
                    dl_result.get("title") or "Untitled",
                    dl_result.get("info", {}).get("duration"),
                    album_id,
                )
                completion = complete_upload(client, upload_init["uploadId"], track_meta)
                track_id = completion.get("trackId")
                upload_status = update_upload_status(client, upload_init["uploadId"])
                return {
                    "artistId": artist_id,
                    "upload": upload_init,
                    "completion": completion,
                    "uploadStatus": upload_status,
                    "download": dl_result,
                }
        finally:
            enqueue_cleanup(Path(dl_result["tmp_dir"]))

    return await run_in_threadpool(workflow)


@app.get("/")
async def root():
    return {"message": "yt-downloader worker ready"}


@app.get("/health")
async def health():
    """Health check with connectivity diagnostics."""
    import socket
    import ssl

    results: dict[str, Any] = {"status": "ok", "checks": {}}

    # DNS resolution test
    try:
        api_host = get_api_base().replace("https://", "").replace("http://", "").split("/")[0]
        ip = socket.gethostbyname(api_host)
        results["checks"]["dns"] = {"host": api_host, "ip": ip, "ok": True}
    except Exception as e:
        results["checks"]["dns"] = {"error": str(e), "ok": False}
        results["status"] = "degraded"

    # Outbound HTTPS connectivity test
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(f"{get_api_base()}/health", follow_redirects=True)
            results["checks"]["api"] = {
                "url": f"{get_api_base()}/health",
                "status_code": resp.status_code,
                "ok": resp.status_code < 500,
            }
    except httpx.RequestError as e:
        results["checks"]["api"] = {"error": str(e), "type": type(e).__name__, "ok": False}
        results["status"] = "degraded"

    # SSL info
    try:
        ctx = ssl.create_default_context()
        results["checks"]["ssl"] = {
            "default_verify_paths": str(ctx.cert_store_stats()),
            "openssl_version": ssl.OPENSSL_VERSION,
            "ok": True,
        }
    except Exception as e:
        results["checks"]["ssl"] = {"error": str(e), "ok": False}

    return results