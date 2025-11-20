/**
 * Data Transfer Objects (DTOs) for API requests and responses
 */

import { z } from '@hono/zod-openapi'
import { SubscriptionTier, TrackStatus, UploadStatus } from './enums'

/**
 * ====================
 * User DTOs
 * ====================
 */

export const CreateUserRequestSchema = z.object({
  email: z.email().openapi({ example: 'user@example.com' }),
  name: z.string().optional().openapi({ example: 'John Doe' }),
  subscriptionTier: z.enum(['free', 'premium', 'family', 'student']).default('free'),
  region: z.string().optional().openapi({ example: 'US' }),
}).openapi('CreateUserRequest')

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  subscriptionTier: z.enum(['free', 'premium', 'family', 'student']),
  region: z.string().nullable(),
  deviceLimits: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('UserResponse')

export const UpdateUserRequestSchema = z.object({
  name: z.string().optional(),
  subscriptionTier: z.enum(['free', 'premium', 'family', 'student']).optional(),
  region: z.string().optional(),
}).openapi('UpdateUserRequest')

/**
 * ====================
 * Artist DTOs
 * ====================
 */

export const CreateArtistRequestSchema = z.object({
  name: z.string().min(1).openapi({ example: 'Taylor Swift' }),
  email: z.email().openapi({ example: 'artist@example.com' }),
  profile: z.string().optional().openapi({ example: 'Grammy-winning artist' }),
  bio: z.string().optional().openapi({ example: 'Full biography text...' }),
  avatarUrl: z.url().optional(),
}).openapi('CreateArtistRequest')

export const ArtistResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  profile: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('ArtistResponse')

export const UpdateArtistRequestSchema = z.object({
  name: z.string().optional(),
  profile: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.url().optional(),
}).openapi('UpdateArtistRequest')

export const ArtistStatsResponseSchema = ArtistResponseSchema.extend({
  trackCount: z.number().int(),
  albumCount: z.number().int(),
  totalPlays: z.number().int().optional(),
}).openapi('ArtistStatsResponse')

/**
 * ====================
 * Album DTOs
 * ====================
 */

export const CreateAlbumRequestSchema = z.object({
  artistId: z.uuid(),
  title: z.string().min(1).openapi({ example: 'Midnights' }),
  description: z.string().optional(),
  artworkUrl: z.url().optional(),
  releaseDate: z.iso.datetime().optional(),
}).openapi('CreateAlbumRequest')

export const AlbumResponseSchema = z.object({
  id: z.uuid(),
  artistId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  artworkUrl: z.string().nullable(),
  releaseDate: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('AlbumResponse')

export const UpdateAlbumRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  artworkUrl: z.url().optional(),
  releaseDate: z.iso.datetime().optional(),
}).openapi('UpdateAlbumRequest')

/**
 * ====================
 * Track DTOs
 * ====================
 */

export const TrackEncodingsSchema = z.object({
  '96kbps': z.string().optional(),
  '160kbps': z.string().optional(),
  '320kbps': z.string().optional(),
  flac: z.string().optional(),
}).openapi('TrackEncodings')

export const CreateTrackRequestSchema = z.object({
  artistId: z.uuid(),
  albumId: z.uuid().optional(),
  title: z.string().min(1).openapi({ example: 'Anti-Hero' }),
  duration: z.number().positive().optional().openapi({ example: 200.5 }),
  isrc: z.string().optional().openapi({ example: 'USUG12200123' }),
  genre: z.string().optional().openapi({ example: 'Pop' }),
  explicit: z.boolean().default(false),
}).openapi('CreateTrackRequest')

export const TrackResponseSchema = z.object({
  id: z.uuid(),
  artistId: z.uuid(),
  albumId: z.uuid().nullable(),
  title: z.string(),
  duration: z.number().nullable(),
  r2KeyOriginal: z.string().nullable(),
  encodings: TrackEncodingsSchema.nullable(),
  status: z.enum(['initiated', 'uploaded', 'processing', 'published', 'failed']),
  isrc: z.string().nullable(),
  genre: z.string().nullable(),
  explicit: z.boolean(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('TrackResponse')

export const UpdateTrackRequestSchema = z.object({
  title: z.string().optional(),
  albumId: z.uuid().optional(),
  duration: z.number().positive().optional(),
  isrc: z.string().optional(),
  genre: z.string().optional(),
  explicit: z.boolean().optional(),
}).openapi('UpdateTrackRequest')

export const TrackWithRelationsResponseSchema = TrackResponseSchema.extend({
  artist: ArtistResponseSchema,
  album: AlbumResponseSchema.nullable(),
}).openapi('TrackWithRelationsResponse')

/**
 * ====================
 * Playlist DTOs
 * ====================
 */

export const CreatePlaylistRequestSchema = z.object({
  userId: z.uuid(),
  title: z.string().min(1).openapi({ example: 'My Favorite Songs' }),
  description: z.string().optional(),
  coverUrl: z.url().optional(),
  isPublic: z.boolean().default(true),
}).openapi('CreatePlaylistRequest')

export const PlaylistResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('PlaylistResponse')

export const UpdatePlaylistRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.url().optional(),
  isPublic: z.boolean().optional(),
}).openapi('UpdatePlaylistRequest')

export const AddTrackToPlaylistRequestSchema = z.object({
  trackId: z.uuid(),
  position: z.number().int().min(0).optional(),
}).openapi('AddTrackToPlaylistRequest')

/**
 * ====================
 * Upload DTOs
 * ====================
 */

export const InitiateUploadRequestSchema = z.object({
  artistId: z.uuid(),
  filename: z.string().min(1).openapi({ example: 'song.mp3' }),
  fileSize: z.number().int().positive().openapi({ example: 5242880 }),
  mimeType: z.string().openapi({ example: 'audio/mpeg' }),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('InitiateUploadRequest')

export const InitiateUploadResponseSchema = z.object({
  uploadId: z.uuid(),
  signedUrl: z.url(),
  r2Key: z.string(),
  expiresAt: z.iso.datetime(),
  method: z.enum(['PUT', 'POST']).default('PUT'),
}).openapi('InitiateUploadResponse')

export const CompleteUploadRequestSchema = z.object({
  trackMetadata: z.object({
    title: z.string().min(1),
    albumId: z.uuid().optional(),
    duration: z.number().positive().optional(),
    isrc: z.string().optional(),
    genre: z.string().optional(),
    explicit: z.boolean().default(false),
  }),
}).openapi('CompleteUploadRequest')

export const UploadStatusResponseSchema = z.object({
  uploadId: z.uuid(),
  status: z.enum(['initiated', 'uploading', 'completed', 'failed', 'processing']),
  trackId: z.uuid().nullable(),
  r2Key: z.string().nullable(),
  fileSize: z.number().int().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
}).openapi('UploadStatusResponse')

/**
 * ====================
 * Streaming DTOs
 * ====================
 */

export const StreamUrlResponseSchema = z.object({
  streamUrl: z.url(),
  expiresAt: z.iso.datetime(),
  mimeType: z.string(),
  rangeSupported: z.boolean().default(true),
  duration: z.number().nullable(),
}).openapi('StreamUrlResponse')

export const PlaybackEventRequestSchema = z.object({
  trackId: z.uuid(),
  percentListened: z.number().min(0).max(100),
  duration: z.number().positive(),
}).openapi('PlaybackEventRequest')

/**
 * ====================
 * Common DTOs
 * ====================
 */

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
}).openapi('ErrorResponse')

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
}).openapi('SuccessResponse')

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    param: { name: 'page', in: 'query' },
    example: 1,
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
    param: { name: 'limit', in: 'query' },
    example: 20,
  }),
})

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  })

// Type exports
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

export type CreateArtistRequest = z.infer<typeof CreateArtistRequestSchema>
export type ArtistResponse = z.infer<typeof ArtistResponseSchema>
export type UpdateArtistRequest = z.infer<typeof UpdateArtistRequestSchema>

export type CreateAlbumRequest = z.infer<typeof CreateAlbumRequestSchema>
export type AlbumResponse = z.infer<typeof AlbumResponseSchema>
export type UpdateAlbumRequest = z.infer<typeof UpdateAlbumRequestSchema>

export type CreateTrackRequest = z.infer<typeof CreateTrackRequestSchema>
export type TrackResponse = z.infer<typeof TrackResponseSchema>
export type UpdateTrackRequest = z.infer<typeof UpdateTrackRequestSchema>

export type CreatePlaylistRequest = z.infer<typeof CreatePlaylistRequestSchema>
export type PlaylistResponse = z.infer<typeof PlaylistResponseSchema>
export type UpdatePlaylistRequest = z.infer<typeof UpdatePlaylistRequestSchema>

export type InitiateUploadRequest = z.infer<typeof InitiateUploadRequestSchema>
export type InitiateUploadResponse = z.infer<typeof InitiateUploadResponseSchema>
export type CompleteUploadRequest = z.infer<typeof CompleteUploadRequestSchema>
export type UploadStatusResponse = z.infer<typeof UploadStatusResponseSchema>

export type StreamUrlResponse = z.infer<typeof StreamUrlResponseSchema>
export type PlaybackEventRequest = z.infer<typeof PlaybackEventRequestSchema>

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>
