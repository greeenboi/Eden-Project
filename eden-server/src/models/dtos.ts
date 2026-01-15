/**
 * Data Transfer Objects (DTOs) for API requests and responses
 */

import { z } from "@hono/zod-openapi";
import { createSchemaFactory } from "drizzle-zod";
import {
	albums,
	artists,
	playbackEvents,
	playlistTracks,
	playlists,
	tracks,
	users,
} from "../schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
	createSchemaFactory({
		zodInstance: z,
		coerce: {
			date: true,
		},
	});

const omitTimestamps = { createdAt: true, updatedAt: true } as const;

/**
 * ====================
 * Track encodings helper
 * ====================
 */
export const TrackEncodingsSchema = z
	.object({
		"96kbps": z.string().optional(),
		"160kbps": z.string().optional(),
		"320kbps": z.string().optional(),
		flac: z.string().optional(),
	})
	.openapi("TrackEncodings");

/**
 * ====================
 * User DTOs
 * ====================
 */
export const UserResponseSchema = createSelectSchema(users)
	.omit({ passwordHash: true })
	.openapi("UserResponse");

export const CreateUserRequestSchema = createInsertSchema(users)
	.omit({ id: true, passwordHash: true, ...omitTimestamps })
	.openapi("CreateUserRequest");

export const UpdateUserRequestSchema = createUpdateSchema(users)
	.omit({ id: true, passwordHash: true, ...omitTimestamps })
	.openapi("UpdateUserRequest");

/**
 * ====================
 * Artist DTOs
 * ====================
 */
export const ArtistResponseSchema =
	createSelectSchema(artists).openapi("ArtistResponse");

export const CreateArtistRequestSchema = createInsertSchema(artists)
	.omit({ id: true, verified: true, ...omitTimestamps })
	.openapi("CreateArtistRequest");

export const UpdateArtistRequestSchema = createUpdateSchema(artists)
	.omit({ id: true, verified: true, ...omitTimestamps })
	.openapi("UpdateArtistRequest");

export const ArtistStatsResponseSchema = ArtistResponseSchema.extend({
	trackCount: z.number().int(),
	albumCount: z.number().int(),
	totalPlays: z.number().int().optional(),
}).openapi("ArtistStatsResponse");

/**
 * ====================
 * Album DTOs
 * ====================
 */
export const AlbumResponseSchema =
	createSelectSchema(albums).openapi("AlbumResponse");

export const CreateAlbumRequestSchema = createInsertSchema(albums)
	.omit({ id: true, ...omitTimestamps })
	.openapi("CreateAlbumRequest");

export const UpdateAlbumRequestSchema = createUpdateSchema(albums)
	.omit({ id: true, ...omitTimestamps })
	.openapi("UpdateAlbumRequest");

/**
 * ====================
 * Track DTOs
 * ====================
 */
export const TrackResponseSchema = createSelectSchema(tracks, {
	encodings: () => TrackEncodingsSchema.nullable(),
}).openapi("TrackResponse");

export const CreateTrackRequestSchema = createInsertSchema(tracks)
	.omit({
		id: true,
		r2KeyOriginal: true,
		encodings: true,
		status: true,
		publishedAt: true,
		...omitTimestamps,
	})
	.openapi("CreateTrackRequest");

export const UpdateTrackRequestSchema = createUpdateSchema(tracks)
	.omit({
		id: true,
		r2KeyOriginal: true,
		encodings: true,
		status: true,
		publishedAt: true,
		...omitTimestamps,
	})
	.openapi("UpdateTrackRequest");

export const TrackWithRelationsResponseSchema = TrackResponseSchema.extend({
	artist: ArtistResponseSchema,
	album: AlbumResponseSchema.nullable(),
}).openapi("TrackWithRelationsResponse");

/**
 * ====================
 * Playlist DTOs
 * ====================
 */
export const PlaylistResponseSchema =
	createSelectSchema(playlists).openapi("PlaylistResponse");

export const CreatePlaylistRequestSchema = createInsertSchema(playlists)
	.omit({ id: true, ...omitTimestamps })
	.openapi("CreatePlaylistRequest");

export const UpdatePlaylistRequestSchema = createUpdateSchema(playlists)
	.omit({ id: true, ...omitTimestamps })
	.openapi("UpdatePlaylistRequest");

export const AddTrackToPlaylistRequestSchema = createInsertSchema(
	playlistTracks,
	{
		position: (schema) => schema.min(0),
	},
)
	.omit({ id: true, addedAt: true })
	.openapi("AddTrackToPlaylistRequest");

/**
 * ====================
 * Upload DTOs
 * ====================
 */
export const InitiateUploadRequestSchema = z
	.object({
		artistId: z.uuid(),
		filename: z.string().min(1).openapi({ example: "song.mp3" }),
		fileSize: z.number().int().positive().openapi({ example: 5242880 }),
		mimeType: z.string().openapi({ example: "audio/mpeg" }),
		metadata: z.record(z.string(), z.unknown()).optional(),
	})
	.openapi("InitiateUploadRequest");

export const InitiateUploadResponseSchema = z
	.object({
		uploadId: z.uuid(),
		signedUrl: z.url(),
		r2Key: z.string(),
		expiresAt: z.string().datetime(),
		method: z.enum(["PUT", "POST"]).default("PUT"),
	})
	.openapi("InitiateUploadResponse");

export const CompleteUploadRequestSchema = z
	.object({
		trackMetadata: z.object({
			title: z.string().min(1),
			albumId: z.uuid().optional(),
			duration: z.number().positive().optional(),
			isrc: z.string().optional(),
			genre: z.string().optional(),
			explicit: z.boolean().default(false),
			artworkUrl: z.string().url().optional(),
		}),
	})
	.openapi("CompleteUploadRequest");

export const UploadStatusResponseSchema = z
	.object({
		uploadId: z.string().uuid(),
		status: z.enum([
			"initiated",
			"uploading",
			"completed",
			"failed",
			"processing",
		]),
		trackId: z.string().uuid().nullable(),
		r2Key: z.string().nullable(),
		fileSize: z.number().int().nullable(),
		errorMessage: z.string().nullable(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
		completedAt: z.string().datetime().nullable(),
	})
	.openapi("UploadStatusResponse");

/**
 * ====================
 * Streaming DTOs
 * ====================
 */
export const StreamUrlResponseSchema = z
	.object({
		streamUrl: z.url(),
		expiresAt: z.string().datetime(),
		mimeType: z.string(),
		rangeSupported: z.boolean().default(true),
		duration: z.number().nullable(),
	})
	.openapi("StreamUrlResponse");

export const PlaybackEventRequestSchema = createInsertSchema(playbackEvents)
	.omit({ id: true, timestamp: true })
	.openapi("PlaybackEventRequest");

/**
 * ====================
 * Common DTOs
 * ====================
 */
export const ErrorResponseSchema = z
	.object({
		error: z.string(),
		message: z.string(),
		details: z.unknown().optional(),
	})
	.openapi("ErrorResponse");

export const SuccessResponseSchema = z
	.object({
		success: z.boolean(),
		message: z.string().optional(),
	})
	.openapi("SuccessResponse");

export const PaginationQuerySchema = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
			example: 1,
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(20)
		.openapi({
			param: { name: "limit", in: "query" },
			example: 20,
		}),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
	z.object({
		items: z.array(itemSchema),
		pagination: z.object({
			page: z.number().int(),
			limit: z.number().int(),
			total: z.number().int(),
			totalPages: z.number().int(),
		}),
	});

// Type exports
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export type CreateArtistRequest = z.infer<typeof CreateArtistRequestSchema>;
export type ArtistResponse = z.infer<typeof ArtistResponseSchema>;
export type UpdateArtistRequest = z.infer<typeof UpdateArtistRequestSchema>;

export type CreateAlbumRequest = z.infer<typeof CreateAlbumRequestSchema>;
export type AlbumResponse = z.infer<typeof AlbumResponseSchema>;
export type UpdateAlbumRequest = z.infer<typeof UpdateAlbumRequestSchema>;

export type CreateTrackRequest = z.infer<typeof CreateTrackRequestSchema>;
export type TrackResponse = z.infer<typeof TrackResponseSchema>;
export type UpdateTrackRequest = z.infer<typeof UpdateTrackRequestSchema>;

export type CreatePlaylistRequest = z.infer<typeof CreatePlaylistRequestSchema>;
export type PlaylistResponse = z.infer<typeof PlaylistResponseSchema>;
export type UpdatePlaylistRequest = z.infer<typeof UpdatePlaylistRequestSchema>;

export type InitiateUploadRequest = z.infer<typeof InitiateUploadRequestSchema>;
export type InitiateUploadResponse = z.infer<
	typeof InitiateUploadResponseSchema
>;
export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequestSchema>;
export type UploadStatusResponse = z.infer<typeof UploadStatusResponseSchema>;

export type StreamUrlResponse = z.infer<typeof StreamUrlResponseSchema>;
export type PlaybackEventRequest = z.infer<typeof PlaybackEventRequestSchema>;

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
