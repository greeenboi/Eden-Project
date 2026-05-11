import { Icon } from "@/components/Icon";
import { TrackList } from "@/components/TrackList";
import { getPublishedTracks, listArtists, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Track } from "@/types/contracts";
import { useEffect, useMemo, useState } from "react";

export function AllSongsPage() {
  const queue = useQueueStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artistNames, setArtistNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    Promise.all([
      getPublishedTracks({ limit: 100 }, controller.signal),
      listArtists({ limit: 200 }, controller.signal).catch(() => ({
        artists: [],
        pagination: { page: 1, limit: 200, total: 0 },
      })),
    ])
      .then(([tracksResponse, artistsResponse]) => {
        const nextArtistNames = artistsResponse.artists.reduce<Record<string, string>>(
          (acc, artist) => {
            acc[artist.id] = artist.name;
            return acc;
          },
          {},
        );
        setArtistNames(nextArtistNames);
        setTracks(tracksResponse.tracks);
        setError(null);
      })
      .catch((value) => {
        if (controller.signal.aborted) return;
        const message = value instanceof Error ? value.message : "Unable to load songs";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((track) => {
      return (
        track.title.toLowerCase().includes(q) ||
        track.genre?.toLowerCase().includes(q)
      );
    });
  }, [tracks, filter]);

  function playFiltered(index: number): void {
    const queueTracks = filtered.map((item) =>
      trackToQueueTrack(item, artistNames[item.artistId] ?? "Unknown Artist"),
    );
    queue.setQueue(queueTracks, index, { type: "all-songs" });
    const selected = queueTracks[index];
    if (selected) {
      audioPlayer.loadAndPlay(selected).catch(() => undefined);
    }
  }

  return (
    <section className="eden-section">
      <div className="eden-section-header">
        <div className="eden-section-title">
          <span className="eden-section-eyebrow">Library</span>
          <h2>All Songs</h2>
          <p className="eden-muted">{tracks.length} published tracks in your reach.</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label className="eden-search-bar" style={{ minWidth: 240 }}>
            <span className="eden-search-icon">
              <Icon name="search" size={14} />
            </span>
            <input
              value={filter}
              onChange={(event) => setFilter(event.currentTarget.value)}
              placeholder="Filter this list"
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={filtered.length === 0}
            onClick={() => playFiltered(0)}
          >
            <Icon name="play" size={14} /> Play
          </button>
        </div>
      </div>

      {error && <div className="eden-error">{error}</div>}
      {isLoading ? (
        <p className="eden-muted">Loading songs…</p>
      ) : (
        <TrackList
          tracks={filtered}
          onPlay={playFiltered}
          emptyMessage={filter ? "No matches for that filter." : "No published tracks yet."}
        />
      )}
    </section>
  );
}
