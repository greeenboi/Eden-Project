import os
import tempfile , json
import asyncio , threading
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
import httpx  # for calling the “next module” later
import subprocess

app = FastAPI()

# ----------------- CONFIG -----------------
NEXT_MODULE_URL = "http://host.docker.internal:9000/ingest"

DATASTORE_ROOT = "/datastore"
os.makedirs(DATASTORE_ROOT, exist_ok=True)
print(f"Using datastore root: {DATASTORE_ROOT}")
# ----------------- MODELS -----------------

class SubmitRequest(BaseModel):
    url: str

class Job(BaseModel):
    url: str
    metadata: Dict[str, Any] | None = None
    ogg_path: str | None = None

# ----------------- GLOBAL QUEUE -----------------

job_queue: asyncio.Queue[Job] = asyncio.Queue()

# ----------------- CORE HELPERS -----------------


def extract_metadata(url: str) -> Dict[str, Any]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return info

def download_audio_to_ogg(url: str) -> str:
    job_dir = tempfile.mkdtemp(prefix="job_", dir=DATASTORE_ROOT)
    out_tmpl = os.path.join(job_dir, "%(id)s.%(ext)s")

    # 1) Download best audio as-is (webm, m4a, etc.)
    ydl_opts = {
        "outtmpl": out_tmpl,
        "format": "bestaudio",   # same as -f bestaudio
        "quiet": False,
        "no_warnings": False,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "5",   # 0–9, libmp3lame VBR scale
            }
        ],
    }

    print(f"[download_audio_to_ogg] job_dir={job_dir}")
    print(f"[download_audio_to_ogg] out_tmpl={out_tmpl}")

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

    video_id = info.get("id")
    mp3_path = os.path.join(job_dir, f"{video_id}.mp3")
    print(f"[download_audio_to_ogg] downloaded audio at {mp3_path}")

    if not os.path.exists(mp3_path):
        raise RuntimeError(f"Downloaded file not found: {mp3_path}")

    # 2) Convert to OGG with ffmpeg
    ogg_path = os.path.join(job_dir, f"{video_id}.ogg")
    print(f"[download_audio_to_ogg] converting {mp3_path} -> {ogg_path}")

    # ffmpeg -y -i src_path -vn -acodec libvorbis ogg_path
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", mp3_path, "-vn", "-acodec", "libvorbis", ogg_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        print("[ffmpeg stdout]", result.stdout)
        print("[ffmpeg stderr]", result.stderr)
        raise RuntimeError("ffmpeg conversion to ogg failed")

    if not os.path.exists(ogg_path):
        raise RuntimeError(f"OGG file not created: {ogg_path}")

    print(f"[download_audio_to_ogg] OGG exists, returning {ogg_path}")
    return ogg_path



async def send_to_next_module(job: Job) -> None:
    """
    Stub: send OGG + metadata to the next service.
    For now we just print; later you can use httpx to POST.
    """
    print("Sending to next module:")
    print(f"  url: {job.url}")
    print(f"  ogg_path: {job.ogg_path}")
    print(f"  title: {job.metadata.get('title') if job.metadata else None}")
    
    async with httpx.AsyncClient() as client:
        with open(job.ogg_path, "rb") as f:
            files = {"file": ("audio.ogg", f, "audio/ogg")}
            data = {
                "url": job.url,
                "metadata": json.dumps(job.metadata or {}),
            }
            resp = await client.post(NEXT_MODULE_URL, data=data, files=files)
            resp.raise_for_status()
            print(f"[send_to_next_module] status={resp.status_code}")
            if resp.status_code != 200:
                print("[send_to_next_module] body:", resp.text)


# ----------------- ENDPOINTS -----------------

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/submit")
async def submit(req: SubmitRequest):
    """
    Producer endpoint:
      1) Extract metadata (fast).
      2) Create Job with URL + metadata.
      3) Enqueue job for background consumer.
      4) Return metadata immediately.
    """
    try:
        metadata = extract_metadata(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    print(f"[submit] processing job for url={req.url}")
    ogg_path = download_audio_to_ogg(req.url)
    job = Job(url=req.url, metadata=metadata, ogg_path=ogg_path)
    await send_to_next_module(job)
    return {
        "status": "done",
        "url": req.url,
        "title": metadata.get("title"),
        "uploader": metadata.get("uploader"),
        "duration": metadata.get("duration"),
        "ogg_path": ogg_path,
    }

@app.get("/queue-size")
async def queue_size():
    return {"queue_size": job_queue.qsize()}

# Optional: for local testing, serve a finished ogg if you know its path
@app.get("/debug-file")
async def debug_file(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="audio/ogg", filename=os.path.basename(path))
