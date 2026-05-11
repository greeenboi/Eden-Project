import { apiRequest } from "@/services/http";
import type {
  Album,
  AlbumDetailResponse,
  AlbumTracksResponse,
  AlbumsResponse,
  Artist,
  ArtistTracksResponse,
  ArtistsResponse,
  SearchTracksResponse,
  Track,
  TrackWithRelations,
  TracksResponse,
} from "@/types/contracts";

interface PaginationInput {
  page?: number;
  limit?: number;
}

export function getPublishedTracks(
  input: PaginationInput = {},
  signal?: AbortSignal,
): Promise<TracksResponse> {
  return apiRequest<TracksResponse>(
    "/api/tracks/published",
    {
      method: "GET",
      signal,
    },
    {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  );
}

export function searchTracks(query: string, limit = 20, signal?: AbortSignal): Promise<SearchTracksResponse> {
  return apiRequest<SearchTracksResponse>(
    "/api/tracks/search",
    {
      method: "GET",
      signal,
    },
    { q: query, limit },
  );
}

export function getTrackDetails(trackId: string, signal?: AbortSignal): Promise<TrackWithRelations> {
  return apiRequest<TrackWithRelations>(`/api/tracks/${trackId}`, {
    method: "GET",
    signal,
  });
}

export function listArtists(input: PaginationInput = {}, signal?: AbortSignal): Promise<ArtistsResponse> {
  return apiRequest<ArtistsResponse>(
    "/api/artists",
    {
      method: "GET",
      signal,
    },
    {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  );
}

export function getArtist(artistId: string, signal?: AbortSignal): Promise<Artist> {
  return apiRequest<Artist>(`/api/artists/${artistId}`, {
    method: "GET",
    signal,
  });
}

export function getArtistTracks(
  artistId: string,
  input: PaginationInput = {},
  signal?: AbortSignal,
): Promise<ArtistTracksResponse> {
  return apiRequest<ArtistTracksResponse>(
    `/api/artists/${artistId}/tracks`,
    {
      method: "GET",
      signal,
    },
    {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      status: "published",
    },
  );
}

export function listAlbums(input: PaginationInput = {}, signal?: AbortSignal): Promise<AlbumsResponse> {
  return apiRequest<AlbumsResponse>(
    "/api/albums",
    {
      method: "GET",
      signal,
    },
    {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    },
  );
}

export function getAlbum(albumId: string, signal?: AbortSignal): Promise<AlbumDetailResponse> {
  return apiRequest<AlbumDetailResponse>(`/api/albums/${albumId}`, {
    method: "GET",
    signal,
  });
}

export function getAlbumTracks(albumId: string, signal?: AbortSignal): Promise<AlbumTracksResponse> {
  return apiRequest<AlbumTracksResponse>(`/api/albums/${albumId}/tracks`, {
    method: "GET",
    signal,
  });
}

export function trackToQueueTrack(track: Track, artistName = "Unknown Artist") {
  return {
    id: track.id,
    title: track.title,
    artistName,
    artworkUrl: track.artworkUrl,
    duration: track.duration,
  };
}

export function albumToSourceName(album: Album): string {
  return album.title || "Album";
}
