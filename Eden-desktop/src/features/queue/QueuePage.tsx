import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";

interface QueuePageProps {
  mini?: boolean;
}

export function QueuePage({ mini = false }: QueuePageProps) {
  const queue = useQueueStore();

  return (
    <section>
      <h2>{mini ? "Mini Player" : "Queue"}</h2>
      <p className="eden-muted">
        Source: {queue.queueSource ? queue.queueSource.type : "none"}
      </p>
      <ul className="eden-list">
        {queue.queue.map((track, index) => (
          <li key={track.id}>
            <span>
              {index === queue.currentIndex ? "▶ " : ""}
              {track.title} - {track.artistName}
            </span>
            <button
              type="button"
              onClick={() => {
                const selected = queue.skipToIndex(index);
                if (selected) {
                  audioPlayer.loadAndPlay(selected).catch(() => undefined);
                }
              }}
            >
              Play
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
