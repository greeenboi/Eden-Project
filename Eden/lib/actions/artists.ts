import { create } from 'zustand';

const API_BASE_URL = 'https://eden-server.suvan-gowrishanker-204.workers.dev';

export interface Artist {
  id: string;
  name: string;
  email: string;
  profile: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistPagination {
  page: number;
  limit: number;
  total: number;
}

export interface ArtistStatistics {
  totalTracks: number;
  publishedTracks: number;
  totalAlbums: number;
  totalUploads: number;
  pendingUploads: number;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  albumId: string | null;
  duration: number;
  trackNumber: number | null;
  discNumber: number | null;
  audioUrl: string | null;
  coverUrl: string | null;
  status: 'initiated' | 'uploaded' | 'processing' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface TracksPagination {
  tracks: Track[];
  pagination: ArtistPagination;
}

interface ArtistState {
  artists: Artist[];
  currentArtist: Artist | null;
  currentArtistStats: ArtistStatistics | null;
  currentArtistTracks: Track[];
  tracksPagination: ArtistPagination | null;
  searchResults: Artist[];
  pagination: ArtistPagination | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingTracks: boolean;
  error: string | null;
  
  // Actions
  fetchArtists: (page?: number, limit?: number, verified?: boolean | null) => Promise<void>;
  fetchArtistById: (id: string) => Promise<void>;
  fetchArtistStats: (id: string) => Promise<void>;
  fetchArtistTracks: (id: string, page?: number, limit?: number, status?: string) => Promise<void>;
  searchArtists: (query: string, limit?: number) => Promise<void>;
  clearError: () => void;
  clearCurrentArtist: () => void;
  clearSearchResults: () => void;
}

export const useArtistStore = create<ArtistState>((set, get) => ({
  artists: [],
  currentArtist: null,
  currentArtistStats: null,
  currentArtistTracks: [],
  tracksPagination: null,
  searchResults: [],
  pagination: null,
  isLoading: false,
  isLoadingStats: false,
  isLoadingTracks: false,
  error: null,

  clearError: () => set({ error: null }),
  
  clearCurrentArtist: () => set({ 
    currentArtist: null, 
    currentArtistStats: null,
    currentArtistTracks: [],
    tracksPagination: null
  }),

  clearSearchResults: () => set({ searchResults: [] }),

  fetchArtists: async (page = 1, limit = 20, verified = null) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (verified !== null) {
        params.append('verified', verified.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/artists?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }

      const data = await response.json();

      set({ 
        artists: data.artists,
        pagination: data.pagination,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching artists';
      set({ 
        isLoading: false, 
        error: errorMessage,
        artists: [],
        pagination: null
      });
      throw error;
    }
  },

  fetchArtistById: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Artist not found');
        }
        throw new Error('Failed to fetch artist');
      }

      const data = await response.json();

      set({ 
        currentArtist: data,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching artist';
      set({ 
        isLoading: false, 
        error: errorMessage,
        currentArtist: null
      });
      throw error;
    }
  },

  fetchArtistStats: async (id: string) => {
    set({ isLoadingStats: true, error: null });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/artists/${id}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Artist not found');
        }
        throw new Error('Failed to fetch artist statistics');
      }

      const data = await response.json();

      set({ 
        currentArtistStats: data,
        isLoadingStats: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching statistics';
      set({ 
        isLoadingStats: false, 
        error: errorMessage,
        currentArtistStats: null
      });
      throw error;
    }
  },

  fetchArtistTracks: async (id: string, page = 1, limit = 20, status?: string) => {
    set({ isLoadingTracks: true, error: null });
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`${API_BASE_URL}/api/artists/${id}/tracks?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Artist not found');
        }
        throw new Error('Failed to fetch artist tracks');
      }

      const data = await response.json();

      // Append to existing tracks if loading more pages
      const existingTracks = page > 1 ? get().currentArtistTracks : [];

      set({ 
        currentArtistTracks: [...existingTracks, ...data.tracks],
        tracksPagination: data.pagination,
        isLoadingTracks: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred fetching tracks';
      set({ 
        isLoadingTracks: false, 
        error: errorMessage
      });
      throw error;
    }
  },

  searchArtists: async (query: string, limit = 20) => {
    set({ isLoading: true, error: null });
    
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/api/artists/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Invalid search query');
        }
        throw new Error('Failed to search artists');
      }

      const data = await response.json();

      set({ 
        searchResults: data.artists,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred searching artists';
      set({ 
        isLoading: false, 
        error: errorMessage,
        searchResults: []
      });
      throw error;
    }
  },
}));
