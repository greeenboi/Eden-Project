import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any, List, Optional

import httpx
import yt_dlp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yt_downloader_worker")


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


class InMemoryLogger:
    def __init__(self) -> None:
        self.lines: List[str] = []

    def debug(self, msg: str) -> None:
        self.lines.append(str(msg))

    def warning(self, msg: str) -> None:  # yt-dlp uses warning
        self.lines.append(str(msg))

    def error(self, msg: str) -> None:
        self.lines.append(str(msg))


def download_ogg(url: str) -> dict[str, Any]:
    logger.info("[download] starting download: %s", url)
    temp_dir = Path(tempfile.mkdtemp(prefix="yt_ogg_"))
    output_template = str(temp_dir / "%(title, id)s.%(ext)s")
    log_buffer = InMemoryLogger()
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "restrictfilenames": True,
        "noplaylist": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "vorbis",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "logger": log_buffer,
        # Prefer android client to avoid SABR-gated web clients; nodejs runtime available in container.
        "extractor_args": {"youtube": {"player_client": ["android"]}},
    }

    if YTDLP_COOKIES_PATH:
        cookie_path = Path(YTDLP_COOKIES_PATH)
        if cookie_path.exists():
            ydl_opts["cookiefile"] = str(cookie_path)
            logger.info("[download] using cookies file: %s", cookie_path)
        else:
            logger.warning("[download] YTDLP_COOKIES_PATH set but file missing: %s", cookie_path)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ogg_path = Path(ydl.prepare_filename(info)).with_suffix(".ogg")
            if not ogg_path.exists():
                raise HTTPException(status_code=500, detail="OGG file was not created")

            sanitized = ydl.sanitize_info(info)
            logger.info("[download] completed: %s", ogg_path)
            return {
                "video_id": info.get("id"),
                "title": info.get("title"),
                "output_path": str(ogg_path),
                "tmp_dir": str(temp_dir),
                "info": sanitized,
            }
    except yt_dlp.utils.DownloadError as exc:
        logger.error("[download] failed during download: %s", exc)
        raise HTTPException(
            status_code=400,
            detail={"message": f"Failed to download audio: {exc}", "logs": log_buffer.lines},
        ) from exc
    except yt_dlp.utils.PostProcessingError as exc:
        logger.error("[download] failed during post-processing: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"message": f"Failed to convert to OGG: {exc}", "logs": log_buffer.lines},
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("[download] unexpected failure")
        raise HTTPException(
            status_code=500,
            detail={"message": f"Unexpected error while converting to OGG: {exc}", "logs": log_buffer.lines},
        ) from exc


def get_api_base() -> str:
    return os.getenv("EDEN_API_BASE", API_BASE_DEFAULT).rstrip("/")


def find_or_create_artist(client: httpx.Client, artist: ArtistInput) -> str:
    logger.info("[artist] searching for artist: %s", artist.name)
    search_resp = client.get(f"{get_api_base()}/artists/search", params={"q": artist.name, "limit": 1})
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
    create_resp = client.post(f"{get_api_base()}/artists", json=create_payload)
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
    resp = client.post(f"{get_api_base()}/uploads/initiate", json=payload)
    if resp.status_code != 200:
        logger.error("[upload] initiate failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to initiate upload")
    return resp.json()


def upload_file(signed_url: str, file_path: Path) -> None:
    logger.info("[upload] uploading to signed URL for file=%s", file_path.name)
    with file_path.open("rb") as f:
        resp = httpx.put(signed_url, content=f.read(), headers={"Content-Type": "audio/ogg"})
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
    resp = client.post(f"{get_api_base()}/uploads/{upload_id}/complete", json=payload)
    if resp.status_code != 200:
        logger.error("[upload] complete failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to complete upload")
    return resp.json()


def update_upload_status(client: httpx.Client, upload_id: str) -> dict[str, Any]:
    resp = client.get(f"{get_api_base()}/uploads/{upload_id}/status")
    if resp.status_code != 200:
        logger.error("[upload] status fetch failed status=%s body=%s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail="Failed to fetch upload status")
    return resp.json()


def find_or_create_album(client: httpx.Client, artist_id: str, album_name: str, artwork_url: Optional[str]) -> str:
    logger.info("[album] searching for album: %s", album_name)
    list_resp = client.get(
        f"{get_api_base()}/albums",
        params={"artistId": artist_id, "page": 1, "limit": 50},
    )
    if list_resp.status_code == 200:
        albums = list_resp.json().get("albums") or []
        for album in albums:
            if album.get("title", "").lower() == album_name.lower():
                logger.info("[album] found existing album id=%s", album.get("id"))
                return album["id"]

    payload = {"artistId": artist_id, "title": album_name, "artworkUrl": artwork_url}
    logger.info("[album] creating album: %s", album_name)
    create_resp = client.post(f"{get_api_base()}/albums", json=payload)
    if create_resp.status_code != 201:
        logger.error("[album] create failed status=%s body=%s", create_resp.status_code, create_resp.text)
        raise HTTPException(status_code=502, detail="Album creation failed")
    return create_resp.json()["id"]


@app.post("/youtube-to-ogg")
async def youtube_to_ogg(payload: YoutubeToOggRequest):
    dl_result = await run_in_threadpool(download_ogg, str(payload.url))

    def workflow() -> dict[str, Any]:
        with httpx.Client(timeout=30) as client:
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

    return await run_in_threadpool(workflow)


@app.get("/")
async def root():
    return {"message": "yt-downloader worker ready"}