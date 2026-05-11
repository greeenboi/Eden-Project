import { useState } from "react";
import { searchTracks, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Track } from "@/types/contracts";

export function SearchPage() {
  const queue = useQueueStore();
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(): Promise<void> {
    if (!query.trim()) {
      setTracks([]);
      setError(null);
      return;
    }

    try {
      const response = await searchTracks(query.trim());
      setTracks(response.tracks);
      setError(null);
    } catch (value) {
      const message = value instanceof Error ? value.message : "Search failed";
      setError(message);
    }
  }

  return (
    <section>
      <h2>Search</h2>
      <div className="eden-search-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tracks"
        />
        <button type="button" onClick={() => runSearch()}>Search</button>
      </div>

      {error && <p>{error}</p>}

      <ul className="eden-list">
        {tracks.map((track, index) => (
          <li key={track.id}>
            <span>{track.title}</span>
            <button
              type="button"
              onClick={() => {
                const queueTracks = tracks.map((item) => trackToQueueTrack(item));
                queue.setQueue(queueTracks, index, { type: "search", query });
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
