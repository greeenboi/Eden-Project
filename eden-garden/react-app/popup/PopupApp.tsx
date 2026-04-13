import { sendToBackground } from "@plasmohq/messaging"
import { useCallback, useEffect, useMemo, useState } from "react"

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

const METADATA_WORKER_URL =
  process.env.PLASMO_PUBLIC_YT_METADATA_WORKER ||
  process.env.PLASMO_PUBLIC_YtMetadataWorker ||
  ""

const EDEN_GATEWAY_URL = process.env.PLASMO_PUBLIC_EDEN_GATEWAY || ""

export function PopupApp() {
  const [currentUrl, setCurrentUrl] = useState("")
  const [youtubeVideo, setYoutubeVideo] = useState<YouTubeVideo | null>(null)
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
      const result = await sendToBackground<{ activeTabOnly?: boolean }, YouTubeVideo | null>({
        name: "get-video",
        body: { activeTabOnly: true }
      })
      setYoutubeVideo(result)
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
        const [tab] = await w.chrome?.tabs?.query({
          active: true,
          currentWindow: true
        })
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
      const body = { query: youtubeVideo.title, limit: 5 }
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
  }, [youtubeVideo, resetMetadataState])

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
    <main className="min-h-[620px] min-w-[470px] bg-slate-950 p-4 text-slate-100">
      <section className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Eden Music</h1>
          <button
            type="button"
            onClick={handleInitialLoad}
            disabled={isLoading}
            className="rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load"}
          </button>
        </header>

        <p className="text-xs text-slate-400 break-all">Active tab: {currentUrl || "unknown"}</p>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
          {youtubeVideo ? (
            <div className="space-y-2">
              <p className="font-semibold">{youtubeVideo.title}</p>
              <p className="text-xs text-slate-400">Video ID: {youtubeVideo.id}</p>
              <a
                href={youtubeVideo.url}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-lime-400 hover:text-lime-300"
              >
                {youtubeVideo.url}
              </a>
              <p className="text-xs text-slate-500">
                Saved at: {new Date(youtubeVideo.timestamp).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenVideo}
                  className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Copy ID
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Navigate to a YouTube video and click Load to extract details.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!youtubeVideo || isFetchingMetadata}
          onClick={handleUpload}
          className="rounded bg-lime-500 px-4 py-2 font-medium text-slate-950 hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetchingMetadata ? "Finding metadata..." : "Upload to Eden"}
        </button>

        {uploadSuccess ? <p className="text-sm text-green-400">{uploadSuccess}</p> : null}
        {metadataError && !uploadSuccess ? (
          <p className="text-sm text-red-400">{metadataError}</p>
        ) : null}

        {showDetails ? (
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <h2 className="font-semibold">Track Details</h2>
            {isFetchingMetadata ? <p className="text-sm text-slate-400">Fetching metadata...</p> : null}
            {!isFetchingMetadata && trackOptions.length === 0 && !metadataError ? (
              <p className="text-sm text-slate-400">No metadata loaded yet.</p>
            ) : null}

            <div className="space-y-2">
              {trackOptions.map((option, idx) => (
                <button
                  type="button"
                  key={`${option.source}-${idx}`}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full rounded border p-2 text-left transition ${
                    selectedIndex === idx
                      ? "border-lime-500 bg-slate-900"
                      : "border-slate-800 bg-slate-950 hover:border-slate-700"
                  }`}
                >
                  <p className="text-sm font-semibold">{option.track?.title || "Unknown title"}</p>
                  <p className="text-xs text-slate-400">Artist: {option.artist?.name || "Unknown artist"}</p>
                  <p className="text-xs text-slate-400">Album: {option.track?.album || "Unknown album"}</p>
                  <p className="text-xs text-slate-400 break-all">
                    Album image: {option.track?.albumImageUrl || option.track?.image || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400">Genre: {option.track?.genre || "Unknown"}</p>
                  <p className="text-xs text-slate-400">
                    Duration: {option.track?.duration ? `${option.track.duration.toFixed(1)}s` : "Unknown"}
                  </p>
                  {option.track?.isrc ? (
                    <p className="text-xs text-slate-400">ISRC: {option.track.isrc}</p>
                  ) : null}
                </button>
              ))}
            </div>

            {selectedMetadata ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="col-span-2 text-xs text-slate-400">
                    Track title
                    <input
                      type="text"
                      value={selectedMetadata.track?.title || ""}
                      onChange={(e) => updateSelectedTrackField("title", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Artist name
                    <input
                      type="text"
                      value={selectedMetadata.artist?.name || ""}
                      onChange={(e) => updateSelectedArtistField("name", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Album
                    <input
                      type="text"
                      value={selectedMetadata.track?.album || ""}
                      onChange={(e) => updateSelectedTrackField("album", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Genre
                    <input
                      type="text"
                      value={selectedMetadata.track?.genre || ""}
                      onChange={(e) => updateSelectedTrackField("genre", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Duration (seconds)
                    <input
                      type="number"
                      step="0.1"
                      value={selectedMetadata.track?.duration ?? ""}
                      onChange={(e) => updateSelectedTrackField("duration", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                  <label className="col-span-2 text-xs text-slate-400">
                    Artwork URL
                    <input
                      type="text"
                      value={selectedMetadata.track?.image || ""}
                      onChange={(e) => updateSelectedTrackField("image", e.target.value)}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPushing}
                    onClick={handlePush}
                    className="flex-1 rounded bg-lime-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-lime-400 disabled:opacity-50"
                  >
                    {isPushing ? "Pushing..." : "Push to Eden"}
                  </button>
                  {selectedExternalUrl ? (
                    <button
                      type="button"
                      onClick={() => handleOpenSource(selectedExternalUrl)}
                      className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                    >
                      Open Source
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  )
}
