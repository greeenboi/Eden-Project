import { create } from 'zustand';

const API_BASE_URL = 'https://eden-server.suvan-gowrishanker-204.workers.dev';

export interface TrackEncodings {
  '96kbps'?: string;
  '160kbps'?: string;
  '320kbps'?: string;
  'flac'?: string;
}

export interface Track {
  id: string;
  artistId: string;
  albumId: string | null;
  title: string;
  duration: number | null;
  r2KeyOriginal: string | null;
  encodings: TrackEncodings;
  status: 'initiated' | 'uploaded' | 'processing' | 'published' | 'failed';
  isrc: string | null;
  genre: string | null;
  explicit: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackWithDetails extends Track {
  artist: {
    id: string;
    name: string;
    email: string;
    profile: string | null;
    bio: string | null;
    avatarUrl: string | null;
    verified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  album: {
    id: string;
    artistId: string;
    title: string;
    description: string | null;
    artworkUrl: string | null;
    releaseDate: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface TrackPagination {
  page: number;
  limit: number;
  total: number;
}

interface TrackState {
  tracks: Track[];
  currentTrack: TrackWithDetails | null;
  pagination: TrackPagination | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTracks: (
    page?: number,
    limit?: number,
    artistId?: string,
    albumId?: string,
    status?: string
  ) => Promise<void>;
  fetchTrackById: (id: string) => Promise<void>;
  clearError: () => void;
  clearCurrentTrack: () => void;
  clearTracks: () => void;
}

export const useTrackStore = create<TrackState>((set, get) => ({
  tracks: [],
  currentTrack: null,
  pagination: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),
  
  clearCurrentTrack: () => set({ currentTrack: null }),
  
  clearTracks: () => set({ tracks: [], pagination: null }),

  fetchTracks: async (
    page = 1,
    limit = 20,
    artistId?: string,
    albumId?: string,
    status?: string
  ) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (artistId) params.append('artistId', artistId);
      if (albumId) params.append('albumId', albumId);
      if (status) params.append('status', status);

      const response = await fetch(`${API_BASE_URL}/api/tracks?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const data = await response.json();

      // Append to existing tracks if loading more pages
      const existingTracks = page > 1 ? get().tracks : [];

      set({ 
        tracks: [...existingTracks, ...data.tracks],
        pagination: data.pagination,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching tracks';
      set({ 
        isLoading: false, 
        error: errorMessage
      });
      throw error;
    }
  },

  fetchTrackById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/tracks/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Track not found');
        }
        throw new Error('Failed to fetch track');
      }

      const data = await response.json();

      set({ 
        currentTrack: data,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching track';
      set({ 
        isLoading: false, 
        error: errorMessage,
        currentTrack: null
      });
      throw error;
    }
  },
}));
