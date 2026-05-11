import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getArtist, getArtistTracks, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Artist, Track } from "@/types/contracts";

export function ArtistDetailPage() {
  const { artistId = "" } = useParams();
  const queue = useQueueStore();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      return;
    }

    const controller = new AbortController();

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
        const message = value instanceof Error ? value.message : "Unable to load artist";
        setError(message);
      });

    return () => controller.abort();
  }, [artistId]);

  return (
    <section>
      <h2>{artist?.name ?? "Artist"}</h2>
      <p className="eden-muted">{artist?.bio ?? "No bio available."}</p>
      {error && <p>{error}</p>}

      <ul className="eden-list">
        {tracks.map((track, index) => (
          <li key={track.id}>
            <span>{track.title}</span>
            <button
              type="button"
              onClick={() => {
                const queueTracks = tracks.map((item) => trackToQueueTrack(item, artist?.name ?? "Unknown Artist"));
                queue.setQueue(queueTracks, index, {
                  type: "artist",
                  artistId,
                  artistName: artist?.name ?? "Artist",
                });
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
