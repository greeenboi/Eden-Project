"""Spotify metadata helper functions and lightweight dict schemas (no Pydantic)."""

from typing import TypedDict, Tuple, Optional, List, Dict, Any
import httpx
from fastapi import HTTPException

__all__ = [
    "SpotifyMetadataRequest",
    "SpotifyArtistMetadata",
    "SpotifyTrackMetadata",
    "SpotifyMetadataResponse",
    "get_spotify_token",
    "search_spotify_track",
    "get_spotify_artist",
    "search_spotify_api",
]


class SpotifyMetadataRequest(TypedDict):
    query: str


class SpotifyArtistMetadata(TypedDict, total=False):
    name: Optional[str]
    email: Optional[str]
    avatarUrl: Optional[str]
    bio: Optional[str]
    profile: Optional[str]
    genres: Optional[List[str]]
    spotifyUri: Optional[str]
    followers: Optional[int]
    popularity: Optional[int]
    image_url: Optional[str]


class SpotifyTrackMetadata(TypedDict, total=False):
    title: str
    duration: Optional[float]
    explicit: bool
    genre: Optional[str]
    isrc: Optional[str]
    image: Optional[str]
    album: Optional[str]
    spotifyTrackId: Optional[str]
    spotifyUri: Optional[str]
    album_image_url: Optional[str]
    artist_name: Optional[str]
    artist_id: Optional[str]
    duration_ms: Optional[int]
    popularity: Optional[int]


class SpotifyMetadataResponse(TypedDict):
    source: str
    track: SpotifyTrackMetadata
    artist: SpotifyArtistMetadata


async def get_spotify_token(client_id: str, client_secret: str) -> str:
    """Get Spotify access token using client credentials flow."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
        )
        if response.status_code == 200:
            return response.json()["access_token"]

        detail = f"Failed to get Spotify token (status {response.status_code}): {response.text}"
        raise HTTPException(status_code=500, detail=detail)


async def search_spotify_track(query: str, token: str) -> Dict[str, Any] | None:
    """Search Spotify for track information and return minimal metadata."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.spotify.com/v1/search",
                params={"q": query, "type": "track", "limit": 1},
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("tracks") and data["tracks"].get("items"):
                    track = data["tracks"]["items"][0]

                    # Extract track info
                    artist = track["artists"][0] if track.get("artists") else {}
                    album = track.get("album", {})
                    external_ids = track.get("external_ids", {})

                    images = album.get("images") or []
                    primary_image = images[0]["url"] if images else None

                    return {
                        "title": track.get("name"),
                        "artist_name": artist.get("name"),
                        "artist_id": artist.get("id"),
                        "album_name": album.get("name"),
                        "album_image_url": primary_image,
                        "duration_ms": track.get("duration_ms"),
                        "isrc": external_ids.get("isrc"),
                        "explicit": track.get("explicit", False),
                        "spotify_track_id": track.get("id"),
                        "spotify_uri": track.get("uri"),
                        "popularity": track.get("popularity"),
                    }

                # No items found
                return None

            # Surface Spotify API errors for easier debugging
            detail = f"Spotify search failed (status {response.status_code}): {response.text}"
            raise HTTPException(status_code=502, detail=detail)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - log side effect only
        print(f"[search_spotify_track] Failed: {e}")
        raise HTTPException(
            status_code=500, detail="Unexpected error during Spotify search"
        )


async def get_spotify_artist(artist_id: str, token: str) -> Dict[str, Any] | None:
    """Get detailed Spotify artist information."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://api.spotify.com/v1/artists/{artist_id}",
                headers={"Authorization": f"Bearer {token}"},
            )

            if response.status_code == 200:
                artist = response.json()
                return {
                    "name": artist.get("name"),
                    "genres": artist.get("genres", []),
                    "popularity": artist.get("popularity"),
                    "followers": artist.get("followers", {}).get("total"),
                    "image_url": artist["images"][0]["url"]
                    if artist.get("images")
                    else None,
                    "spotify_uri": artist.get("uri"),
                }

            detail = f"Spotify artist lookup failed (status {response.status_code}): {response.text}"
            raise HTTPException(status_code=502, detail=detail)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - log side effect only
        print(f"[get_spotify_artist] Failed: {e}")
        raise HTTPException(
            status_code=500, detail="Unexpected error during Spotify artist lookup"
        )


async def search_spotify_api(query: str, env) -> Tuple[Dict[str, Any] | None, Dict[str, Any] | None]:
    """
    Search Spotify and return track and artist metadata.

    Returns (track_data, artist_data) or (None, None) if not found.
    """
    client_id = env.SPOTIFY_CLIENT_ID
    client_secret = env.SPOTIFY_CLIENT_SECRET

    if not client_id or not client_secret:
        detail = "Missing Spotify credentials (SPOTIFY_CLIENT_ID/SECRET)"
        print(f"[search_spotify_api] {detail}")
        raise HTTPException(status_code=500, detail=detail)

    token = await get_spotify_token(client_id, client_secret)

    track_data = await search_spotify_track(query, token)
    if not track_data:
        return None, None

    artist_data = None
    if track_data.get("artist_id"):
        artist_data = await get_spotify_artist(track_data["artist_id"], token)

    return track_data, artist_data
