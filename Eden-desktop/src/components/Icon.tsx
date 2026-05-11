import type { ReactNode, SVGProps } from "react";

type IconName =
  | "home"
  | "library"
  | "search"
  | "queue"
  | "artist"
  | "settings"
  | "upload"
  | "dashboard"
  | "play"
  | "pause"
  | "next"
  | "prev"
  | "shuffle"
  | "repeat"
  | "volume"
  | "verified"
  | "explicit"
  | "back"
  | "forward";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  ),
  library: (
    <>
      <rect x="3" y="4" width="4" height="16" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <path d="m17 5 4 14-3 1L14 6z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  queue: (
    <>
      <path d="M4 6h13M4 12h13M4 18h9" />
      <circle cx="19" cy="18" r="2" />
    </>
  ),
  artist: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1A2 2 0 1 1 6.4 16.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H5.5a2 2 0 1 1 0-4h.1a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1A2 2 0 1 1 9 6.4l.1.1a1 1 0 0 0 1.1.2H10.3a1 1 0 0 0 .6-.9V5.5a2 2 0 1 1 4 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1A2 2 0 1 1 19.6 9l-.1.1a1 1 0 0 0-.2 1.1V10.3a1 1 0 0 0 .9.6h.1a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.9.6z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 4v12" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </>
  ),
  next: (
    <>
      <path d="M5 4.5v15l11-7.5z" fill="currentColor" />
      <rect x="17" y="4.5" width="2.5" height="15" rx="1" fill="currentColor" />
    </>
  ),
  prev: (
    <>
      <path d="M19 4.5v15l-11-7.5z" fill="currentColor" />
      <rect x="4.5" y="4.5" width="2.5" height="15" rx="1" fill="currentColor" />
    </>
  ),
  shuffle: (
    <>
      <path d="M16 4h5v5" />
      <path d="M21 4 4 21" />
      <path d="M16 20h5v-5" />
      <path d="m21 20-6-6" />
      <path d="m4 4 5 5" />
    </>
  ),
  repeat: (
    <>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" />
      <path d="M19 8a6 6 0 0 1 0 8" />
      <path d="M15.5 10.5a3 3 0 0 1 0 3" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2 14.4 4.6 18 4l1 3.6L22 9l-1.4 3.4L22 16l-3 1.4-1 3.6-3.6-.6L12 23l-2.4-2.6L6 21l-1-3.6L2 16l1.4-3.4L2 9l3-1.4L6 4l3.6.6z" />
      <path d="m8.5 12 2.5 2.5L15.5 10" />
    </>
  ),
  explicit: <rect x="3" y="3" width="18" height="18" rx="3" />,
  back: <path d="m15 6-6 6 6 6" />,
  forward: <path d="m9 6 6 6-6 6" />,
};

const FILLED: ReadonlySet<IconName> = new Set(["play", "pause", "next", "prev", "volume"]);

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={FILLED.has(name) ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
