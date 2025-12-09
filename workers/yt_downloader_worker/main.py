import tempfile
from pathlib import Path
from typing import Any

import yt_dlp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from starlette.concurrency import run_in_threadpool

app = FastAPI()


class YoutubeToOggRequest(BaseModel):
    url: HttpUrl


def download_ogg(url: str) -> dict[str, Any]:
    temp_dir = Path(tempfile.mkdtemp(prefix="yt_ogg_"))
    output_template = str(temp_dir / "%(id)s.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "noplaylist": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "vorbis",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ogg_path = Path(ydl.prepare_filename(info)).with_suffix(".ogg")
            if not ogg_path.exists():
                raise HTTPException(status_code=500, detail="OGG file was not created")

            return {
                "video_id": info.get("id"),
                "title": info.get("title"),
                "output_path": str(ogg_path),
                "tmp_dir": str(temp_dir),
                "info": yt_dlp.utils.sanitize_info(info),
            }
    except yt_dlp.utils.DownloadError as exc:
        raise HTTPException(status_code=400, detail=f"Failed to download audio: {exc}") from exc
    except yt_dlp.utils.PostProcessingError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to convert to OGG: {exc}") from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unexpected error while converting to OGG") from exc


@app.post("/youtube-to-ogg")
async def youtube_to_ogg(payload: YoutubeToOggRequest):
    result = await run_in_threadpool(download_ogg, str(payload.url))
    # TODO: stream/upload the OGG file to storage and clean up temp files once persisted.
    return result


@app.get("/")
async def root():
    return {"message": "yt-downloader worker ready"}