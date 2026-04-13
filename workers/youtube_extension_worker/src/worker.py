import asyncio
from fastapi import Body, FastAPI, HTTPException, Request
from functions.spotify_metadata import search_spotify_api
from functions.soundcloud_metadata import search_soundcloud_api
from functions.youtube_metadata import search_youtube_api
from pydantic import BaseModel, Field
from workers import WorkerEntrypoint


app = FastAPI()


DEFAULT_LIMIT = 5
MAX_LIMIT = 10


class MetadataRequest(BaseModel):
    query: str = Field(..., description="Search query (for example, track title)")
    limit: int = Field(
        DEFAULT_LIMIT,
        ge=1,
        le=MAX_LIMIT,
        description="Number of results per source",
    )


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


def _build_youtube_response(track_data, artist_data, query: str) -> dict:
    """Build a standardized response object from YouTube data."""
    artist_name = (
        (artist_data or {}).get("name")
        or track_data.get("channel_title")
        or "Unknown Artist"
    )
    track_image = track_data.get("image") or (artist_data or {}).get("avatar_url")

    duration_seconds = None
    if track_data.get("duration_ms") is not None:
        duration_seconds = track_data["duration_ms"] / 1000.0

    return {
        "source": "youtube",
        "track": {
            "title": track_data.get("title") or query,
            "duration": duration_seconds,
            "explicit": False,
            "genre": None,
            "isrc": None,
            "image": track_image,
            "albumImageUrl": track_image,
            "album": None,
            "youtubeVideoId": track_data.get("youtube_video_id"),
            "youtubeUrl": track_data.get("youtube_url"),
            "viewCount": track_data.get("view_count"),
            "likeCount": track_data.get("like_count"),
        },
        "artist": {
            "name": artist_name,
            "email": None,
            "avatarUrl": (artist_data or {}).get("avatar_url"),
            "bio": (artist_data or {}).get("bio"),
            "profile": (artist_data or {}).get("profile"),
            "genres": [],
            "youtubeChannelId": (artist_data or {}).get("youtube_channel_id"),
            "youtubeChannelUrl": (artist_data or {}).get("youtube_channel_url"),
            "followers": (artist_data or {}).get("subscriber_count"),
            "channelViews": (artist_data or {}).get("channel_view_count"),
        },
    }


@app.post(
    "/metadata",
    summary="Fetch metadata from Spotify, SoundCloud, and YouTube",
    responses={
        200: {
            "description": "Metadata found from one or more providers",
            "content": {
                "application/json": {
                    "examples": {
                        "success": {
                            "summary": "Successful metadata response",
                            "value": {
                                "spotify": [
                                    {
                                        "source": "spotify",
                                        "track": {
                                            "title": "One More Time",
                                            "duration": 320.2,
                                            "explicit": False,
                                            "genre": "French House",
                                            "isrc": "FRZ123456789",
                                            "image": "https://i.scdn.co/image/example",
                                            "albumImageUrl": "https://i.scdn.co/image/example",
                                            "album": "Discovery",
                                            "spotifyTrackId": "0DiWol3AO6WpXZgp0goxAV",
                                            "spotifyUri": "spotify:track:0DiWol3AO6WpXZgp0goxAV",
                                        },
                                        "artist": {
                                            "name": "Daft Punk",
                                            "avatarUrl": "https://i.scdn.co/image/artist-example",
                                            "bio": "Daft Punk has 10000000 Spotify followers",
                                            "genres": ["French House", "Electronic"],
                                            "spotifyUri": "spotify:artist:4tZwfgrHOc3mvqYlEYSvVi",
                                            "followers": 10000000,
                                            "popularity": 90,
                                        },
                                    }
                                ],
                                "soundcloud": [],
                                "youtube": [
                                    {
                                        "source": "youtube",
                                        "track": {
                                            "title": "Daft Punk - One More Time",
                                            "duration": 320.0,
                                            "explicit": False,
                                            "genre": None,
                                            "isrc": None,
                                            "image": "https://i.ytimg.com/vi/FGBhQbmPwH8/maxresdefault.jpg",
                                            "albumImageUrl": "https://i.ytimg.com/vi/FGBhQbmPwH8/maxresdefault.jpg",
                                            "album": None,
                                            "youtubeVideoId": "FGBhQbmPwH8",
                                            "youtubeUrl": "https://www.youtube.com/watch?v=FGBhQbmPwH8",
                                            "viewCount": 123456789,
                                            "likeCount": 4567890,
                                        },
                                        "artist": {
                                            "name": "Daft Punk",
                                            "avatarUrl": "https://yt3.ggpht.com/example",
                                            "bio": "Official channel",
                                            "profile": "https://www.youtube.com/@daftpunk",
                                            "genres": [],
                                            "youtubeChannelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
                                            "youtubeChannelUrl": "https://www.youtube.com/@daftpunk",
                                            "followers": 7000000,
                                            "channelViews": 2500000000,
                                        },
                                    }
                                ],
                            },
                        }
                    }
                }
            },
        },
        400: {
            "description": "Invalid request payload",
            "content": {
                "application/json": {
                    "examples": {
                        "emptyQuery": {
                            "summary": "Query is empty",
                            "value": {
                                "detail": {
                                    "message": "Field 'query' cannot be empty",
                                    "trace": [
                                        "/metadata request received",
                                        "payload parsed payload_type=MetadataRequest",
                                        "validation failed: empty query",
                                    ],
                                }
                            },
                        }
                    }
                }
            },
        },
        404: {
            "description": "No tracks found from all providers",
            "content": {
                "application/json": {
                    "examples": {
                        "notFound": {
                            "summary": "No metadata matches",
                            "value": {
                                "detail": {
                                    "message": "No tracks found on Spotify, SoundCloud, or YouTube",
                                    "trace": [
                                        "/metadata request received",
                                        "payload parsed payload_type=MetadataRequest",
                                        "query='unknown query' limit=5",
                                        "spotify task success count=0",
                                        "soundcloud task success count=0",
                                        "youtube task success count=0",
                                        "no enriched results from all providers",
                                    ],
                                    "providerErrors": {},
                                }
                            },
                        }
                    }
                }
            },
        },
        500: {
            "description": "Unexpected server error",
            "content": {
                "application/json": {
                    "examples": {
                        "serverError": {
                            "summary": "Unexpected error response",
                            "value": {
                                "detail": "Internal Server Error"
                            },
                        }
                    }
                }
            },
        },
    },
)
async def metadata(
    req: Request,
    payload: MetadataRequest = Body(
        ...,
        examples={
            "basic": {
                "summary": "Metadata search",
                "value": {"query": "Daft Punk - One More Time", "limit": 5},
            }
        },
    ),
):
    """
    Search for track metadata from Spotify, SoundCloud, and YouTube.
    
    Request body:
        - query (str, required): Search query (e.g., track title)
        - limit (int, optional): Number of results per source (default: 5, max: 10)
    
    Returns:
        - spotify: List of Spotify results
        - soundcloud: List of SoundCloud results
        - youtube: List of YouTube results
    """
    env = req.scope["env"]
    trace: list[str] = []

    def add_trace(message: str):
        trace.append(message)
        print(f"[trace][metadata] {message}")

    add_trace("/metadata request received")

    query = payload.query.strip()
    limit = payload.limit

    add_trace(f"payload parsed payload_type={type(payload).__name__}")

    if not query:
        add_trace("validation failed: empty query")
        raise HTTPException(
            status_code=400,
            detail={"message": "Field 'query' cannot be empty", "trace": trace},
        )

    add_trace(f"query={query!r} limit={limit}")
    
    spotify_task = search_spotify_api(query, env, limit=limit)
    soundcloud_task = search_soundcloud_api(query, env, limit=limit)
    youtube_task = search_youtube_api(query, env, limit=limit)
    
    spotify_results, soundcloud_results, youtube_results = await asyncio.gather(
        spotify_task,
        soundcloud_task,
        youtube_task,
        return_exceptions=True
    )

    provider_errors: dict[str, str] = {}

    if isinstance(spotify_results, Exception):
        provider_errors["spotify"] = str(spotify_results)
        add_trace(f"spotify task exception={spotify_results}")
    else:
        add_trace(f"spotify task success count={len(spotify_results)}")

    if isinstance(soundcloud_results, Exception):
        provider_errors["soundcloud"] = str(soundcloud_results)
        add_trace(f"soundcloud task exception={soundcloud_results}")
    else:
        add_trace(f"soundcloud task success count={len(soundcloud_results)}")

    if isinstance(youtube_results, Exception):
        provider_errors["youtube"] = str(youtube_results)
        add_trace(f"youtube task exception={youtube_results}")
    else:
        add_trace(f"youtube task success count={len(youtube_results)}")

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

    # Build YouTube response
    youtube_enriched = []
    if isinstance(youtube_results, list):
        for track_data, artist_data in youtube_results:
            youtube_enriched.append(_build_youtube_response(track_data, artist_data, query))

    # Return combined results
    if not spotify_enriched and not soundcloud_enriched and not youtube_enriched:
        add_trace("no enriched results from all providers")
        raise HTTPException(
            status_code=404,
            detail={
                "message": "No tracks found on Spotify, SoundCloud, or YouTube",
                "trace": trace,
                "providerErrors": provider_errors,
            },
        )

    add_trace(
        f"success spotify={len(spotify_enriched)} "
        f"soundcloud={len(soundcloud_enriched)} "
        f"youtube={len(youtube_enriched)}"
    )

    return {
        "spotify": spotify_enriched,
        "soundcloud": soundcloud_enriched,
        "youtube": youtube_enriched,
    }


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        import asgi

        return await asgi.fetch(app, request.js_object, self.env)
