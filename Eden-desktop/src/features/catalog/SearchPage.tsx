import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { TrackList } from "@/components/TrackList";
import {
    listAlbums,
    listArtists,
    searchTracks,
    trackToQueueTrack,
} from "@/services/api/catalog";
import { audioPlayer } from "@/services/audio-player";
import { useQueueStore } from "@/stores/queue-store";
import type { Album, Artist, Track } from "@/types/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type Tab = "all" | "tracks" | "artists" | "albums";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tracks", label: "Tracks" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

export function SearchPage() {
  const queue = useQueueStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const artistNameById = useMemo(() => {
    return allArtists.reduce<Record<string, string>>((acc, artist) => {
      acc[artist.id] = artist.name;
      return acc;
    }, {});
  }, [allArtists]);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listArtists({ limit: 100 }, controller.signal).catch(() => ({ artists: [], pagination: { page: 1, limit: 100, total: 0 } })),
      listAlbums({ limit: 100 }, controller.signal).catch(() => ({ albums: [], pagination: { page: 1, limit: 100, total: 0 } })),
    ]).then(([artistsResponse, albumsResponse]) => {
      setAllArtists(artistsResponse.artists);
      setAllAlbums(albumsResponse.albums);
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!trimmed) {
      setTracks([]);
      setError(null);
      setIsLoading(false);
      if (searchParams.get("q")) {
        const next = new URLSearchParams(searchParams);
        next.delete("q");
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (next.get("q") !== trimmed) {
      next.set("q", trimmed);
      setSearchParams(next, { replace: true });
    }

    setIsLoading(true);
    const controller = new AbortController();
    debounceRef.current = window.setTimeout(() => {
      searchTracks(trimmed, 40, controller.signal)
        .then((response) => {
          setTracks(response.tracks);
          setError(null);
        })
        .catch((value) => {
          if (controller.signal.aborted) return;
          const message = value instanceof Error ? value.message : "Search failed";
          setError(message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Artist[];
    return allArtists.filter((artist) => artist.name.toLowerCase().includes(q)).slice(0, 12);
  }, [allArtists, query]);

  const filteredAlbums = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Album[];
    return allAlbums.filter((album) => album.title.toLowerCase().includes(q)).slice(0, 12);
  }, [allAlbums, query]);

  function playTracks(index: number): void {
    const queueTracks = tracks.map((item) =>
      trackToQueueTrack(item, artistNameById[item.artistId] ?? "Unknown Artist"),
    );
    queue.setQueue(queueTracks, index, { type: "search", query });
    const selected = queueTracks[index];
    if (selected) {
      audioPlayer.loadAndPlay(selected).catch(() => undefined);
    }
  }

  const showTracks = tab === "all" || tab === "tracks";
  const showArtists = tab === "all" || tab === "artists";
  const showAlbums = tab === "all" || tab === "albums";

  const isEmpty =
    !isLoading &&
    query.trim() &&
    tracks.length === 0 &&
    filteredArtists.length === 0 &&
    filteredAlbums.length === 0;

  return (
    <section className="eden-section">
      <div className="eden-section-title">
        <span className="eden-section-eyebrow">Search</span>
        <h2>What do you want to hear?</h2>
      </div>

      <label className="eden-search-bar" style={{ marginTop: "0.6rem", maxWidth: 520 }}>
        <span className="eden-search-icon">
          <Icon name="search" size={16} />
        </span>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Tracks, artists, albums…"
        />
      </label>

      <div className="eden-tabs" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`eden-tab${tab === entry.id ? " is-active" : ""}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {error && <div className="eden-error">{error}</div>}

      {!query.trim() && (
        <p className="eden-empty">Start typing to search the Eden catalog.</p>
      )}

      {isLoading && <p className="eden-muted">Searching…</p>}

      {isEmpty && <p className="eden-empty">No matches for "{query.trim()}".</p>}

      {showTracks && tracks.length > 0 && (
        <div>
          <div className="eden-section-header">
            <h3>Tracks</h3>
            <button
              type="button"
              className="btn-primary"
              onClick={() => playTracks(0)}
            >
              <Icon name="play" size={14} /> Play results
            </button>
          </div>
          <TrackList tracks={tracks} onPlay={playTracks} />
        </div>
      )}

      {showArtists && filteredArtists.length > 0 && (
        <div>
          <h3 style={{ marginTop: "1rem" }}>Artists</h3>
          <div className="eden-grid">
            {filteredArtists.map((artist) => (
              <Link key={artist.id} to={`/artists/${artist.id}`} className="eden-card">
                <Cover src={artist.avatarUrl} alt={artist.name} size="lg" shape="circle" />
                <p className="eden-card-title">{artist.name}</p>
                <p className="eden-card-subtitle">{artist.verified ? "Verified artist" : "Artist"}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showAlbums && filteredAlbums.length > 0 && (
        <div>
          <h3 style={{ marginTop: "1rem" }}>Albums</h3>
          <div className="eden-grid">
            {filteredAlbums.map((album) => (
              <Link key={album.id} to={`/albums/${album.id}`} className="eden-card">
                <Cover src={album.artworkUrl} alt={album.title} size="lg" />
                <p className="eden-card-title">{album.title}</p>
                <p className="eden-card-subtitle">
                  {album.releaseDate ? new Date(album.releaseDate).getFullYear() : "Album"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
