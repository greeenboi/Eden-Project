import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { TrackList } from "@/components/TrackList";
import { getArtist, getArtistTracks, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Artist, Track } from "@/types/contracts";

export function ArtistDetailPage() {
  const { artistId = "" } = useParams();
  const queue = useQueueStore();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      getArtist(artistId, controller.signal),
      getArtistTracks(artistId, { limit: 100 }, controller.signal),
    ])
      .then(([artistResponse, tracksResponse]) => {
        setArtist(artistResponse);
        setTracks(tracksResponse.tracks);
        setError(null);
      })
      .catch((value) => {
        if (controller.signal.aborted) return;
        const message = value instanceof Error ? value.message : "Unable to load artist";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [artistId]);

  function playTrack(index: number): void {
    const queueTracks = tracks.map((item) =>
      trackToQueueTrack(item, artist?.name ?? "Unknown Artist"),
    );
    queue.setQueue(queueTracks, index, {
      type: "artist",
      artistId,
      artistName: artist?.name ?? "Artist",
    });
    const selected = queueTracks[index];
    if (selected) {
      audioPlayer.loadAndPlay(selected).catch(() => undefined);
    }
  }

  if (isLoading) return <p className="eden-muted">Loading artist…</p>;
  if (error) return <div className="eden-error">{error}</div>;
  if (!artist) return <p className="eden-empty">Artist not found.</p>;

  return (
    <>
      <section className="eden-hero">
        <Cover
          src={artist.avatarUrl}
          alt={artist.name}
          size="hero"
          shape="circle"
        />
        <div className="eden-hero-meta">
          <span className="eden-hero-eyebrow">
            {artist.verified ? "Verified artist" : "Artist"}
          </span>
          <h1 className="eden-hero-title">{artist.name}</h1>
          <p className="eden-hero-sub">
            <span className="eden-pill">{tracks.length} tracks</span>
            {artist.verified && (
              <span className="eden-pill eden-pill-brand">
                <Icon name="verified" size={12} /> Verified
              </span>
            )}
          </p>
          {artist.bio && (
            <p className="eden-muted" style={{ marginTop: "0.6rem", maxWidth: 600 }}>
              {artist.bio}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={tracks.length === 0}
              onClick={() => playTrack(0)}
            >
              <Icon name="play" size={14} /> Play
            </button>
            <button
              type="button"
              disabled={tracks.length === 0}
              onClick={() => {
                queue.toggleShuffle();
                playTrack(0);
              }}
            >
              <Icon name="shuffle" size={14} /> Shuffle
            </button>
          </div>
        </div>
      </section>

      <section className="eden-section">
        <div className="eden-section-title">
          <span className="eden-section-eyebrow">Popular</span>
          <h2>Tracks</h2>
        </div>
        <TrackList tracks={tracks} onPlay={playTrack} emptyMessage="No published tracks yet." />
      </section>
    </>
  );
}
