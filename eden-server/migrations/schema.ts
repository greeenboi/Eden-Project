import { sqliteTable, AnySQLiteColumn, foreignKey, text, integer, uniqueIndex, real } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const albums = sqliteTable("albums", {
	id: text().primaryKey().notNull(),
	artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" } ),
	title: text().notNull(),
	description: text(),
	artworkUrl: text("artwork_url"),
	releaseDate: integer("release_date"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const artists = sqliteTable("artists", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	profile: text(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	verified: integer().default(false).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("artists_email_unique").on(table.email),
]);

export const playbackEvents = sqliteTable("playback_events", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	trackId: text("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" } ),
	percentListened: real("percent_listened").notNull(),
	duration: real().notNull(),
	timestamp: integer().default(sql`(unixepoch())`).notNull(),
});

export const playlistTracks = sqliteTable("playlist_tracks", {
	id: text().primaryKey().notNull(),
	playlistId: text("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" } ),
	trackId: text("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" } ),
	position: integer().notNull(),
	addedAt: integer("added_at").default(sql`(unixepoch())`).notNull(),
});

export const playlists = sqliteTable("playlists", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	title: text().notNull(),
	description: text(),
	coverUrl: text("cover_url"),
	isPublic: integer("is_public").default(true).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const tracks = sqliteTable("tracks", {
	id: text().primaryKey().notNull(),
	artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" } ),
	albumId: text("album_id").references(() => albums.id, { onDelete: "set null" } ),
	title: text().notNull(),
	duration: real(),
	r2KeyOriginal: text("r2_key_original"),
	encodings: text(),
	status: text().default("initiated").notNull(),
	isrc: text(),
	genre: text(),
	explicit: integer().default(false).notNull(),
	publishedAt: integer("published_at"),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
});

export const uploadRecords = sqliteTable("upload_records", {
	id: text().primaryKey().notNull(),
	artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" } ),
	trackId: text("track_id").references(() => tracks.id, { onDelete: "set null" } ),
	status: text().default("initiated").notNull(),
	r2Key: text("r2_key"),
	signedUrlExpiresAt: integer("signed_url_expires_at"),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	errorMessage: text("error_message"),
	metadata: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
	completedAt: integer("completed_at"),
});

export const users = sqliteTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	subscriptionTier: text("subscription_tier").default("free").notNull(),
	region: text(),
	deviceLimits: integer("device_limits").default(1).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`).notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`).notNull(),
},
(table) => [
	uniqueIndex("users_email_unique").on(table.email),
]);

