from fastapi import FastAPI, HTTPException, Request
from functions.spotify_metadata import search_spotify_api
from functions.soundcloud_metadata import search_soundcloud_api
from workers import WorkerEntrypoint


app = FastAPI()


DEFAULT_LIMIT = 5
MAX_LIMIT = 10


@app.get("/")
async def root():
    return {
        "message": "YouTube Extension Worker - Use /metadata to get metadata from Spotify and SoundCloud"
    }


def _build_spotify_response(track_data, artist_data, query: str) -> dict:
    """Build a standardized response object from Spotify data."""
    artist_name = (
        (artist_data or {}).get("name")
        or track_data.get("artist_name")
        or "Unknown Artist"
    )
    genres = (artist_data or {}).get("genres") or []
    track_image = track_data.get("album_image_url") or (artist_data or {}).get("image_url")

    duration_seconds = None
    if track_data.get("duration_ms") is not None:
        duration_seconds = track_data["duration_ms"] / 1000.0

    artist_bio = None
    if artist_data and artist_data.get("followers") is not None:
        artist_bio = f"{artist_name} has {artist_data['followers']} Spotify followers"

    return {
        "source": "spotify",
        "track": {
            "title": track_data.get("title") or query,
            "duration": duration_seconds,
            "explicit": bool(track_data.get("explicit", False)),
            "genre": genres[0] if genres else None,
            "isrc": track_data.get("isrc"),
            "image": track_image,
            "albumImageUrl": track_image,
            "album": track_data.get("album_name"),
            "spotifyTrackId": track_data.get("spotify_track_id"),
            "spotifyUri": track_data.get("spotify_uri"),
        },
        "artist": {
            "name": artist_name,
            "email": None,
            "avatarUrl": (artist_data or {}).get("image_url"),
            "bio": artist_bio,
            "profile": None,
            "genres": genres,
            "spotifyUri": (artist_data or {}).get("spotify_uri"),
            "followers": (artist_data or {}).get("followers"),
            "popularity": (artist_data or {}).get("popularity"),
        },
    }


def _build_soundcloud_response(track_data, artist_data, query: str) -> dict:
    """Build a standardized response object from SoundCloud data."""
    artist_name = (
        (artist_data or {}).get("name")
        or track_data.get("artist_name")
        or "Unknown Artist"
    )
    track_image = track_data.get("image") or (artist_data or {}).get("avatar_url")

    duration_seconds = None
    if track_data.get("duration_ms") is not None:
        duration_seconds = track_data["duration_ms"] / 1000.0

    artist_bio = None
    if artist_data and artist_data.get("bio"):
        artist_bio = artist_data["bio"]
    elif artist_data and artist_data.get("followers") is not None:
        artist_bio = f"{artist_name} has {artist_data['followers']} SoundCloud followers"

    return {
        "source": "soundcloud",
        "track": {
            "title": track_data.get("title") or query,
            "duration": duration_seconds,
            "explicit": False,  # SoundCloud doesn't have explicit flag
            "genre": track_data.get("genre"),
            "isrc": None,  # SoundCloud doesn't provide ISRC
            "image": track_image,
            "albumImageUrl": track_image,
            "album": None,  # SoundCloud doesn't have albums
            "soundcloudId": track_data.get("soundcloud_id"),
            "soundcloudUrl": track_data.get("soundcloud_url"),
            "playbackCount": track_data.get("playback_count"),
            "likesCount": track_data.get("likes_count"),
        },
        "artist": {
            "name": artist_name,
            "email": None,
            "avatarUrl": (artist_data or {}).get("avatar_url"),
            "bio": artist_bio,
            "profile": (artist_data or {}).get("profile"),
            "genres": [],
            "soundcloudUrl": (artist_data or {}).get("soundcloud_url"),
            "followers": (artist_data or {}).get("followers"),
            "city": (artist_data or {}).get("city"),
            "country": (artist_data or {}).get("country"),
        },
    }


@app.post("/metadata")
async def metadata(req: Request, payload: dict):
    """
    Search for track metadata from Spotify and SoundCloud.
    
    Request body:
        - query (str, required): Search query (e.g., track title)
        - limit (int, optional): Number of results per source (default: 5, max: 10)
    
    Returns:
        - spotify: List of Spotify results
        - soundcloud: List of SoundCloud results
    """
    env = req.scope["env"]
    
    # Validate request
    if not isinstance(payload, dict) or not payload.get("query"):
        raise HTTPException(status_code=400, detail="Field 'query' is required")

    query = payload.get("query")
    limit = min(int(payload.get("limit", DEFAULT_LIMIT)), MAX_LIMIT)

    # Fetch from both sources concurrently
    import asyncio
    
    spotify_task = search_spotify_api(query, env, limit=limit)
    soundcloud_task = search_soundcloud_api(query, env, limit=limit)
    
    spotify_results, soundcloud_results = await asyncio.gather(
        spotify_task,
        soundcloud_task,
        return_exceptions=True
    )

    # Build Spotify response
    spotify_enriched = []
    if isinstance(spotify_results, list):
        for track_data, artist_data in spotify_results:
            spotify_enriched.append(_build_spotify_response(track_data, artist_data, query))

    # Build SoundCloud response
    soundcloud_enriched = []
    if isinstance(soundcloud_results, list):
        for track_data, artist_data in soundcloud_results:
            soundcloud_enriched.append(_build_soundcloud_response(track_data, artist_data, query))

    # Return combined results
    if not spotify_enriched and not soundcloud_enriched:
        raise HTTPException(status_code=404, detail="No tracks found on Spotify or SoundCloud")

    return {
        "spotify": spotify_enriched,
        "soundcloud": soundcloud_enriched,
    }


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        return await asgi.fetch(app, request.js_object, self.env)
