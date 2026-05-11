import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublishedTracks, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Track } from "@/types/contracts";

export function HomePage() {
  const queue = useQueueStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    getPublishedTracks({ limit: 12 }, controller.signal)
      .then((response) => {
        setTracks(response.tracks);
        setError(null);
      })
      .catch((value) => {
        const message = value instanceof Error ? value.message : "Failed to load home tracks";
        setError(message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  if (isLoading) {
    return <section><h2>Home</h2><p>Loading tracks...</p></section>;
  }

  if (error) {
    return <section><h2>Home</h2><p>{error}</p></section>;
  }

  return (
    <section>
      <h2>Home</h2>
      <p className="eden-muted">Fresh published tracks from Eden.</p>
      <div className="eden-grid">
        {tracks.map((track, index) => (
          <article key={track.id} className="eden-card">
            <h3>{track.title}</h3>
            <p className="eden-muted">{track.genre ?? "Unknown genre"}</p>
            <div className="eden-card-actions">
              <button
                type="button"
                onClick={() => {
                  const queueTracks = tracks.map((item) => trackToQueueTrack(item));
                  queue.setQueue(queueTracks, index, { type: "all-songs" });
                  audioPlayer.loadAndPlay(queueTracks[index]).catch(() => undefined);
                }}
              >
                Play now
              </button>
              {track.albumId && <Link to={`/albums/${track.albumId}`}>Album</Link>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
