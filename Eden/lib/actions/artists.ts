import { create } from "zustand";
import { API_BASE_URL } from "../../constants/constants";

/**
 * Artist profile information
 * @interface Artist
 */
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

/**
 * Pagination metadata for artist lists
 * @interface ArtistPagination
 */
export interface ArtistPagination {
	page: number;
	limit: number;
	total: number;
}

/**
 * Statistical data for an artist's content
 * @interface ArtistStatistics
 */
export interface ArtistStatistics {
	/** Total number of tracks (all statuses) */
	totalTracks: number;
	/** Number of published tracks */
	publishedTracks: number;
	/** Total number of albums */
	totalAlbums: number;
	/** Total number of uploads */
	totalUploads: number;
	/** Number of pending uploads */
	pendingUploads: number;
}

/**
 * Track information associated with an artist
 * @interface Track
 */
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
	status: "initiated" | "uploaded" | "processing" | "published" | "failed";
	createdAt: string;
	updatedAt: string;
}

/**
 * Paginated track results for an artist
 * @interface TracksPagination
 */
export interface TracksPagination {
	tracks: Track[];
	pagination: ArtistPagination;
}

/**
 * Zustand store state for managing artists and their content
 * @interface ArtistState
 */
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
	fetchArtists: (
		page?: number,
		limit?: number,
		verified?: boolean | null,
	) => Promise<void>;
	fetchArtistById: (id: string) => Promise<void>;
	fetchArtistStats: (id: string) => Promise<void>;
	fetchArtistTracks: (
		id: string,
		page?: number,
		limit?: number,
		status?: string,
	) => Promise<void>;
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

	/**
	 * Clears any error messages from the store
	 * @returns {void}
	 */
	clearError: () => set({ error: null }),

	/**
	 * Clears the current artist and all related data (stats, tracks)
	 * @returns {void}
	 */
	clearCurrentArtist: () =>
		set({
			currentArtist: null,
			currentArtistStats: null,
			currentArtistTracks: [],
			tracksPagination: null,
		}),

	/**
	 * Clears search results from the store
	 * @returns {void}
	 */
	clearSearchResults: () => set({ searchResults: [] }),

	/**
	 * Fetches a paginated list of artists with optional verification filter
	 * @async
	 * @param {number} [page=1] - Page number (1-indexed)
	 * @param {number} [limit=20] - Number of artists per page (1-100)
	 * @param {boolean | null} [verified=null] - Filter by verification status (true|false|null for all)
	 * @returns {Promise<void>}
	 * @throws {Error} When the API request fails
	 * @example
	 * ```ts
	 * await fetchArtists(1, 20, true); // Fetch only verified artists
	 * ```
	 */
	fetchArtists: async (page = 1, limit = 20, verified = null) => {
		set({ isLoading: true, error: null });

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (verified !== null) {
				params.append("verified", verified.toString());
			}

			const response = await fetch(`${API_BASE_URL}/api/artists?${params}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch artists");
			}

			const data = await response.json();

			set((state) => ({
				// Append artists for subsequent pages, replace for page 1
				artists: page === 1 
					? data.artists 
					: [...state.artists, ...data.artists],
				pagination: data.pagination,
				isLoading: false,
				error: null,
			}));
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching artists";
			set({
				isLoading: false,
				error: errorMessage,
				artists: [],
				pagination: null,
			});
			throw error;
		}
	},

	/**
	 * Fetches detailed information for a specific artist by ID
	 * @async
	 * @param {string} id - Artist UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When artist is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchArtistById('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchArtistById: async (id: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/artists/${id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Artist not found");
				}
				throw new Error("Failed to fetch artist");
			}

			const data = await response.json();

			set({
				currentArtist: data,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching artist";
			set({
				isLoading: false,
				error: errorMessage,
				currentArtist: null,
			});
			throw error;
		}
	},

	/**
	 * Fetches statistical data for a specific artist (track counts, album counts, uploads)
	 * @async
	 * @param {string} id - Artist UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When artist is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchArtistStats('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchArtistStats: async (id: string) => {
		set({ isLoadingStats: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/artists/${id}/stats`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Artist not found");
				}
				throw new Error("Failed to fetch artist statistics");
			}

			const data = await response.json();

			set({
				currentArtistStats: data,
				isLoadingStats: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching statistics";
			set({
				isLoadingStats: false,
				error: errorMessage,
				currentArtistStats: null,
			});
			throw error;
		}
	},

	/**
	 * Fetches paginated tracks for a specific artist with optional status filter
	 * @async
	 * @param {string} id - Artist UUID
	 * @param {number} [page=1] - Page number (1-indexed)
	 * @param {number} [limit=20] - Number of tracks per page (1-100)
	 * @param {string} [status] - Filter by track status (initiated|uploaded|processing|published|failed)
	 * @returns {Promise<void>}
	 * @throws {Error} When artist is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchArtistTracks('123e4567-e89b-12d3-a456-426614174000', 1, 20, 'published');
	 * ```
	 */
	fetchArtistTracks: async (
		id: string,
		page = 1,
		limit = 20,
		status?: string,
	) => {
		set({ isLoadingTracks: true, error: null });

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (status) {
				params.append("status", status);
			}

			const response = await fetch(
				`${API_BASE_URL}/api/artists/${id}/tracks?${params}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Artist not found");
				}
				throw new Error("Failed to fetch artist tracks");
			}

			const data = await response.json();

			// Append to existing tracks if loading more pages
			const existingTracks = page > 1 ? get().currentArtistTracks : [];

			set({
				currentArtistTracks: [...existingTracks, ...data.tracks],
				tracksPagination: data.pagination,
				isLoadingTracks: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching tracks";
			set({
				isLoadingTracks: false,
				error: errorMessage,
			});
			throw error;
		}
	},

	/**
	 * Searches for artists by name
	 * @async
	 * @param {string} query - Search query string (minimum 1 character)
	 * @param {number} [limit=20] - Maximum number of results (1-50)
	 * @returns {Promise<void>}
	 * @throws {Error} When query is invalid (400) or API request fails
	 * @example
	 * ```ts
	 * await searchArtists('Queen', 20);
	 * ```
	 */
	searchArtists: async (query: string, limit = 20) => {
		set({ isLoading: true, error: null });

		try {
			const params = new URLSearchParams({
				q: query,
				limit: limit.toString(),
			});

			const response = await fetch(
				`${API_BASE_URL}/api/artists/search?${params}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				if (response.status === 400) {
					throw new Error("Invalid search query");
				}
				throw new Error("Failed to search artists");
			}

			const data = await response.json();

			set({
				searchResults: data.artists,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred searching artists";
			set({
				isLoading: false,
				error: errorMessage,
				searchResults: [],
			});
			throw error;
		}
	},
}));
