import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cover } from "@/components/Cover";
import { Icon } from "@/components/Icon";
import { listArtists } from "@/services/api/catalog";
import type { Artist } from "@/types/contracts";

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listArtists({ limit: 100 }, controller.signal)
      .then((response) => {
        setArtists(response.artists);
        setError(null);
      })
      .catch((value) => {
        if (controller.signal.aborted) return;
        const message = value instanceof Error ? value.message : "Unable to load artists";
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="eden-section">
      <div className="eden-section-header">
        <div className="eden-section-title">
          <span className="eden-section-eyebrow">Roster</span>
          <h2>Artists</h2>
          <p className="eden-muted">{artists.length} voices on Eden tonight.</p>
        </div>
      </div>

      {error && <div className="eden-error">{error}</div>}
      {isLoading ? (
        <p className="eden-muted">Loading artists…</p>
      ) : artists.length === 0 ? (
        <p className="eden-empty">No artists yet.</p>
      ) : (
        <div className="eden-grid">
          {artists.map((artist) => (
            <Link key={artist.id} to={`/artists/${artist.id}`} className="eden-card">
              <Cover src={artist.avatarUrl} alt={artist.name} size="lg" shape="circle" />
              <p className="eden-card-title">
                {artist.name}
                {artist.verified && (
                  <span style={{ color: "var(--brand)", marginLeft: 6, verticalAlign: "middle" }}>
                    <Icon name="verified" size={12} />
                  </span>
                )}
              </p>
              <p className="eden-card-subtitle">{artist.verified ? "Verified artist" : "Artist"}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
