import { API_BASE_URL } from "../../constants/constants";
import type { Album } from "./albums";
import type { Artist } from "./artists";
import type { Track } from "./tracks";

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 15000;

/**
 * Search result for artists
 */
export interface ArtistSearchResult {
	artists: Artist[];
	query: string;
}

/**
 * Search result for tracks
 */
export interface TrackSearchResult {
	tracks: Track[];
	query: string;
}

/**
 * Combined search results
 */
export interface CombinedSearchResult {
	artists: Artist[];
	tracks: Track[];
	query: string;
}

/**
 * Extended search results with related data
 */
export interface ExtendedSearchResult {
	artists: Artist[];
	tracks: Track[];
	albums: Album[];
	relatedTracks: Track[]; // Tracks from found artists
	query: string;
}

/**
 * Helper to create a fetch request with timeout support
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit,
	signal?: AbortSignal,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

	// Link external abort signal if provided
	if (signal) {
		signal.addEventListener("abort", () => controller.abort());
	}

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Search for artists by name
 * @param query - Search query string
 * @param limit - Maximum number of results (1-50, default 20)
 * @param signal - Optional abort signal
 */
export async function searchArtists(
	query: string,
	limit = 20,
	signal?: AbortSignal,
): Promise<ArtistSearchResult> {
	if (!query.trim()) {
		return { artists: [], query };
	}

	const params = new URLSearchParams({
		q: query.trim(),
		limit: Math.min(Math.max(1, limit), 50).toString(),
	});

	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/artists/search?${params}`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		if (response.status === 400) {
			throw new Error("Invalid search query");
		}
		throw new Error("Failed to search artists");
	}

	return response.json();
}

/**
 * Search for tracks by title
 * @param query - Search query string
 * @param limit - Maximum number of results (1-100, default 20)
 * @param signal - Optional abort signal
 */
export async function searchTracks(
	query: string,
	limit = 20,
	signal?: AbortSignal,
): Promise<TrackSearchResult> {
	if (!query.trim()) {
		return { tracks: [], query };
	}

	const params = new URLSearchParams({
		q: query.trim(),
		limit: Math.min(Math.max(1, limit), 100).toString(),
	});

	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/tracks/search?${params}`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		if (response.status === 400) {
			throw new Error("Invalid search query");
		}
		throw new Error("Failed to search tracks");
	}

	return response.json();
}

/**
 * Search for both artists and tracks simultaneously
 * @param query - Search query string
 * @param options - Search options
 * @param signal - Optional abort signal
 */
export async function searchAll(
	query: string,
	options: {
		artistLimit?: number;
		trackLimit?: number;
	} = {},
	signal?: AbortSignal,
): Promise<CombinedSearchResult> {
	const { artistLimit = 10, trackLimit = 20 } = options;

	if (!query.trim()) {
		return { artists: [], tracks: [], query };
	}

	// Run both searches in parallel
	const [artistResult, trackResult] = await Promise.all([
		searchArtists(query, artistLimit, signal),
		searchTracks(query, trackLimit, signal),
	]);

	return {
		artists: artistResult.artists,
		tracks: trackResult.tracks,
		query,
	};
}

/**
 * Fetch albums for a specific artist
 */
export async function fetchArtistAlbums(
	artistId: string,
	limit = 10,
	signal?: AbortSignal,
): Promise<Album[]> {
	const params = new URLSearchParams({
		artistId,
		limit: limit.toString(),
	});

	try {
		const response = await fetchWithTimeout(
			`${API_BASE_URL}/api/albums?${params}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
			},
			signal,
		);

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data.albums || [];
	} catch {
		return [];
	}
}

/**
 * Fetch tracks for a specific artist
 */
export async function fetchArtistTracks(
	artistId: string,
	limit = 10,
	status = "published",
	signal?: AbortSignal,
): Promise<Track[]> {
	const params = new URLSearchParams({
		page: "1",
		limit: limit.toString(),
		status,
	});

	try {
		const response = await fetchWithTimeout(
			`${API_BASE_URL}/api/artists/${artistId}/tracks?${params}`,
			{
				method: "GET",
				headers: { "Content-Type": "application/json" },
			},
			signal,
		);

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data.tracks || [];
	} catch {
		return [];
	}
}

/**
 * Extended search with related data - fetches artists, tracks, and related content
 * When artists are found, also fetches their albums and tracks
 */
export async function searchWithRelated(
	query: string,
	options: {
		artistLimit?: number;
		trackLimit?: number;
		albumLimit?: number;
		relatedTracksLimit?: number;
	} = {},
	signal?: AbortSignal,
): Promise<ExtendedSearchResult> {
	const {
		artistLimit = 10,
		trackLimit = 30,
		albumLimit = 10,
		relatedTracksLimit = 20,
	} = options;

	if (!query.trim()) {
		return { artists: [], tracks: [], albums: [], relatedTracks: [], query };
	}

	// First, search for artists and tracks in parallel
	const [artistResult, trackResult] = await Promise.all([
		searchArtists(query, artistLimit, signal),
		searchTracks(query, trackLimit, signal),
	]);

	const artists = artistResult.artists;
	const tracks = trackResult.tracks;

	// If we found artists, fetch their albums and additional tracks
	let albums: Album[] = [];
	let relatedTracks: Track[] = [];

	if (artists.length > 0) {
		// Fetch albums and tracks for found artists (limit to first 3 artists for performance)
		const artistsToFetch = artists.slice(0, 3);

		const [albumResults, trackResults] = await Promise.all([
			Promise.all(
				artistsToFetch.map((artist) =>
					fetchArtistAlbums(artist.id, albumLimit, signal),
				),
			),
			Promise.all(
				artistsToFetch.map((artist) =>
					fetchArtistTracks(artist.id, relatedTracksLimit, "published", signal),
				),
			),
		]);

		// Flatten and deduplicate albums
		albums = albumResults.flat();

		// Flatten related tracks and remove duplicates with main search results
		const searchTrackIds = new Set(tracks.map((t) => t.id));
		relatedTracks = trackResults
			.flat()
			.filter((t) => !searchTrackIds.has(t.id));
	}

	return {
		artists,
		tracks,
		albums,
		relatedTracks,
		query,
	};
}
