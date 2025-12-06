import os
import tempfile
import uuid
from pathlib import Path

import httpx
import jinja2
import yt_dlp
from fastapi import FastAPI, HTTPException, Request, Body
from pydantic import BaseModel
from workers import WorkerEntrypoint

environment = jinja2.Environment()
template = environment.from_string("Hello, {{ name }}!")

app = FastAPI()

# Configuration
EDEN_API_BASE = "https://eden-server.suvan-gowrishanker-204.workers.dev"

ydl_opts = {
    'format': 'bestaudio/best',
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'vorbis',
    }],
    'outtmpl': '%(id)s.%(ext)s',
}

class UploadResponse(BaseModel):
    success: bool
    message: str
    trackId: str | None = None
    uploadId: str | None = None

class UploadRequest(BaseModel):
    title: str

async def get_spotify_token(client_id: str, client_secret: str) -> str:
    """
    Get Spotify access token using client credentials flow
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret)
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        raise HTTPException(status_code=500, detail="Failed to get Spotify token")

async def search_spotify_track(query: str, token: str) -> dict | None:
    """
    Search Spotify for track information
    Returns track metadata or None if not found
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.spotify.com/v1/search",
                params={"q": query, "type": "track", "limit": 1},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("tracks") and data["tracks"].get("items"):
                    track = data["tracks"]["items"][0]
                    
                    # Extract track info
                    artist = track["artists"][0] if track.get("artists") else {}
                    album = track.get("album", {})
                    external_ids = track.get("external_ids", {})
                    
                    return {
                        "title": track.get("name"),
                        "artist_name": artist.get("name"),
                        "artist_id": artist.get("id"),
                        "album_name": album.get("name"),
                        "duration_ms": track.get("duration_ms"),
                        "isrc": external_ids.get("isrc"),
                        "explicit": track.get("explicit", False),
                        "spotify_track_id": track.get("id"),
                        "spotify_uri": track.get("uri"),
                        "popularity": track.get("popularity"),
                    }
    except Exception as e:
        print(f"[search_spotify_track] Failed: {e}")
    
    return None

async def get_spotify_artist(artist_id: str, token: str) -> dict | None:
    """
    Get detailed Spotify artist information
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://api.spotify.com/v1/artists/{artist_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 200:
                artist = response.json()
                return {
                    "name": artist.get("name"),
                    "genres": artist.get("genres", []),
                    "popularity": artist.get("popularity"),
                    "followers": artist.get("followers", {}).get("total"),
                    "image_url": artist["images"][0]["url"] if artist.get("images") else None,
                    "spotify_uri": artist.get("uri"),
                }
    except Exception as e:
        print(f"[get_spotify_artist] Failed: {e}")
    
    return None

async def search_spotify_api(query: str) -> tuple[dict | None, dict | None]:
    """
    Search Spotify and return track and artist metadata
    Returns (track_data, artist_data) or (None, None) if not found
    """
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("[search_spotify_api] Missing Spotify credentials")
        return None, None
    
    try:
        # Get access token
        token = await get_spotify_token(client_id, client_secret)
        
        # Search for track
        track_data = await search_spotify_track(query, token)
        if not track_data:
            return None, None
        
        # Get artist details
        artist_data = None
        if track_data.get("artist_id"):
            artist_data = await get_spotify_artist(track_data["artist_id"], token)
        
        return track_data, artist_data
        
    except Exception as e:
        print(f"[search_spotify_api] Error: {e}")
        return None, None

def extract_artist_from_title(title: str) -> tuple[str, str]:
    """
    Extract artist and song name from YouTube title
    Common patterns: "Artist - Song", "Song by Artist", "Artist: Song"
    """
    # Try different separators
    for separator in [' - ', ' – ', ' | ', ': ']:
        if separator in title:
            parts = title.split(separator, 1)
            if len(parts) == 2:
                # Assume first part is artist for ' - ' pattern
                if separator in [' - ', ' – ', ': ']:
                    return parts[0].strip(), parts[1].strip()
    
    # Try "by" pattern: "Song Name by Artist"
    if ' by ' in title.lower():
        parts = title.lower().split(' by ', 1)
        if len(parts) == 2:
            return parts[1].strip().title(), parts[0].strip().title()
    
    # Default: use full title as song name, unknown artist
    return "Unknown Artist", title.strip()

async def get_or_create_artist(client: httpx.AsyncClient, artist_name: str, artist_metadata: dict = None) -> str:
    """
    Check if artist exists, if not create them
    Returns artist ID
    """
    try:
        # Search for existing artist
        print(f"[get_or_create_artist] Searching for artist: {artist_name}")
        search_response = await client.get(
            f"{EDEN_API_BASE}/api/artists",
            params={"search": artist_name, "limit": 1}
        )
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            if search_data.get("data") and len(search_data["data"]) > 0:
                artist = search_data["data"][0]
                # Check if name matches exactly (case-insensitive)
                if artist["name"].lower() == artist_name.lower():
                    artist_id = artist["id"]
                    print(f"[get_or_create_artist] Found existing artist: {artist_id}")
                    return artist_id
        
        # Artist doesn't exist, create new one
        print(f"[get_or_create_artist] Creating new artist: {artist_name}")
        create_response = await client.post(
            f"{EDEN_API_BASE}/api/artists",
            json={
                "name": artist_name,
                "bio": artist_metadata.get("bio", f"Auto-imported artist: {artist_name}") if artist_metadata else f"Auto-imported artist: {artist_name}",
                "country": artist_metadata.get("country") if artist_metadata else None,
                "imageUrl": artist_metadata.get("imageUrl") if artist_metadata else None,
            }
        )
        
        if create_response.status_code in [200, 201]:
            artist_data = create_response.json()
            artist_id = artist_data.get("id")
            print(f"[get_or_create_artist] Created new artist: {artist_id}")
            return artist_id
        else:
            print(f"[get_or_create_artist] Failed to create artist: {create_response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create artist: {create_response.text}"
            )
            
    except Exception as e:
        print(f"[get_or_create_artist] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Artist lookup/creation failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "YouTube Extension Worker - Use /upload/youtube/{url} to upload videos"}


@app.get("/upload/youtube/{url:path}")
async def upload_youtube(url: str, request: UploadRequest = Body(...)) -> UploadResponse:
    """
    Download YouTube video audio and upload to Eden API
    Uses Shazam to find track and artist metadata
    """
    temp_dir = None
    try:
        # Create temporary directory and initialize client
        temp_dir = tempfile.mkdtemp(prefix="youtube_")
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Download video metadata first
            print(f"[upload_youtube] Extracting YouTube metadata for: {url}")
            with yt_dlp.YoutubeDL({'quiet': True, 'skip_download': True}) as ydl:
                info = ydl.extract_info(url, download=False)
            
            duration = info.get('duration', 0)
            uploader = info.get('uploader', 'Unknown')
            video_id = info.get('id', 'unknown')
            youtube_title = info.get('title', request.title)
            
            # Try to search Spotify API
            print(f"[upload_youtube] Searching Spotify for: {request.title}")
            spotify_track, spotify_artist = await search_spotify_api(request.title)
            
            if spotify_track and spotify_track.get("title"):
                # Use Spotify metadata
                title = spotify_track["title"]
                artist_name = spotify_track["artist_name"] or "Unknown Artist"
                genre = spotify_artist["genres"][0] if spotify_artist and spotify_artist.get("genres") else "Unknown"
                isrc = spotify_track.get("isrc")
                explicit = spotify_track.get("explicit", False)
                
                # Use Spotify duration if YouTube duration is missing
                if not duration and spotify_track.get("duration_ms"):
                    duration = spotify_track["duration_ms"] // 1000
                
                print(f"[upload_youtube] Spotify metadata - Title: {title}, Artist: {artist_name}, Genre: {genre}")
            else:
                # Fallback: extract from title
                artist_name, title = extract_artist_from_title(request.title)
                genre = "Unknown"
                isrc = None
                explicit = False
                print(f"[upload_youtube] Extracted from title - Title: {title}, Artist: {artist_name}")
            
            # Get or create artist with Spotify metadata
            artist_metadata = {}
            if spotify_artist:
                artist_metadata = {
                    "bio": f"{artist_name} - {spotify_artist.get('followers', 0)} Spotify followers",
                    "genres": spotify_artist.get("genres", []),
                    "imageUrl": spotify_artist.get("image_url"),
                    "spotifyUri": spotify_artist.get("spotify_uri"),
                }
            
            artist_id = await get_or_create_artist(client, artist_name, artist_metadata)
            print(f"[upload_youtube] Using artist ID: {artist_id}")
        
        print(f"[upload_youtube] YouTube - Duration: {duration}s, Uploader: {uploader}")
        
        # Download audio
        print(f"[upload_youtube] Downloading audio...")
        download_opts = {**ydl_opts, 'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s')}
        
        with yt_dlp.YoutubeDL(download_opts) as ydl:
            error_code = ydl.download([url])
            if error_code != 0:
                raise HTTPException(status_code=500, detail="Failed to download video")
        
        # Find the downloaded file
        audio_files = list(Path(temp_dir).glob(f"{video_id}.*"))
        if not audio_files:
            raise HTTPException(status_code=500, detail="Downloaded file not found")
        
        audio_path = audio_files[0]
        file_size = audio_path.stat().st_size
        mime_type = "audio/ogg"
        
        print(f"[upload_youtube] Downloaded: {audio_path.name}, Size: {file_size} bytes")
        
        # Step 1: Initiate upload
        print(f"[upload_youtube] Initiating upload to Eden API...")
        init_response = await client.post(
            f"{EDEN_API_BASE}/api/uploads/initiate",
            json={
                "artistId": artist_id,
                "filename": f"{video_id}.ogg",
                "fileSize": file_size,
                "mimeType": mime_type,
                "metadata": {
                    "source": "youtube",
                    "originalUrl": url,
                    "uploader": uploader,
                    "artistName": artist_name,
                    "youtubeTitle": youtube_title,
                    "spotifyTrackId": spotify_track.get("spotify_track_id") if spotify_track else None,
                    "spotifyUri": spotify_track.get("spotify_uri") if spotify_track else None,
                }
            }
        )
        
        if init_response.status_code != 200:
            raise HTTPException(
                status_code=init_response.status_code,
                detail=f"Failed to initiate upload: {init_response.text}"
            )
        
        upload_data = init_response.json()
        upload_id = upload_data["uploadId"]
        signed_url = upload_data["signedUrl"]
        
        print(f"[upload_youtube] Upload initiated: {upload_id}")
        
        # Step 2: Upload file to R2
        print(f"[upload_youtube] Uploading to R2...")
        with open(audio_path, 'rb') as f:
            upload_response = await client.put(
                signed_url,
                content=f.read(),
                headers={"Content-Type": mime_type}
            )
        
        if upload_response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to R2: {upload_response.text}"
            )
        
        print(f"[upload_youtube] File uploaded to R2")
        
        # Step 3: Complete upload
        print(f"[upload_youtube] Completing upload...")
        complete_response = await client.post(
            f"{EDEN_API_BASE}/api/uploads/{upload_id}/complete",
            json={
                "trackMetadata": {
                    "title": title,
                    "albumId": None,
                    "duration": int(duration),
                    "isrc": isrc,
                    "genre": genre,
                    "explicit": explicit
                }
            }
        )
        
        if complete_response.status_code != 200:
            raise HTTPException(
                status_code=complete_response.status_code,
                detail=f"Failed to complete upload: {complete_response.text}"
            )
        
        complete_data = complete_response.json()
        track_id = complete_data.get("trackId")
        
        print(f"[upload_youtube] Upload completed! Track ID: {track_id}")
        
        return UploadResponse(
            success=True,
            message=f"Successfully uploaded '{title}' by {artist_name} to Eden",
            trackId=track_id,
            uploadId=upload_id
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[upload_youtube] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temporary files
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            try:
                shutil.rmtree(temp_dir)
                print(f"[upload_youtube] Cleaned up temp directory")
            except Exception as e:
                print(f"[upload_youtube] Failed to cleanup: {e}")


@app.get("/hi/{name}")
async def say_hi(name: str):
    message = template.render(name=name)
    return {"message": message}


@app.get("/env")
async def env(req: Request):
    env = req.scope["env"]
    message = f"Here is an example of getting an environment variable: {env.MESSAGE}"
    return {"message": message}


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        return await asgi.fetch(app, request.js_object, self.env)
