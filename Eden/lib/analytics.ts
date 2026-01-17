import { customEvent } from "vexo-analytics";

/**
 * Centralized analytics module for tracking user events.
 * All events are fire-and-forget to avoid blocking the UI.
 * Vexo automatically enriches events with device, OS, app version, and screen context.
 */

// ============ Playback Events ============

export const trackPlay = (trackId: string, title: string, source: string) => {
	customEvent("track-play", { trackId, title, source });
};

export const trackPlayWithQueue = (
	trackId: string,
	title: string,
	queueSource: string,
	queueSize: number,
	position: number,
) => {
	customEvent("track-play-queue", {
		trackId,
		title,
		queueSource,
		queueSize,
		position,
	});
};

export const queueTrackRemoved = (trackId: string, title: string) => {
	customEvent("queue-track-removed", { trackId, title });
};

export const queueCleared = (trackCount: number) => {
	customEvent("queue-cleared", { trackCount });
};

// ============ Search Events ============

export const searchPerformed = (
	query: string,
	searchType: string,
	resultsCount: {
		artists: number;
		tracks: number;
		albums: number;
	},
) => {
	customEvent("search", {
		query,
		searchType,
		artistResults: resultsCount.artists,
		trackResults: resultsCount.tracks,
		albumResults: resultsCount.albums,
		totalResults:
			resultsCount.artists + resultsCount.tracks + resultsCount.albums,
	});
};

export const searchCleared = () => {
	customEvent("search-cleared", {});
};

// ============ Navigation Events ============

export const artistViewed = (artistId: string, artistName: string) => {
	customEvent("artist-viewed", { artistId, artistName });
};

export const albumViewed = (albumId: string, albumTitle: string) => {
	customEvent("album-viewed", { albumId, albumTitle });
};

export const albumPlayStarted = (
	albumId: string,
	albumTitle: string,
	trackCount: number,
) => {
	customEvent("album-play-started", { albumId, albumTitle, trackCount });
};

// ============ Settings Events ============

export const settingChanged = (
	settingName: string,
	newValue: boolean | string,
) => {
	customEvent("setting-changed", { settingName, newValue: String(newValue) });
};

export const bugReportSubmitted = (title: string) => {
	customEvent("bug-report-submitted", { title });
};

// ============ Auth Events ============
// Note: identifyDevice is already called in auth-store.ts

export const authSuccess = (method: "login" | "signup") => {
	customEvent("auth-success", { method });
};

export const authFailed = (method: "login" | "signup", errorMessage: string) => {
	customEvent("auth-failed", { method, errorMessage });
};

export const userLoggedOut = () => {
	customEvent("user-logout", {});
};

// ============ Content Interaction Events ============

export const tracksLoaded = (count: number, source: string) => {
	customEvent("tracks-loaded", { count, source });
};

export const tracksRefreshed = (count: number) => {
	customEvent("tracks-refreshed", { count });
};

export const loadMoreTriggered = (page: number, source: string) => {
	customEvent("load-more", { page, source });
};
