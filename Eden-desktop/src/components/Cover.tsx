import { useState } from "react";

type CoverSize = "sm" | "md" | "lg" | "hero";

interface CoverProps {
  src?: string | null;
  alt: string;
  size?: CoverSize;
  shape?: "square" | "circle";
  fallback?: string;
}

function initialsFor(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "♪";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || cleaned[0].toUpperCase();
}

export function Cover({ src, alt, size = "md", shape = "square", fallback }: CoverProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const label = fallback ?? initialsFor(alt);

  return (
    <div
      className={`eden-cover eden-cover-${size}${shape === "circle" ? " eden-cover-circle" : ""}`}
      aria-hidden={showImage ? "true" : undefined}
    >
      {showImage ? (
        <img src={src ?? undefined} alt={alt} onError={() => setErrored(true)} loading="lazy" />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}
