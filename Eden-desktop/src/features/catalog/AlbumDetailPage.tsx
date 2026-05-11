import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { TrackList } from "@/components/TrackList";
import { getAlbum, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { AlbumDetailResponse } from "@/types/contracts";

function totalDuration(seconds: (number | null)[]): string {
  const total = seconds.reduce<number>((acc, value) => acc + (value ?? 0), 0);
  if (total <= 0) return "—";
  const mins = Math.round(total / 60);
  return `${mins} min`;
}

export function AlbumDetailPage() {
  const { albumId = "" } = useParams();
  const queue = useQueueStore();
  const [albumData, setAlbumData] = useState<AlbumDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!albumId) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);

    getAlbum(albumId, controller.signal)
      .then((response) => {
        setAlbumData(response);
        setError(null);
      })
      .catch((value) => {
        if (controller.signal.aborted) return;
        const message = value instanceof Error ? value.message : "Unable to load album";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [albumId]);

  function playTrack(index: number): void {
    if (!albumData) return;
    const queueTracks = albumData.tracks.map((item) =>
      trackToQueueTrack(item, albumData.artist.name ?? "Unknown Artist"),
    );
    queue.setQueue(queueTracks, index, {
      type: "album",
      albumId,
      albumName: albumData.album.title,
    });
    const selected = queueTracks[index];
    if (selected) {
      audioPlayer.loadAndPlay(selected).catch(() => undefined);
    }
  }

  if (isLoading) return <p className="eden-muted">Loading album…</p>;
  if (error) return <div className="eden-error">{error}</div>;
  if (!albumData) return <p className="eden-empty">Album not found.</p>;

  const { album, artist, tracks } = albumData;

  return (
    <>
      <section className="eden-hero">
        <Cover src={album.artworkUrl} alt={album.title} size="hero" />
        <div className="eden-hero-meta">
          <span className="eden-hero-eyebrow">Album</span>
          <h1 className="eden-hero-title">{album.title}</h1>
          <p className="eden-hero-sub">
            <Link to={`/artists/${artist.id}`} style={{ fontWeight: 600 }}>
              {artist.name}
            </Link>
            <span className="eden-pill">
              {album.releaseDate ? new Date(album.releaseDate).getFullYear() : "—"}
            </span>
            <span className="eden-pill">{tracks.length} tracks</span>
            <span className="eden-pill">{totalDuration(tracks.map((t) => t.duration))}</span>
          </p>
          {album.description && (
            <p className="eden-muted" style={{ marginTop: "0.6rem", maxWidth: 600 }}>
              {album.description}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={tracks.length === 0}
              onClick={() => playTrack(0)}
            >
              <Icon name="play" size={14} /> Play album
            </button>
          </div>
        </div>
      </section>

      <section className="eden-section">
        <TrackList tracks={tracks} onPlay={playTrack} emptyMessage="This album has no tracks." />
      </section>
    </>
  );
}
