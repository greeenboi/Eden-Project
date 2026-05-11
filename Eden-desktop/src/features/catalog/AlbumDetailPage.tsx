import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAlbum, trackToQueueTrack } from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { AlbumDetailResponse } from "@/types/contracts";

export function AlbumDetailPage() {
  const { albumId = "" } = useParams();
  const queue = useQueueStore();
  const [albumData, setAlbumData] = useState<AlbumDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!albumId) {
      return;
    }

    const controller = new AbortController();

    getAlbum(albumId, controller.signal)
      .then((response) => {
        setAlbumData(response);
        setError(null);
      })
      .catch((value) => {
        const message = value instanceof Error ? value.message : "Unable to load album";
        setError(message);
      });

    return () => controller.abort();
  }, [albumId]);

  return (
    <section>
      <h2>{albumData?.album.title ?? "Album"}</h2>
      <p className="eden-muted">{albumData?.artist.name ?? "Unknown Artist"}</p>
      {error && <p>{error}</p>}

      <ul className="eden-list">
        {albumData?.tracks.map((track, index) => (
          <li key={track.id}>
            <span>{track.title}</span>
            <button
              type="button"
              onClick={() => {
                const queueTracks = (albumData?.tracks ?? []).map((item) =>
                  trackToQueueTrack(item, albumData?.artist.name ?? "Unknown Artist"),
                );
                queue.setQueue(queueTracks, index, {
                  type: "album",
                  albumId,
                  albumName: albumData?.album.title ?? "Album",
                });
                const selected = queueTracks[index];
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
