import { useEffect, useState } from "react";
import { getPublishedTracks, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Track } from "@/types/contracts";

export function AllSongsPage() {
  const queue = useQueueStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPublishedTracks({ limit: 100 }, controller.signal)
      .then((response) => {
        setTracks(response.tracks);
        setError(null);
      })
      .catch((value) => {
        const message = value instanceof Error ? value.message : "Unable to load songs";
        setError(message);
      });

    return () => controller.abort();
  }, []);

  return (
    <section>
      <h2>All Songs</h2>
      {error && <p>{error}</p>}
      <ul className="eden-list">
        {tracks.map((track, index) => (
          <li key={track.id}>
            <span>{track.title}</span>
            <button
              type="button"
              onClick={() => {
                const queueTracks = tracks.map((item) => trackToQueueTrack(item));
                queue.setQueue(queueTracks, index, { type: "all-songs" });
                audioPlayer.loadAndPlay(queueTracks[index]).catch(() => undefined);
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
