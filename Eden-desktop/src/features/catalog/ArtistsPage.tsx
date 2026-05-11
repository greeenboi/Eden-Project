import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listArtists } from "@/services/api/catalog";
import type { Artist } from "@/types/contracts";

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listArtists({ limit: 100 }, controller.signal)
      .then((response) => {
        setArtists(response.artists);
        setError(null);
      })
      .catch((value) => {
        const message = value instanceof Error ? value.message : "Unable to load artists";
        setError(message);
      });

    return () => controller.abort();
  }, []);

  return (
    <section>
      <h2>Artists</h2>
      {error && <p>{error}</p>}
      <div className="eden-grid">
        {artists.map((artist) => (
          <article key={artist.id} className="eden-card">
            <h3>{artist.name}</h3>
            <p className="eden-muted">{artist.verified ? "Verified" : "Artist"}</p>
            <Link to={`/artists/${artist.id}`}>View profile</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
