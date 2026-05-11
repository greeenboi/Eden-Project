import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@/types/contracts";

interface TrackListProps {
  tracks: Track[];
  artistNames?: Record<string, string>;
  onPlay: (index: number) => void;
  showAlbum?: boolean;
  emptyMessage?: string;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackList({
  tracks,
  artistNames,
  onPlay,
  showAlbum = true,
  emptyMessage = "No tracks yet.",
}: TrackListProps) {
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  if (tracks.length === 0) {
    return <p className="eden-empty">{emptyMessage}</p>;
  }

  return (
    <ol className="eden-track-list" aria-label="Track list">
      <li className="eden-track-list-head" aria-hidden="true">
        <span>#</span>
        <span>Title</span>
        {showAlbum && <span className="meta">Genre</span>}
        <span className="dur">Duration</span>
        <span className="actions" />
      </li>
      {tracks.map((track, index) => {
        const active = currentTrackId === track.id;
        return (
          <li
            key={track.id}
            className={`eden-track-row${active ? " is-active" : ""}`}
            onDoubleClick={() => onPlay(index)}
          >
            <span className="num">
              {active && isPlaying ? <Icon name="play" size={12} /> : index + 1}
            </span>
            <span className="title-cell">
              <Cover src={track.artworkUrl} alt={track.title} size="sm" />
              <span className="title-text" title={track.title}>
                {track.title}
                {track.explicit ? <span className="eden-pill" style={{ marginLeft: 8 }}>E</span> : null}
              </span>
            </span>
            {showAlbum && (
              <span className="meta">
                {track.genre ?? (artistNames?.[track.artistId] ?? "—")}
              </span>
            )}
            <span className="dur">{formatDuration(track.duration)}</span>
            <span className="actions">
              <button
                type="button"
                className="btn-icon btn-ghost"
                aria-label={`Play ${track.title}`}
                onClick={() => onPlay(index)}
              >
                <Icon name="play" size={14} />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
