import { create } from "zustand";
import { API_BASE_URL } from "../../constants/constants";

/**
 * Album information
 * @interface Album
 */
export interface Album {
	id: string;
	artistId: string;
	title: string;
	description: string | null;
	artworkUrl: string | null;
	releaseDate: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Track encoding URLs for different quality levels
 * @interface TrackEncodings
 */
export interface TrackEncodings {
	"96kbps": string;
	"160kbps": string;
	"320kbps": string;
	flac: string;
}

/**
 * Album track information (extended format from album endpoints)
 * @interface AlbumTrack
 */
export interface AlbumTrack {
	id: string;
	artistId: string;
	albumId: string | null;
	artworkUrl: string | null;
	title: string;
	duration: number | null;
	r2KeyOriginal: string | null;
	encodings: TrackEncodings;
	status: "initiated" | "uploaded" | "processing" | "published" | "failed";
	isrc: string | null;
	genre: string | null;
	explicit: boolean;
	publishedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Artist information included in album details
 * @interface AlbumArtist
 */
export interface AlbumArtist {
	id: string;
	name: string;
	bio: string | null;
	avatarUrl: string | null;
	verified: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Album with full details including artist and tracks
 * @interface AlbumWithDetails
 */
export interface AlbumWithDetails {
	album: Album;
	artist: AlbumArtist;
	tracks: AlbumTrack[];
}

/**
 * Pagination metadata for album lists
 * @interface AlbumPagination
 */
export interface AlbumPagination {
	page: number;
	limit: number;
	total: number;
}

/**
 * Input for creating a new album
 * @interface CreateAlbumInput
 */
export interface CreateAlbumInput {
	artistId: string;
	title: string;
	description?: string | null;
	artworkUrl?: string | null;
	releaseDate?: string | null;
}

/**
 * Input for updating an album
 * @interface UpdateAlbumInput
 */
export interface UpdateAlbumInput {
	artistId?: string;
	title?: string;
	description?: string | null;
	artworkUrl?: string | null;
	releaseDate?: string | null;
}

/**
 * Zustand store state for managing albums
 * @interface AlbumState
 */
interface AlbumState {
	albums: Album[];
	currentAlbum: AlbumWithDetails | null;
	currentAlbumTracks: AlbumTrack[];
	pagination: AlbumPagination | null;
	isLoading: boolean;
	isLoadingTracks: boolean;
	isCreating: boolean;
	isUpdating: boolean;
	isDeleting: boolean;
	error: string | null;

	// Actions
	fetchAlbums: (
		page?: number,
		limit?: number,
		artistId?: string | null,
	) => Promise<void>;
	fetchAlbumById: (id: string) => Promise<void>;
	fetchAlbumTracks: (id: string) => Promise<void>;
	createAlbum: (input: CreateAlbumInput) => Promise<Album>;
	updateAlbum: (id: string, input: UpdateAlbumInput) => Promise<Album>;
	deleteAlbum: (id: string) => Promise<void>;
	clearError: () => void;
	clearCurrentAlbum: () => void;
}

export const useAlbumStore = create<AlbumState>((set, get) => ({
	albums: [],
	currentAlbum: null,
	currentAlbumTracks: [],
	pagination: null,
	isLoading: false,
	isLoadingTracks: false,
	isCreating: false,
	isUpdating: false,
	isDeleting: false,
	error: null,

	/**
	 * Clears any error messages from the store
	 * @returns {void}
	 */
	clearError: () => set({ error: null }),

	/**
	 * Clears the current album and related data
	 * @returns {void}
	 */
	clearCurrentAlbum: () =>
		set({
			currentAlbum: null,
			currentAlbumTracks: [],
		}),

	/**
	 * Fetches a paginated list of albums with optional artist filter
	 * @async
	 * @param {number} [page=1] - Page number (1-indexed)
	 * @param {number} [limit=20] - Number of albums per page (1-100)
	 * @param {string | null} [artistId=null] - Filter by artist UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When the API request fails
	 * @example
	 * ```ts
	 * await fetchAlbums(1, 20, '123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchAlbums: async (page = 1, limit = 20, artistId = null) => {
		set({ isLoading: true, error: null });

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (artistId) {
				params.append("artistId", artistId);
			}

			const response = await fetch(`${API_BASE_URL}/api/albums?${params}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch albums");
			}

			const data = await response.json();

			set((state) => ({
				// Append albums for subsequent pages, replace for page 1
				albums: page === 1 ? data.albums : [...state.albums, ...data.albums],
				pagination: data.pagination,
				isLoading: false,
				error: null,
			}));
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching albums";
			set({
				isLoading: false,
				error: errorMessage,
				albums: [],
				pagination: null,
			});
			throw error;
		}
	},

	/**
	 * Fetches detailed information for a specific album by ID (includes artist and tracks)
	 * @async
	 * @param {string} id - Album UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When album is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchAlbumById('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchAlbumById: async (id: string) => {
		set({ isLoading: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/albums/${id}`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Album not found");
				}
				throw new Error("Failed to fetch album");
			}

			const data: AlbumWithDetails = await response.json();

			set({
				currentAlbum: data,
				currentAlbumTracks: data.tracks,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching album";
			set({
				isLoading: false,
				error: errorMessage,
				currentAlbum: null,
			});
			throw error;
		}
	},

	/**
	 * Fetches all tracks within a specific album
	 * @async
	 * @param {string} id - Album UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When album is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchAlbumTracks('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchAlbumTracks: async (id: string) => {
		set({ isLoadingTracks: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/albums/${id}/tracks`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Album not found");
				}
				throw new Error("Failed to fetch album tracks");
			}

			const data = await response.json();

			set({
				currentAlbumTracks: data.tracks,
				isLoadingTracks: false,
				error: null,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred fetching album tracks";
			set({
				isLoadingTracks: false,
				error: errorMessage,
			});
			throw error;
		}
	},

	/**
	 * Creates a new album for an artist
	 * @async
	 * @param {CreateAlbumInput} input - Album creation data
	 * @returns {Promise<Album>} The created album
	 * @throws {Error} When artist is not found (404), invalid data (400), or API request fails
	 * @example
	 * ```ts
	 * const album = await createAlbum({
	 *   artistId: '123e4567-e89b-12d3-a456-426614174000',
	 *   title: 'My New Album',
	 *   description: 'Album description',
	 *   releaseDate: '2026-01-15'
	 * });
	 * ```
	 */
	createAlbum: async (input: CreateAlbumInput) => {
		set({ isCreating: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/albums`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!response.ok) {
				if (response.status === 400) {
					throw new Error("Invalid request data");
				}
				if (response.status === 404) {
					throw new Error("Artist not found");
				}
				throw new Error("Failed to create album");
			}

			const album: Album = await response.json();

			// Add new album to the beginning of the list
			set((state) => ({
				albums: [album, ...state.albums],
				isCreating: false,
				error: null,
			}));

			return album;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred creating album";
			set({
				isCreating: false,
				error: errorMessage,
			});
			throw error;
		}
	},

	/**
	 * Updates an existing album's metadata
	 * @async
	 * @param {string} id - Album UUID
	 * @param {UpdateAlbumInput} input - Album update data
	 * @returns {Promise<Album>} The updated album
	 * @throws {Error} When album is not found (404) or API request fails
	 * @example
	 * ```ts
	 * const album = await updateAlbum('123e4567-e89b-12d3-a456-426614174000', {
	 *   title: 'Updated Album Title',
	 *   description: 'New description'
	 * });
	 * ```
	 */
	updateAlbum: async (id: string, input: UpdateAlbumInput) => {
		set({ isUpdating: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/albums/${id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(input),
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Album not found");
				}
				throw new Error("Failed to update album");
			}

			const album: Album = await response.json();

			// Update album in the list
			set((state) => ({
				albums: state.albums.map((a) => (a.id === id ? album : a)),
				currentAlbum: state.currentAlbum
					? { ...state.currentAlbum, album }
					: null,
				isUpdating: false,
				error: null,
			}));

			return album;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred updating album";
			set({
				isUpdating: false,
				error: errorMessage,
			});
			throw error;
		}
	},

	/**
	 * Deletes an album. Tracks will remain but lose album association.
	 * @async
	 * @param {string} id - Album UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When album is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await deleteAlbum('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	deleteAlbum: async (id: string) => {
		set({ isDeleting: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/albums/${id}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Album not found");
				}
				throw new Error("Failed to delete album");
			}

			// Remove album from the list
			set((state) => ({
				albums: state.albums.filter((a) => a.id !== id),
				currentAlbum:
					state.currentAlbum?.album.id === id ? null : state.currentAlbum,
				currentAlbumTracks:
					state.currentAlbum?.album.id === id ? [] : state.currentAlbumTracks,
				isDeleting: false,
				error: null,
			}));
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "An error occurred deleting album";
			set({
				isDeleting: false,
				error: errorMessage,
			});
			throw error;
		}
	},
}));
