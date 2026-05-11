export type UserRole = "user" | "artist" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UserResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  artistId: string;
  title: string;
  description: string | null;
  artworkUrl: string | null;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackEncodings {
  "96kbps"?: string;
  "160kbps"?: string;
  "320kbps"?: string;
  flac?: string;
}

export type TrackStatus = "initiated" | "uploaded" | "processing" | "published" | "failed";

export interface Track {
  id: string;
  artistId: string;
  albumId: string | null;
  artworkUrl: string | null;
  title: string;
  duration: number | null;
  r2KeyOriginal: string | null;
  encodings: TrackEncodings | null;
  status: TrackStatus;
  isrc: string | null;
  genre: string | null;
  explicit: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackWithRelations extends Track {
  artist: Artist | null;
  album: Album | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface TracksResponse {
  tracks: Track[];
  pagination: Pagination;
}

export interface ArtistsResponse {
  artists: Artist[];
  pagination: Pagination;
}

export interface AlbumsResponse {
  albums: Album[];
  pagination: Pagination;
}

export interface ArtistTracksResponse {
  tracks: Track[];
  pagination: Pagination;
}

export interface AlbumTracksResponse {
  tracks: Track[];
}

export interface AlbumDetailResponse {
  album: Album;
  artist: Artist;
  tracks: Track[];
}

export interface SearchTracksResponse {
  tracks: Track[];
  query: string;
}

export interface StreamResponse {
  streamUrl: string;
  expiresAt: string;
  expiresIn: number;
  track: Track;
}

export interface QueueTrack {
  id: string;
  title: string;
  artistName: string;
  artworkUrl: string | null;
  duration: number | null;
}

export type RepeatMode = "off" | "all" | "one";
export type ShuffleMode = "off" | "on";

export type QueueSource =
  | { type: "all-songs" }
  | { type: "artist"; artistId: string; artistName: string }
  | { type: "album"; albumId: string; albumName: string }
  | { type: "search"; query: string }
  | { type: "custom"; name: string };
