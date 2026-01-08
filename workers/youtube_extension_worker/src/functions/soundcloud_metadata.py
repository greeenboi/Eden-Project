"""SoundCloud metadata helper functions and lightweight dict schemas (no Pydantic)."""

import warnings
from typing import TypedDict, Tuple, Optional, List, Dict, Any
import httpx
from fastapi import HTTPException

__all__ = [
    "SoundCloudMetadataRequest",
    "SoundCloudArtistMetadata",
    "SoundCloudTrackMetadata",
    "SoundCloudMetadataResponse",
    "search_soundcloud_tracks",
    "get_soundcloud_user",
    "search_soundcloud_api",
]


class SoundCloudMetadataRequest(TypedDict):
    query: str


class SoundCloudArtistMetadata(TypedDict, total=False):
    name: Optional[str]
    avatarUrl: Optional[str]
    bio: Optional[str]
    profile: Optional[str]
    soundcloudUrl: Optional[str]
    followers: Optional[int]
    city: Optional[str]
    country: Optional[str]


class SoundCloudTrackMetadata(TypedDict, total=False):
    title: str
    duration: Optional[float]
    genre: Optional[str]
    image: Optional[str]
    soundcloudUrl: Optional[str]
    soundcloudId: Optional[str]
    playbackCount: Optional[int]
    likesCount: Optional[int]
    artist_name: Optional[str]
    artist_id: Optional[int]
    duration_ms: Optional[int]
    created_at: Optional[str]


class SoundCloudMetadataResponse(TypedDict):
    source: str
    track: SoundCloudTrackMetadata
    artist: SoundCloudArtistMetadata


async def get_soundcloud_client_id(env) -> str | None:
    """Get SoundCloud client ID from environment. Returns None if not configured."""
    client_id = getattr(env, 'SOUNDCLOUD_CLIENT_ID', None)
    if not client_id:
        warnings.warn(
            "SOUNDCLOUD_CLIENT_ID not configured - SoundCloud metadata will be unavailable",
            UserWarning,
            stacklevel=2
        )
        return None
    return client_id


async def search_soundcloud_tracks(query: str, client_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search SoundCloud for tracks and return minimal metadata list."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api-v2.soundcloud.com/search/tracks",
                params={
                    "q": query,
                    "client_id": client_id,
                    "limit": limit,
                    "offset": 0,
                },
            )

            if response.status_code == 200:
                data = response.json()
                items = data.get("collection", []) or []
                results: List[Dict[str, Any]] = []

                for track in items:
                    user = track.get("user", {}) or {}
                    artwork_url = track.get("artwork_url")
                    
                    # SoundCloud artwork URLs often come as small versions, upgrade to larger
                    if artwork_url:
                        artwork_url = artwork_url.replace("-large", "-t500x500")

                    results.append(
                        {
                            "title": track.get("title"),
                            "artist_name": user.get("username"),
                            "artist_id": user.get("id"),
                            "genre": track.get("genre"),
                            "image": artwork_url,
                            "duration_ms": track.get("duration"),
                            "soundcloud_id": str(track.get("id")),
                            "soundcloud_url": track.get("permalink_url"),
                            "playback_count": track.get("playback_count"),
                            "likes_count": track.get("likes_count"),
                            "created_at": track.get("created_at"),
                        }
                    )

                return results

            # Surface SoundCloud API errors for easier debugging
            detail = f"SoundCloud search failed (status {response.status_code}): {response.text}"
            raise HTTPException(status_code=502, detail=detail)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - log side effect only
        print(f"[search_soundcloud_tracks] Failed: {e}")
        raise HTTPException(
            status_code=500, detail="Unexpected error during SoundCloud search"
        )


async def get_soundcloud_user(user_id: int, client_id: str) -> Dict[str, Any] | None:
    """Get detailed SoundCloud user information."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://api-v2.soundcloud.com/users/{user_id}",
                params={"client_id": client_id},
            )

            if response.status_code == 200:
                user = response.json()
                avatar_url = user.get("avatar_url")
                
                # Upgrade avatar URL to larger version
                if avatar_url:
                    avatar_url = avatar_url.replace("-large", "-t500x500")

                return {
                    "name": user.get("username"),
                    "bio": user.get("description"),
                    "avatar_url": avatar_url,
                    "profile": user.get("permalink_url"),
                    "followers": user.get("followers_count"),
                    "city": user.get("city"),
                    "country": user.get("country_code"),
                    "soundcloud_url": user.get("permalink_url"),
                }

            detail = f"SoundCloud user lookup failed (status {response.status_code}): {response.text}"
            raise HTTPException(status_code=502, detail=detail)
    except HTTPException:
        raise
    except Exception as e:  # pragma: no cover - log side effect only
        print(f"[get_soundcloud_user] Failed: {e}")
        raise HTTPException(
            status_code=500, detail="Unexpected error during SoundCloud user lookup"
        )


async def search_soundcloud_api(query: str, env, *, limit: int = 5) -> List[Tuple[Dict[str, Any], Dict[str, Any] | None]]:
    """
    Search SoundCloud and return up to `limit` track + artist metadata pairs.

    Returns list of tuples: (track_data, artist_data). Empty list if none found.
    """
    client_id = getattr(env, 'SOUNDCLOUD_CLIENT_ID', None)

    if not client_id:
        warnings.warn(
            "Missing SoundCloud credentials (SOUNDCLOUD_CLIENT_ID) - skipping SoundCloud search",
            UserWarning,
            stacklevel=2
        )
        return []

    try:
        tracks = await search_soundcloud_tracks(query, client_id, limit)
        if not tracks:
            return []

        results: List[Tuple[Dict[str, Any], Dict[str, Any] | None]] = []
        for track_data in tracks:
            artist_data = None
            if track_data.get("artist_id"):
                try:
                    artist_data = await get_soundcloud_user(track_data["artist_id"], client_id)
                except Exception as e:
                    print(f"[search_soundcloud_api] Failed to fetch artist: {e}")
                    # Continue without artist data
            results.append((track_data, artist_data))

        return results
    except HTTPException:
        # If SoundCloud API fails, return empty list (Spotify might still work)
        print("[search_soundcloud_api] SoundCloud API failed, returning empty results")
        return []
    except Exception as e:
        print(f"[search_soundcloud_api] Unexpected error: {e}")
        return []
