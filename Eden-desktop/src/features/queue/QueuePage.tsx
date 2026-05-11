import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { audioPlayer } from "@/services/audio-player";
import { usePlayerStore } from "@/stores/player-store";
import { useQueueStore } from "@/stores/queue-store";

interface QueuePageProps {
  mini?: boolean;
}

function sourceLabel(source: ReturnType<typeof useQueueStore.getState>["queueSource"]): string {
  if (!source) return "No source";
  switch (source.type) {
    case "all-songs": return "All Songs";
    case "artist": return `Artist · ${source.artistName}`;
    case "album": return `Album · ${source.albumName}`;
    case "search": return `Search · "${source.query}"`;
    case "custom": return source.name;
    default: return "Queue";
  }
}

export function QueuePage({ mini = false }: QueuePageProps) {
  const queue = useQueueStore();
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? null);

  return (
    <section className="eden-section">
      <div className="eden-section-title">
        <span className="eden-section-eyebrow">{mini ? "Mini player" : "Up next"}</span>
        <h2>{mini ? "Mini Player" : "Queue"}</h2>
        <p className="eden-muted">Source: {sourceLabel(queue.queueSource)}</p>
      </div>

      {queue.queue.length === 0 ? (
        <p className="eden-empty">Your queue is empty. Play something to fill it.</p>
      ) : (
        <ol className="eden-track-list">
          {queue.queue.map((track, index) => {
            const isActive = currentTrackId === track.id || index === queue.currentIndex;
            return (
              <li
                key={`${track.id}-${index}`}
                className={`eden-track-row${isActive ? " is-active" : ""}`}
                onDoubleClick={() => {
                  const selected = queue.skipToIndex(index);
                  if (selected) audioPlayer.loadAndPlay(selected).catch(() => undefined);
                }}
              >
                <span className="num">{index + 1}</span>
                <span className="title-cell">
                  <Cover src={track.artworkUrl} alt={track.title} size="sm" />
                  <span className="title-text">{track.title}</span>
                </span>
                <span className="meta">{track.artistName}</span>
                <span className="dur eden-mono">
                  {track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}` : "—"}
                </span>
                <span className="actions">
                  <button
                    type="button"
                    className="btn-icon btn-ghost"
                    aria-label={`Play ${track.title}`}
                    onClick={() => {
                      const selected = queue.skipToIndex(index);
                      if (selected) audioPlayer.loadAndPlay(selected).catch(() => undefined);
                    }}
                  >
                    <Icon name="play" size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
