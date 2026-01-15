import { API_BASE_URL } from "../../constants/constants";

/**
 * Artist profile information
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
 */
export interface ArtistPagination {
	page: number;
	limit: number;
	total: number;
}

/**
 * Statistical data for an artist's content
 */
export interface ArtistStatistics {
	totalTracks: number;
	publishedTracks: number;
	totalAlbums: number;
	totalUploads: number;
	pendingUploads: number;
}

/**
 * Track information associated with an artist
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
	coverUrl: string;
	status: "initiated" | "uploaded" | "processing" | "published" | "failed";
	createdAt: string;
	updatedAt: string;
}

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 15000;

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
 * Fetch paginated list of artists
 */
export async function fetchArtists(
	page = 1,
	limit = 20,
	verified: boolean | null = null,
	signal?: AbortSignal,
): Promise<{ artists: Artist[]; pagination: ArtistPagination }> {
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
	});

	if (verified !== null) {
		params.append("verified", verified.toString());
	}

	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/artists?${params}`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch artists");
	}

	return response.json();
}

/**
 * Fetch a single artist by ID
 */
export async function fetchArtistById(
	id: string,
	signal?: AbortSignal,
): Promise<Artist> {
	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/artists/${id}`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error("Artist not found");
		}
		throw new Error("Failed to fetch artist");
	}

	return response.json();
}

/**
 * Fetch artist statistics
 */
export async function fetchArtistStats(
	id: string,
	signal?: AbortSignal,
): Promise<ArtistStatistics> {
	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/artists/${id}/stats`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error("Artist not found");
		}
		throw new Error("Failed to fetch artist statistics");
	}

	return response.json();
}

/**
 * Fetch paginated tracks for an artist
 */
export async function fetchArtistTracks(
	id: string,
	page = 1,
	limit = 20,
	status?: string,
	signal?: AbortSignal,
): Promise<{ tracks: Track[]; pagination: ArtistPagination }> {
	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString(),
	});

	if (status) {
		params.append("status", status);
	}

	const response = await fetchWithTimeout(
		`${API_BASE_URL}/api/artists/${id}/tracks?${params}`,
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		},
		signal,
	);

	if (!response.ok) {
		if (response.status === 404) {
			throw new Error("Artist not found");
		}
		throw new Error("Failed to fetch artist tracks");
	}

	return response.json();
}

/**
 * Search artists by name
 */
export async function searchArtists(
	query: string,
	limit = 20,
	signal?: AbortSignal,
): Promise<{ artists: Artist[] }> {
	const params = new URLSearchParams({
		q: query,
		limit: limit.toString(),
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
