import { sendToBackground } from "@plasmohq/messaging";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RequestBody as GetVideoRequestBody, ResponseBody as GetVideoResponseBody } from "~background/messages/get-video";

type ChromeTab = { url?: string; id?: number }
type ChromeTabs = {
  query: (queryInfo: {
    active: boolean
    currentWindow: boolean
  }) => Promise<ChromeTab[]>
}
type ChromeAPI = { tabs?: ChromeTabs }

interface YouTubeVideo {
  id: string
  title: string
  url: string
  timestamp: number
}

interface TrackMetadata {
  title: string
  duration?: number | null
  explicit?: boolean
  genre?: string | null
  isrc?: string | null
  image?: string | null
  album?: string | null
  albumImageUrl?: string | null
  spotifyTrackId?: string | null
  spotifyUri?: string | null
  youtubeVideoId?: string | null
  youtubeUrl?: string | null
  soundcloudId?: string | null
  soundcloudUrl?: string | null
}

interface ArtistMetadata {
  name: string
  bio?: string | null
  avatarUrl?: string | null
  profile?: string | null
  genres?: string[]
  spotifyUri?: string | null
  youtubeChannelUrl?: string | null
  soundcloudUrl?: string | null
  followers?: number | null
  popularity?: number | null
}

interface SpotifyMetadata {
  source: string
  track: TrackMetadata
  artist: ArtistMetadata
}

interface MetadataResponse {
  spotify: SpotifyMetadata[]
  soundcloud: SpotifyMetadata[]
  youtube?: SpotifyMetadata[]
}

interface MetadataErrorDetail {
  message?: string
  trace?: string[]
  providerErrors?: Record<string, string>
}

interface MetadataErrorResponse {
  detail?: string | MetadataErrorDetail
}

const NO_TRACKS_FOUND_DETAILS = new Set([
  "No tracks found on Spotify or SoundCloud",
  "No tracks found on Spotify, SoundCloud, or YouTube"
])

type PopupEnv = {
  PLASMO_PUBLIC_YT_METADATA_WORKER?: string
  PLASMO_PUBLIC_YtMetadataWorker?: string
  PLASMO_PUBLIC_EDEN_GATEWAY?: string
}

const METADATA_WORKER_URL =
  process.env.PLASMO_PUBLIC_YT_METADATA_WORKER || process.env.PLASMO_PUBLIC_YtMetadataWorker || ""

const EDEN_GATEWAY_URL = process.env.PLASMO_PUBLIC_EDEN_GATEWAY || ""

export function PopupApp() {
  const [currentUrl, setCurrentUrl] = useState("")
  const [youtubeVideo, setYoutubeVideo] = useState<YouTubeVideo | null>(null)
  const [refinedQuery, setRefinedQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false)
  const [metadataError, setMetadataError] = useState("")
  const [trackOptions, setTrackOptions] = useState<SpotifyMetadata[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState("")

  const selectedMetadata = useMemo(
    () => trackOptions[selectedIndex] || null,
    [trackOptions, selectedIndex]
  )

  const resetMetadataState = useCallback(() => {
    setMetadataError("")
    setTrackOptions([])
    setSelectedIndex(0)
    setUploadSuccess("")
  }, [])

  const fetchYouTubeVideoViaMessaging = useCallback(async () => {
    try {
      const result = await sendToBackground<GetVideoRequestBody, GetVideoResponseBody>({
        name: "get-video",
        body: { activeTabOnly: true }
      })
      setYoutubeVideo(result as YouTubeVideo | null)
    } catch (error) {
      console.error("[Eden Popup] Failed to fetch video info via messaging", error)
      setYoutubeVideo(null)
    }
  }, [])

  const handleInitialLoad = useCallback(async () => {
    setIsLoading(true)
    if (
      typeof window !== "undefined" &&
      (window as Window & { chrome?: ChromeAPI }).chrome?.tabs
    ) {
      const w = window as Window & { chrome?: ChromeAPI }
      try {
        const tabs = await w.chrome?.tabs?.query({
          active: true,
          currentWindow: true
        })
        const tab = tabs?.[0]
        setCurrentUrl(tab?.url || "No URL available")
      } catch {
        setCurrentUrl("Unable to inspect active tab")
      }
    } else {
      setCurrentUrl("Extension context not available")
    }

    await fetchYouTubeVideoViaMessaging()
    setIsLoading(false)
  }, [fetchYouTubeVideoViaMessaging])

  const handleUpload = useCallback(async () => {
    if (!youtubeVideo) {
      return
    }

    resetMetadataState()
    setIsFetchingMetadata(true)
    setShowDetails(true)

    if (!METADATA_WORKER_URL) {
      setMetadataError("Metadata worker URL is not configured.")
      setIsFetchingMetadata(false)
      return
    }

    try {
      const query = refinedQuery.trim() || youtubeVideo.title
      const body = { query, limit: 5 }
      const res = await fetch(`${METADATA_WORKER_URL}/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        let detail = ""
        let trace: string[] = []

        try {
          const errorJson = (await res.json()) as MetadataErrorResponse
          const detailData = errorJson?.detail

          if (typeof detailData === "string") {
            detail = detailData
          } else if (detailData && typeof detailData === "object") {
            detail = detailData.message || ""
            trace = Array.isArray(detailData.trace) ? detailData.trace : []
          }
        } catch {
          // Ignore JSON parsing errors and keep a fallback message below.
        }

        if (trace.length > 0) {
          console.error("[Eden Popup] Metadata worker trace", trace)
        }

        if (res.status === 404 && NO_TRACKS_FOUND_DETAILS.has(detail)) {
          setMetadataError(detail)
          return
        }

        if (detail) {
          throw new Error(detail)
        }

        throw new Error(`Request failed with status ${res.status}`)
      }

      const data = (await res.json()) as MetadataResponse
      const allResults: SpotifyMetadata[] = [
        ...(data.spotify || []),
        ...(data.soundcloud || []),
        ...(data.youtube || [])
      ]

      if (allResults.length === 0) {
        setMetadataError("No results found from any source.")
        return
      }

      setTrackOptions(allResults)
      setSelectedIndex(0)
      setShowDetails(true)
    } catch (err) {
      console.error("[Eden Popup] Metadata fetch failed", err)
      if (err instanceof Error && NO_TRACKS_FOUND_DETAILS.has(err.message)) {
        setMetadataError(err.message)
      } else {
        setMetadataError("Failed to fetch metadata. Please try again.")
      }
    } finally {
      setIsFetchingMetadata(false)
    }
  }, [youtubeVideo, refinedQuery, resetMetadataState])

  const handlePush = useCallback(async () => {
    setMetadataError("")
    setUploadSuccess("")

    if (!youtubeVideo) {
      setMetadataError("No YouTube video to push.")
      return
    }

    if (!trackOptions.length) {
      setMetadataError("No track metadata available. Fetch metadata first.")
      return
    }

    const selected = selectedMetadata
    if (!selected) {
      setMetadataError("Select a track before pushing.")
      return
    }

    const { track, artist, source } = selected

    if (!track.image) {
      setMetadataError("Artwork is required before pushing to Eden.")
      return
    }

    if (!EDEN_GATEWAY_URL) {
      setMetadataError("Gateway URL is not configured.")
      return
    }

    setIsPushing(true)

    try {
      const payload = {
        url: youtubeVideo.url,
        source,
        artist: {
          name: artist.name,
          bio: artist.bio ?? undefined,
          avatarUrl: artist.avatarUrl ?? track.image,
          spotifyUri: artist.spotifyUri ?? undefined,
          followers: artist.followers ?? undefined,
          popularity: artist.popularity ?? undefined
        },
        track: {
          title: track.title,
          duration: track.duration ?? undefined,
          isrc: track.isrc ?? undefined,
          genre: track.genre ?? undefined,
          explicit: track.explicit ?? false,
          image: track.image,
          album: track.album ?? undefined,
          spotifyTrackId: track.spotifyTrackId ?? undefined,
          spotifyUri: track.spotifyUri ?? undefined
        }
      }

      const res = await fetch(`${EDEN_GATEWAY_URL}/api/jobs/downloader`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed with status ${res.status}`)
      }

      setUploadSuccess("Upload completed successfully.")
    } catch (err) {
      console.error("[Eden Popup] Push failed", err)
      setMetadataError("Push failed. Please try again.")
      setUploadSuccess("")
    } finally {
      setIsPushing(false)
    }
  }, [youtubeVideo, trackOptions.length, selectedMetadata])

  const getSelectedExternalUrl = useCallback((option?: SpotifyMetadata | null) => {
    if (!option) {
      return ""
    }

    return (
      option.track?.spotifyUri ||
      option.track?.youtubeUrl ||
      option.track?.soundcloudUrl ||
      option.artist?.spotifyUri ||
      option.artist?.youtubeChannelUrl ||
      option.artist?.soundcloudUrl ||
      ""
    )
  }, [])

  const handleOpenSource = useCallback((url?: string) => {
    if (!url) return
    window.open(url, "_blank")
  }, [])

  const selectedExternalUrl = useMemo(
    () => getSelectedExternalUrl(selectedMetadata),
    [getSelectedExternalUrl, selectedMetadata]
  )

  const formatDuration = useCallback((duration?: number | null) => {
    if (!duration || duration <= 0 || !Number.isFinite(duration)) {
      return "Unknown"
    }

    const totalSeconds = Math.round(duration)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}m ${seconds}s`
  }, [])

  const updateSelectedTrackField = useCallback(
    (field: keyof TrackMetadata, value: string) => {
      setTrackOptions((prev) => {
        if (!prev[selectedIndex]) {
          return prev
        }

        const next = [...prev]
        const selected = next[selectedIndex]
        const nextTrack = { ...selected.track }

        if (field === "duration") {
          const parsed = Number(value)
          nextTrack.duration = Number.isFinite(parsed) ? parsed : null
        } else {
          ;(nextTrack as Record<string, unknown>)[field] = value || null
        }

        next[selectedIndex] = {
          ...selected,
          track: nextTrack
        }

        return next
      })
    },
    [selectedIndex]
  )

  const updateSelectedArtistField = useCallback(
    (field: keyof ArtistMetadata, value: string) => {
      setTrackOptions((prev) => {
        if (!prev[selectedIndex]) {
          return prev
        }

        const next = [...prev]
        const selected = next[selectedIndex]
        const nextArtist = { ...selected.artist }

        if (field === "followers" || field === "popularity") {
          const parsed = Number(value)
          ;(nextArtist as Record<string, unknown>)[field] = Number.isFinite(parsed) ? parsed : null
        } else {
          ;(nextArtist as Record<string, unknown>)[field] = value || null
        }

        next[selectedIndex] = {
          ...selected,
          artist: nextArtist
        }

        return next
      })
    },
    [selectedIndex]
  )

  const handleOpenVideo = useCallback(() => {
    if (youtubeVideo?.url) {
      window.open(youtubeVideo.url, "_blank")
    }
  }, [youtubeVideo])

  const handleCopyId = useCallback(() => {
    if (youtubeVideo?.id) {
      navigator.clipboard.writeText(youtubeVideo.id)
    }
  }, [youtubeVideo])

  const handleRefresh = useCallback(async () => {
    console.log("[Eden Popup] Manual refresh triggered")
    setIsLoading(true)

    if (
      typeof window !== "undefined" &&
      (window as Window & { chrome?: ChromeAPI }).chrome?.tabs
    ) {
      const w = window as Window & { chrome?: ChromeAPI }
      try {
        const tabs = await w.chrome?.tabs?.query({
          active: true,
          currentWindow: true
        })
        const tab = tabs?.[0]

        if (tab?.id) {
          window.setTimeout(async () => {
            await fetchYouTubeVideoViaMessaging()
            setIsLoading(false)
          }, 1500)
          return
        }
      } catch (error) {
        console.error("[Eden Popup] Failed to refresh", error)
      }
    }

    await fetchYouTubeVideoViaMessaging()
    setIsLoading(false)
  }, [fetchYouTubeVideoViaMessaging])

  useEffect(() => {
    void handleInitialLoad()
  }, [handleInitialLoad])

  return (
    <main
      data-theme="retro"
      className="min-h-[620px] min-w-[470px] bg-base-300 p-4 text-base-content"
    >
      <section className="mx-auto w-full max-w-md">
        <div className="card border border-base-content/20 bg-base-100 shadow-xl">
          <div className="card-body gap-4 p-4">
            <header className="navbar min-h-0 rounded-box bg-base-200 px-3 py-2">
              <div className="navbar-start">
                <h1 className="text-lg font-bold tracking-wide">Eden Music</h1>
              </div>
              <div className="navbar-end">
                <button
                  type="button"
                  onClick={handleInitialLoad}
                  disabled={isLoading}
                  className="btn btn-primary btn-sm"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                      Loading
                    </>
                  ) : (
                    "Load"
                  )}
                </button>
              </div>
            </header>

            <div className="mockup-browser border border-base-content/20 bg-base-200/70">
              <div className="mockup-browser-toolbar">
                <div className="input text-xs break-all">{currentUrl || "unknown"}</div>
              </div>

              <div className="bg-base-100 p-3">
                {youtubeVideo ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold leading-snug">{youtubeVideo.title}</p>
                      <span className="badge badge-secondary badge-sm">YouTube</span>
                    </div>

                    <p className="text-xs opacity-70">Video ID: {youtubeVideo.id}</p>

                    <a
                      href={youtubeVideo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-primary block break-all text-xs"
                    >
                      {youtubeVideo.url}
                    </a>

                    <p className="text-xs opacity-60">
                      Saved at: {new Date(youtubeVideo.timestamp).toLocaleString()}
                    </p>

                    <div className="join w-full">
                      <button
                        type="button"
                        onClick={handleOpenVideo}
                        className="btn btn-sm join-item flex-1"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="btn btn-sm join-item flex-1"
                      >
                        Copy ID
                      </button>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        className="btn btn-sm join-item"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info alert-soft">
                    <span className="text-sm">
                      Navigate to a YouTube video and click Load to extract details.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <fieldset className="fieldset rounded-box border border-base-content/20 bg-base-100 p-3">
              <legend className="fieldset-legend">Search Query</legend>
              <input
                type="text"
                value={refinedQuery}
                onChange={(e) => setRefinedQuery(e.target.value)}
                placeholder="not what you are looking for? refine it.."
                className="input input-bordered w-full"
              />
              <p className="label">If empty, the current YouTube title is used.</p>
            </fieldset>

            <button
              type="button"
              disabled={!youtubeVideo || isFetchingMetadata}
              onClick={handleUpload}
              className="btn btn-accent btn-block"
            >
              {isFetchingMetadata ? (
                <>
                  <span className="loading loading-dots loading-sm" aria-hidden="true" />
                  Finding metadata...
                </>
              ) : (
                "Choose version of song."
              )}
            </button>

            {metadataError && !uploadSuccess ? (
              <div role="alert" className="alert alert-error alert-soft text-sm">
                <span>{metadataError}</span>
              </div>
            ) : null}

            {showDetails ? (
              <section className="collapse collapse-arrow collapse-open border border-base-content/20 bg-base-200/60">
                <div className="collapse-title pb-0 text-base font-semibold">Track Details</div>
                <div className="collapse-content space-y-3 pt-2">
                  {isFetchingMetadata ? (
                    <div className="flex items-center gap-2 text-sm opacity-80">
                      <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                      Fetching metadata...
                    </div>
                  ) : null}

                  {!isFetchingMetadata && trackOptions.length === 0 && !metadataError ? (
                    <p className="text-sm opacity-70">No metadata loaded yet.</p>
                  ) : null}

                  <ul className="list rounded-box bg-base-100">
                    {trackOptions.map((option, idx) => (
                      <li key={`${option.source}-${idx}`} className="list-row py-2 w-full">
                        <button
                          type="button"
                          onClick={() => setSelectedIndex(idx)}
                          className={`btn h-auto w-full min-w-83.75 items-start justify-start rounded-sm px-2 py-2 text-left normal-case ${
                            selectedIndex === idx ? "btn-primary" : "btn-ghost"
                          }`}
                        >
                          <div className="flex w-full items-start gap-3">
                            <div className="avatar">
                              <div className="mask mask-squircle h-14 w-14 bg-base-300">
                                {option.track?.albumImageUrl || option.track?.image ? (
                                  <img
                                    src={option.track?.albumImageUrl || option.track?.image || ""}
                                    alt={option.track?.title || "Track artwork"}
                                  />
                                ) : null}
                              </div>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex w-full items-start justify-between gap-2">
                                  <div
                                    className="tooltip tooltip-top max-w-full"
                                    data-tip={option.track?.title || "Unknown title"}
                                  >
                                    <span
                                      className="line-clamp-1 text-sm font-semibold"
                                      title={option.track?.title || "Unknown title"}
                                    >
                                      {option.track?.title || "Unknown title"}
                                    </span>
                                  </div>
                                <span className="badge badge-outline badge-xs uppercase text-nowrap">{option.source}</span>
                              </div>

                              <span className="line-clamp-1 text-xs opacity-70">
                                by: {option.artist?.name || "Unknown artist"}
                              </span>

                              <div className="flex w-full flex-wrap items-center gap-2">
                                <span className="text-xs opacity-70">
                                  Album: {option.track?.album || "Unknown"}
                                </span>
                                <span className="text-xs opacity-70">
                                  Genre: {option.track?.genre || "Unknown"}
                                </span>
                                <span className="badge badge-outline badge-xs uppercase">
                                  {formatDuration(option.track?.duration)}
                                </span>
                                {option.track?.isrc ? (
                                  <span className="text-xs opacity-70">ISRC: {option.track.isrc}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>

                  {selectedMetadata ? (
                    <div className="card border border-base-content/20 bg-base-100">
                      <div className="card-body gap-3 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <fieldset className="fieldset col-span-2">
                            <legend className="fieldset-legend">Track title</legend>
                            <input
                              type="text"
                              value={selectedMetadata.track?.title || ""}
                              onChange={(e) => updateSelectedTrackField("title", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>

                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Artist name</legend>
                            <input
                              type="text"
                              value={selectedMetadata.artist?.name || ""}
                              onChange={(e) => updateSelectedArtistField("name", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>

                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Album</legend>
                            <input
                              type="text"
                              value={selectedMetadata.track?.album || ""}
                              onChange={(e) => updateSelectedTrackField("album", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>

                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Genre</legend>
                            <input
                              type="text"
                              value={selectedMetadata.track?.genre || ""}
                              onChange={(e) => updateSelectedTrackField("genre", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>

                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Duration (seconds)</legend>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedMetadata.track?.duration ?? ""}
                              onChange={(e) => updateSelectedTrackField("duration", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>

                          <fieldset className="fieldset col-span-2">
                            <legend className="fieldset-legend">Artwork URL</legend>
                            <input
                              type="text"
                              value={selectedMetadata.track?.image || ""}
                              onChange={(e) => updateSelectedTrackField("image", e.target.value)}
                              className="input input-sm w-full"
                            />
                          </fieldset>
                        </div>

                        <div className="join w-full">
                          <button
                            type="button"
                            disabled={isPushing}
                            onClick={handlePush}
                            className="btn btn-primary join-item flex-1"
                          >
                            {isPushing ? (
                              <>
                                <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                                Pushing...
                              </>
                            ) : (
                              "Push to Eden"
                            )}
                          </button>

                          {selectedExternalUrl ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSource(selectedExternalUrl)}
                              className="btn btn-outline join-item"
                            >
                              Open Source
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {uploadSuccess ? (
                    <div role="alert" className="alert alert-success alert-soft text-sm">
                      <span>{uploadSuccess}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
