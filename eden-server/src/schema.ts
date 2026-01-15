import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Users Table
 * Stores user accounts, subscriptions, and regional settings
 */
export const users = sqliteTable("users", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash"),
	name: text("name"),
	subscriptionTier: text("subscription_tier", {
		enum: ["free", "premium", "family", "student"],
	})
		.notNull()
		.default("free"),
	region: text("region"),
	deviceLimits: integer("device_limits").notNull().default(1),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Artists Table
 * Stores artist profiles and metadata
 */
export const artists = sqliteTable("artists", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull(),
	bio: text("bio"), // Full biography
	avatarUrl: text("avatar_url"),
	verified: integer("verified", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Albums Table
 * Stores album information and artwork
 */
export const albums = sqliteTable("albums", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	artistId: text("artist_id")
		.notNull()
		.references(() => artists.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	artworkUrl: text("artwork_url"),
	releaseDate: integer("release_date", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Tracks Table
 * Stores song metadata, R2 references, and encoding information
 */
export const tracks = sqliteTable("tracks", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	artistId: text("artist_id")
		.notNull()
		.references(() => artists.id, { onDelete: "cascade" }),
	albumId: text("album_id").references(() => albums.id, {
		onDelete: "set null",
	}),
	artworkUrl: text("artwork_url"),
	title: text("title").notNull(),
	duration: real("duration"), // Duration in seconds
	r2KeyOriginal: text("r2_key_original"), // R2 object key for original upload
	// JSON structure: { "96kbps": "key", "160kbps": "key", "320kbps": "key" }
	encodings: text("encodings", { mode: "json" }).$type<
		Record<string, string>
	>(),
	status: text("status", {
		enum: ["initiated", "uploaded", "processing", "published", "failed"],
	})
		.notNull()
		.default("initiated"),
	isrc: text("isrc"), // International Standard Recording Code
	genre: text("genre"),
	explicit: integer("explicit", { mode: "boolean" }).notNull().default(false),
	publishedAt: integer("published_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Playlists Table
 * Stores user-created and curated playlists
 */
export const playlists = sqliteTable("playlists", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	description: text("description"),
	coverUrl: text("cover_url"),
	isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Playlist Tracks Junction Table
 * Many-to-many relationship between playlists and tracks
 */
export const playlistTracks = sqliteTable("playlist_tracks", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	playlistId: text("playlist_id")
		.notNull()
		.references(() => playlists.id, { onDelete: "cascade" }),
	trackId: text("track_id")
		.notNull()
		.references(() => tracks.id, { onDelete: "cascade" }),
	position: integer("position").notNull(), // Order in playlist
	addedAt: integer("added_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Upload Records Table
 * Tracks upload sessions and status for artist uploads to R2
 */
export const uploadRecords = sqliteTable("upload_records", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	artistId: text("artist_id")
		.notNull()
		.references(() => artists.id, { onDelete: "cascade" }),
	trackId: text("track_id").references(() => tracks.id, {
		onDelete: "set null",
	}),
	status: text("status", {
		enum: ["initiated", "uploading", "completed", "failed", "processing"],
	})
		.notNull()
		.default("initiated"),
	r2Key: text("r2_key"), // Target R2 object key
	signedUrlExpiresAt: integer("signed_url_expires_at", { mode: "timestamp" }),
	fileSize: integer("file_size"), // File size in bytes
	mimeType: text("mime_type"),
	errorMessage: text("error_message"),
	metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(), // Additional upload metadata
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	completedAt: integer("completed_at", { mode: "timestamp" }),
});

/**
 * Playback Events Table
 * Tracks user listening history and analytics (optional for analytics)
 */
export const playbackEvents = sqliteTable("playback_events", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	trackId: text("track_id")
		.notNull()
		.references(() => tracks.id, { onDelete: "cascade" }),
	percentListened: real("percent_listened").notNull(), // 0-100
	duration: real("duration").notNull(), // Seconds listened
	timestamp: integer("timestamp", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// Export types for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;

export type Album = typeof albums.$inferSelect;
export type NewAlbum = typeof albums.$inferInsert;

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;

export type UploadRecord = typeof uploadRecords.$inferSelect;
export type NewUploadRecord = typeof uploadRecords.$inferInsert;

export type PlaybackEvent = typeof playbackEvents.$inferSelect;
export type NewPlaybackEvent = typeof playbackEvents.$inferInsert;
