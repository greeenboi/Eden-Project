import httpx
from fastapi import FastAPI, HTTPException, Request
from functions.spotify_metadata import (
    SpotifyArtistMetadata,
    SpotifyMetadataRequest,
    SpotifyMetadataResponse,
    SpotifyTrackMetadata,
    search_spotify_api,
)
from workers import WorkerEntrypoint


app = FastAPI()


@app.get("/")
async def root():
    return {
        "message": "YouTube Extension Worker - Use /upload/youtube/{url} to upload videos"
    }


@app.post("/metadata/spotify")
async def spotify_metadata(req: Request, payload: dict):
    env = req.scope["env"]
    # Basic validation without Pydantic
    if not isinstance(payload, dict) or not payload.get("query"):
        raise HTTPException(status_code=400, detail="Field 'query' is required")

    track_data, artist_data = await search_spotify_api(payload.get("query"), env)

    if not track_data:
        raise HTTPException(status_code=404, detail="Track not found on Spotify")

    artist_name = (
        (artist_data or {}).get("name")
        or track_data.get("artist_name")
        or "Unknown Artist"
    )
    genres = (artist_data or {}).get("genres") or []
    track_image = track_data.get("album_image_url") or (artist_data or {}).get(
        "image_url"
    )

    duration_seconds = None
    if track_data.get("duration_ms") is not None:
        duration_seconds = track_data["duration_ms"] / 1000.0

    artist_bio = None
    if artist_data and artist_data.get("followers") is not None:
        artist_bio = f"{artist_name} has {artist_data['followers']} Spotify followers"

    return {
        "source": "spotify",
        "track": {
            "title": track_data.get("title") or payload.get("query"),
            "duration": duration_seconds,
            "explicit": bool(track_data.get("explicit", False)),
            "genre": genres[0] if genres else None,
            "isrc": track_data.get("isrc"),
            "image": track_image,
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


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        return await asgi.fetch(app, request.js_object, self.env)
