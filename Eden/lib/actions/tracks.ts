import { create } from "zustand";
import { API_BASE_URL } from "../../constants/constants";

/**
 * Track encoding URLs for different audio quality levels
 * @interface TrackEncodings
 */
export interface TrackEncodings {
	/** URL for 96kbps audio encoding */
	"96kbps"?: string;
	/** URL for 160kbps audio encoding */
	"160kbps"?: string;
	/** URL for 320kbps audio encoding */
	"320kbps"?: string;
	/** URL for lossless FLAC audio encoding */
	flac?: string;
	/** URL for Ogg audio */
	Ogg?: string;
}

/**
 * Basic track information without artist/album details
 * @interface Track
 */
export interface Track {
	id: string;
	artistId: string;
	albumId: string | null;
	title: string;
	duration: number | null;
	r2KeyOriginal: string | null;
	encodings: TrackEncodings;
	status: "initiated" | "uploaded" | "processing" | "published" | "failed";
	isrc: string | null;
	genre: string | null;
	explicit: boolean;
	artworkUrl: string | null;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Extended track information including full artist and album details
 * @interface TrackWithDetails
 * @extends {Track}
 */
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

/**
 * Pagination metadata for track lists
 * @interface TrackPagination
 */
export interface TrackPagination {
	page: number;
	limit: number;
	total: number;
}

/**
 * Streaming URL response from the API
 * @interface StreamingUrlResponse
 */
export interface StreamingUrlResponse {
	streamUrl: string;
	expiresAt: string;
	expiresIn: number;
	track: Track;
}

/**
 * Zustand store state for managing tracks
 * @interface TrackState
 */
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
		status?: string,
	) => Promise<void>;
	fetchTrackById: (id: string) => Promise<void>;
	fetchPublishedTracks: (
		page?: number,
		limit?: number,
		artistId?: string,
		albumId?: string,
	) => Promise<void>;
	updateTrackStatus: (
		id: string,
		status: "initiated" | "uploaded" | "processing" | "published" | "failed",
		additionalData?: Partial<Track>
	) => Promise<void>;
	getStreamingUrl: (id: string) => Promise<StreamingUrlResponse>;
	clearError: () => void;
	clearCurrentTrack: () => void;
	clearTracks: () => void;
}

/**
 * Builds URL search parameters from an object, filtering out undefined values
 * @private
 */
const buildQueryParams = (params: Record<string, string | number | undefined>): string => {
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) {
			searchParams.append(key, String(value));
		}
	}
	return searchParams.toString();
};

/**
 * Generic fetch handler with error handling
 * @private
 */
const fetchAPI = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, {
		method: "GET",
		headers: { "Content-Type": "application/json" },
	});

	if (!response.ok) {
		if (response.status === 404) throw new Error("Resource not found");
		throw new Error(`API request failed: ${response.statusText}`);
	}

	return response.json();
};

export const useTrackStore = create<TrackState>((set, get) => ({
	tracks: [],
	currentTrack: null,
	pagination: null,
	isLoading: false,
	error: null,

	/**
	 * Fetches a paginated list of tracks with optional filters
	 * @async
	 * @param {number} [page=1] - Page number (1-indexed)
	 * @param {number} [limit=20] - Number of tracks per page (1-100)
	 * @param {string} [artistId] - Filter by artist UUID
	 * @param {string} [albumId] - Filter by album UUID
	 * @param {string} [status] - Filter by track status (initiated|uploaded|processing|published|failed)
	 * @returns {Promise<void>}
	 * @throws {Error} When the API request fails
	 * @example
	 * ```ts
	 * await fetchTracks(1, 20, undefined, undefined, 'published');
	 * ```
	 */
	fetchTracks: async (
		page = 1,
		limit = 50,
		artistId?: string,
		albumId?: string,
		status?: string,
	): Promise<void> => {
		set({ isLoading: true, error: null });

		try {
			const queryString = buildQueryParams({ page, limit, artistId, albumId, status });
			const data = await fetchAPI<{ tracks: Track[]; pagination: TrackPagination }>(
				`${API_BASE_URL}/api/tracks?${queryString}`
			);

			const existingTracks = page > 1 ? get().tracks : [];

			set({
				tracks: [...existingTracks, ...data.tracks],
				pagination: data.pagination,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to fetch tracks";
			set({ isLoading: false, error: errorMessage });
			throw error;
		}
	},

	/**
	 * Fetches detailed information for a specific track by ID
	 * @async
	 * @param {string} id - Track UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When track is not found (404) or API request fails
	 * @example
	 * ```ts
	 * await fetchTrackById('123e4567-e89b-12d3-a456-426614174000');
	 * ```
	 */
	fetchTrackById: async (id: string) => {
		set({ isLoading: true, error: null });

		try {
			const data = await fetchAPI<TrackWithDetails>(`${API_BASE_URL}/api/tracks/${id}`);
			set({ currentTrack: data, isLoading: false, error: null });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to fetch track";
			set({ isLoading: false, error: errorMessage, currentTrack: null });
			throw error;
		}
	},

	/**
	 * Fetches only published tracks (ready for streaming)
	 * @async
	 * @param {number} [page=1] - Page number (1-indexed)
	 * @param {number} [limit=50] - Number of tracks per page (1-100)
	 * @param {string} [artistId] - Filter by artist UUID
	 * @param {string} [albumId] - Filter by album UUID
	 * @returns {Promise<void>}
	 * @throws {Error} When the API request fails
	 * @example
	 * ```ts
	 * await fetchPublishedTracks(1, 50);
	 * ```
	 */
	fetchPublishedTracks: async (
		page = 1,
		limit = 50,
		artistId?: string,
		albumId?: string,
	) => {
		set({ isLoading: true, error: null });

		try {
			const queryString = buildQueryParams({ 
				page, 
				limit, 
				artistId, 
				albumId,
			});
			const data = await fetchAPI<{ tracks: Track[]; pagination: TrackPagination }>(
				`${API_BASE_URL}/api/tracks/published?${queryString}`
			);

			const existingTracks = page > 1 ? get().tracks : [];

			set({
				tracks: [...existingTracks, ...data.tracks],
				pagination: data.pagination,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to fetch published tracks";
			set({ isLoading: false, error: errorMessage });
			throw error;
		}
	},

	/**
	 * Updates the status of a track (e.g., mark as published after upload)
	 * @async
	 * @param {string} id - Track UUID
	 * @param {string} status - New status value
	 * @param {Partial<Track>} [additionalData] - Additional data to update (e.g., encodings, publishedAt)
	 * @returns {Promise<void>}
	 * @throws {Error} When track is not found or update fails
	 * @example
	 * ```ts
	 * await updateTrackStatus('track-id', 'published', { publishedAt: new Date().toISOString() });
	 * ```
	 */
	updateTrackStatus: async (
		id: string,
		status: "initiated" | "uploaded" | "processing" | "published" | "failed",
		additionalData?: Partial<Track>
	) => {
		set({ isLoading: true, error: null });

		try {
			const response = await fetch(`${API_BASE_URL}/api/tracks/${id}/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status, ...additionalData }),
			});

			if (!response.ok) {
				if (response.status === 404) throw new Error("Track not found");
				throw new Error(`Failed to update track status: ${response.statusText}`);
			}

			const updatedTrack = await response.json();

			// Update the track in the tracks array if it exists
			const tracks = get().tracks;
			const trackIndex = tracks.findIndex(t => t.id === id);
			if (trackIndex !== -1) {
				const newTracks = [...tracks];
				newTracks[trackIndex] = updatedTrack;
				set({ tracks: newTracks });
			}

			// Update currentTrack if it's the same track
			const currentTrack = get().currentTrack;
			if (currentTrack?.id === id) {
				set({ currentTrack: { ...currentTrack, ...updatedTrack } });
			}

			set({ isLoading: false, error: null });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to update track status";
			set({ isLoading: false, error: errorMessage });
			throw error;
		}
	},

	/**
	 * Gets a signed streaming URL for a track
	 * @async
	 * @param {string} id - Track UUID
	 * @returns {Promise<StreamingUrlResponse>} Streaming URL with expiration info
	 * @throws {Error} When track is not found or URL generation fails
	 * @example
	 * ```ts
	 * const { streamUrl, expiresIn } = await getStreamingUrl('track-id');
	 * player.replace(streamUrl);
	 * ```
	 */
	getStreamingUrl: async (id: string) => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/tracks/${id}/stream`);

			if (!response.ok) {
				if (response.status === 404) throw new Error("Track not found");
				throw new Error(`Failed to get streaming URL: ${response.statusText}`);
			}

			const data: StreamingUrlResponse = await response.json();
			return data;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Failed to get streaming URL";
			set({ error: errorMessage });
			throw error;
		}
	},

	clearError: () => set({ error: null }),
	clearCurrentTrack: () => set({ currentTrack: null }),
	clearTracks: () => set({ tracks: [], pagination: null }),
}));
