/**
 * Core type definitions and re-exports from schema
 */

import type {
	User,
	NewUser,
	Artist,
	NewArtist,
	Album,
	NewAlbum,
	Track,
	NewTrack,
	Playlist,
	NewPlaylist,
	PlaylistTrack,
	NewPlaylistTrack,
	UploadRecord,
	NewUploadRecord,
	PlaybackEvent,
	NewPlaybackEvent,
} from "../schema";

// Re-export schema types
export type {
	User,
	NewUser,
	Artist,
	NewArtist,
	Album,
	NewAlbum,
	Track,
	NewTrack,
	Playlist,
	NewPlaylist,
	PlaylistTrack,
	NewPlaylistTrack,
	UploadRecord,
	NewUploadRecord,
	PlaybackEvent,
	NewPlaybackEvent,
};

/**
 * Track with populated relationships
 */
export interface TrackWithRelations extends Track {
	artist: Artist;
	album?: Album | null;
}

/**
 * Album with tracks and artist
 */
export interface AlbumWithRelations extends Album {
	artist: Artist;
	tracks: Track[];
}

/**
 * Playlist with tracks
 */
export interface PlaylistWithTracks extends Playlist {
	tracks: Array<{
		track: Track;
		position: number;
		addedAt: Date;
	}>;
	trackCount: number;
}

/**
 * Artist with statistics
 */
export interface ArtistWithStats extends Artist {
	trackCount: number;
	albumCount: number;
	totalPlays?: number;
}

/**
 * Track encodings structure stored in JSON
 */
export interface TrackEncodings {
	"96kbps"?: string;
	"160kbps"?: string;
	"320kbps"?: string;
	flac?: string;
}

/**
 * Upload metadata structure
 */
export interface UploadMetadata {
	originalFilename?: string;
	contentLength?: number;
	checksumMd5?: string;
	userAgent?: string;
	ipAddress?: string;
}
