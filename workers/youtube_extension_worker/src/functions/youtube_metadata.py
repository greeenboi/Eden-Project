"""YouTube Data API metadata helper functions and lightweight dict schemas."""

import re
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import httpx
from fastapi import HTTPException

__all__ = [
    "YouTubeArtistMetadata",
    "YouTubeTrackMetadata",
    "YouTubeMetadataResponse",
    "search_youtube_api",
]


YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"


class YouTubeArtistMetadata(TypedDict, total=False):
    name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    profile: Optional[str]
    youtube_channel_id: Optional[str]
    youtube_channel_url: Optional[str]
    subscriber_count: Optional[int]
    channel_view_count: Optional[int]


class YouTubeTrackMetadata(TypedDict, total=False):
    title: Optional[str]
    image: Optional[str]
    duration_ms: Optional[int]
    youtube_video_id: Optional[str]
    youtube_url: Optional[str]
    view_count: Optional[int]
    like_count: Optional[int]
    channel_id: Optional[str]
    channel_title: Optional[str]


class YouTubeMetadataResponse(TypedDict):
    source: str
    track: YouTubeTrackMetadata
    artist: YouTubeArtistMetadata


def _thumbnail_url(thumbnails: Dict[str, Any] | None) -> Optional[str]:
    if not thumbnails:
        return None

    for key in ("maxres", "standard", "high", "medium", "default"):
        candidate = thumbnails.get(key) or {}
        url = candidate.get("url")
        if isinstance(url, str) and url:
            return url

    return None


def _to_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _iso8601_to_milliseconds(duration: Optional[str]) -> Optional[int]:
    if not duration or not isinstance(duration, str):
        return None

    match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", duration)
    if not match:
        return None

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    total_seconds = hours * 3600 + minutes * 60 + seconds
    return total_seconds * 1000


async def search_youtube_videos(query: str, api_key: str, limit: int = 5) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            YOUTUBE_SEARCH_URL,
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": limit,
                "key": api_key,
            },
        )

    if response.status_code != 200:
        detail = f"YouTube search failed (status {response.status_code}): {response.text}"
        raise HTTPException(status_code=502, detail=detail)

    payload = response.json() or {}
    items = payload.get("items", []) or []

    results: List[Dict[str, Any]] = []
    for item in items:
        snippet = item.get("snippet") or {}
        item_id = item.get("id") or {}
        video_id = item_id.get("videoId")
        if not video_id:
            continue

        results.append(
            {
                "youtube_video_id": video_id,
                "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                "title": snippet.get("title"),
                "image": _thumbnail_url(snippet.get("thumbnails")),
                "channel_id": snippet.get("channelId"),
                "channel_title": snippet.get("channelTitle"),
            }
        )

    return results


async def get_youtube_videos_details(video_ids: List[str], api_key: str) -> Dict[str, Dict[str, Any]]:
    if not video_ids:
        return {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            YOUTUBE_VIDEOS_URL,
            params={
                "part": "contentDetails,statistics,snippet",
                "id": ",".join(video_ids),
                "key": api_key,
            },
        )

    if response.status_code != 200:
        detail = f"YouTube videos lookup failed (status {response.status_code}): {response.text}"
        raise HTTPException(status_code=502, detail=detail)

    payload = response.json() or {}
    items = payload.get("items", []) or []
    details_by_id: Dict[str, Dict[str, Any]] = {}

    for item in items:
        video_id = item.get("id")
        if not video_id:
            continue

        content_details = item.get("contentDetails") or {}
        statistics = item.get("statistics") or {}
        snippet = item.get("snippet") or {}

        details_by_id[video_id] = {
            "duration_ms": _iso8601_to_milliseconds(content_details.get("duration")),
            "view_count": _to_int(statistics.get("viewCount")),
            "like_count": _to_int(statistics.get("likeCount")),
            "image": _thumbnail_url(snippet.get("thumbnails")),
        }

    return details_by_id


async def get_youtube_channels_details(
    channel_ids: List[str], api_key: str
) -> Dict[str, Dict[str, Any]]:
    if not channel_ids:
        return {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            YOUTUBE_CHANNELS_URL,
            params={
                "part": "snippet,statistics",
                "id": ",".join(channel_ids),
                "key": api_key,
            },
        )

    if response.status_code != 200:
        detail = f"YouTube channels lookup failed (status {response.status_code}): {response.text}"
        raise HTTPException(status_code=502, detail=detail)

    payload = response.json() or {}
    items = payload.get("items", []) or []
    details_by_id: Dict[str, Dict[str, Any]] = {}

    for item in items:
        channel_id = item.get("id")
        if not channel_id:
            continue

        snippet = item.get("snippet") or {}
        statistics = item.get("statistics") or {}
        custom_url = snippet.get("customUrl")

        details_by_id[channel_id] = {
            "name": snippet.get("title"),
            "bio": snippet.get("description"),
            "avatar_url": _thumbnail_url(snippet.get("thumbnails")),
            "profile": f"https://www.youtube.com/{custom_url}" if custom_url else None,
            "youtube_channel_id": channel_id,
            "youtube_channel_url": f"https://www.youtube.com/{custom_url}" if custom_url else None,
            "subscriber_count": _to_int(statistics.get("subscriberCount")),
            "channel_view_count": _to_int(statistics.get("viewCount")),
        }

    return details_by_id


async def search_youtube_api(
    query: str, env, *, limit: int = 5
) -> List[Tuple[Dict[str, Any], Dict[str, Any] | None]]:
    api_key = getattr(env, "GOOGLE_API_KEY", None)

    print(
        f"[trace][youtube] start query={query!r} limit={limit} "
        f"has_api_key={bool(api_key)}"
    )

    if not api_key:
        print("[trace][youtube] skip search (missing GOOGLE_API_KEY)")
        return []

    try:
        tracks = await search_youtube_videos(query, api_key, limit)
        print(f"[trace][youtube] tracks fetched count={len(tracks)}")
        if not tracks:
            print("[trace][youtube] no track matches")
            return []

        video_ids = [track.get("youtube_video_id") for track in tracks if track.get("youtube_video_id")]
        channel_ids = list(
            {
                track.get("channel_id")
                for track in tracks
                if track.get("channel_id")
            }
        )

        video_details = await get_youtube_videos_details(video_ids, api_key)
        channel_details = await get_youtube_channels_details(channel_ids, api_key)

        results: List[Tuple[Dict[str, Any], Dict[str, Any] | None]] = []
        for track_data in tracks:
            video_id = track_data.get("youtube_video_id")
            channel_id = track_data.get("channel_id")

            if video_id and video_id in video_details:
                details = video_details[video_id]
                track_data["duration_ms"] = details.get("duration_ms")
                track_data["view_count"] = details.get("view_count")
                track_data["like_count"] = details.get("like_count")
                if not track_data.get("image"):
                    track_data["image"] = details.get("image")

            artist_data = channel_details.get(channel_id) if channel_id else None
            results.append((track_data, artist_data))

        print(f"[trace][youtube] complete result_pairs={len(results)}")
        return results
    except HTTPException:
        print("[trace][youtube] api failure, returning empty results")
        return []
    except Exception as exc:
        print(f"[trace][youtube] unexpected error: {exc}")
        return []
