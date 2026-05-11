import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import {
    getPublishedTracks,
    listAlbums,
    listArtists,
    trackToQueueTrack,
} from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Album, Artist, Track } from "@/types/contracts";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  const queue = useQueueStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const artistNameById = useMemo(() => {
    return artists.reduce<Record<string, string>>((acc, artist) => {
      acc[artist.id] = artist.name;
      return acc;
    }, {});
  }, [artists]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      getPublishedTracks({ limit: 12 }, controller.signal),
      listAlbums({ limit: 8 }, controller.signal).catch(() => ({ albums: [], pagination: { page: 1, limit: 8, total: 0 } })),
      listArtists({ limit: 100 }, controller.signal).catch(() => ({ artists: [], pagination: { page: 1, limit: 100, total: 0 } })),
    ])
      .then(([tracksResponse, albumsResponse, artistsResponse]) => {
        setTracks(tracksResponse.tracks);
        setAlbums(albumsResponse.albums);
        setArtists(artistsResponse.artists);
        setError(null);
      })
      .catch((value) => {
        if (controller.signal.aborted) return;
        const message = value instanceof Error ? value.message : "Failed to load home";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  function playTrack(index: number): void {
    const queueTracks = tracks.map((item) =>
      trackToQueueTrack(item, artistNameById[item.artistId] ?? "Unknown Artist"),
    );
    queue.setQueue(queueTracks, index, { type: "all-songs" });
    const selected = queueTracks[index];
    if (selected) {
      audioPlayer.loadAndPlay(selected).catch(() => undefined);
    }
  }

  if (isLoading) {
    return <p className="eden-muted">Loading your home feed…</p>;
  }

  if (error) {
    return <div className="eden-error">{error}</div>;
  }

  const featured = tracks.slice(0, 6);

  const featuredArtists = artists.slice(0, 8);

  return (
    <>
      <section className="eden-hero" aria-label="Featured">
        <div
          className="eden-cover eden-cover-hero"
          style={{
            background:
              "linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 60%, var(--panel-3) 100%)",
          }}
          aria-hidden="true"
        >
          <span>E</span>
        </div>
        <div className="eden-hero-meta">
          <span className="eden-hero-eyebrow">Tonight on Eden</span>
          <h1 className="eden-hero-title">The signal is open.</h1>
          <p className="eden-hero-sub">
            <span className="eden-pill eden-pill-brand">{tracks.length} tracks</span>
            <span className="eden-pill">{albums.length} albums</span>
            <span className="eden-pill">{artists.length} artists</span>
          </p>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={featured.length === 0}
              onClick={() => playTrack(0)}
            >
              <Icon name="play" size={14} /> Play feed
            </button>
            <Link to="/songs">
              <button type="button">Browse all songs</button>
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="eden-section">
          <div className="eden-section-header">
            <div className="eden-section-title">
              <span className="eden-section-eyebrow">Fresh signal</span>
              <h2>Latest tracks</h2>
            </div>
            <Link to="/songs">See all</Link>
          </div>

          <div className="eden-grid">
            {featured.map((track, index) => (
              <article
                key={track.id}
                className="eden-card"
                onDoubleClick={() => playTrack(index)}
              >
                <div className="eden-card-cover-wrap">
                  <Cover src={track.artworkUrl} alt={track.title} size="lg" />
                  <button
                    type="button"
                    className="eden-card-play"
                    aria-label={`Play ${track.title}`}
                    onClick={() => playTrack(index)}
                  >
                    <Icon name="play" size={16} />
                  </button>
                </div>
                <p className="eden-card-title">{track.title}</p>
                <p className="eden-card-subtitle">{track.genre ?? "Unknown genre"}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="eden-section">
          <div className="eden-section-header">
            <div className="eden-section-title">
              <span className="eden-section-eyebrow">Editor's pick</span>
              <h2>Albums to wander</h2>
            </div>
          </div>
          <div className="eden-grid">
            {albums.map((album) => (
              <Link key={album.id} to={`/albums/${album.id}`} className="eden-card">
                <Cover src={album.artworkUrl} alt={album.title} size="lg" />
                <p className="eden-card-title">{album.title}</p>
                <p className="eden-card-subtitle">
                  {album.releaseDate ? new Date(album.releaseDate).getFullYear() : "Album"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredArtists.length > 0 && (
        <section className="eden-section">
          <div className="eden-section-header">
            <div className="eden-section-title">
              <span className="eden-section-eyebrow">Voices</span>
              <h2>Featured artists</h2>
            </div>
            <Link to="/artists">See all</Link>
          </div>
          <div className="eden-grid">
            {featuredArtists.map((artist) => (
              <Link key={artist.id} to={`/artists/${artist.id}`} className="eden-card">
                <Cover
                  src={artist.avatarUrl}
                  alt={artist.name}
                  size="lg"
                  shape="circle"
                />
                <p className="eden-card-title">{artist.name}</p>
                <p className="eden-card-subtitle">
                  {artist.verified ? "Verified artist" : "Artist"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
