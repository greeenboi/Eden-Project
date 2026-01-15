import { relations } from "drizzle-orm/relations";
import {
	artists,
	albums,
	tracks,
	playbackEvents,
	users,
	playlistTracks,
	playlists,
	uploadRecords,
} from "./schema";

export const albumsRelations = relations(albums, ({ one, many }) => ({
	artist: one(artists, {
		fields: [albums.artistId],
		references: [artists.id],
	}),
	tracks: many(tracks),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
	albums: many(albums),
	tracks: many(tracks),
	uploadRecords: many(uploadRecords),
}));

export const playbackEventsRelations = relations(playbackEvents, ({ one }) => ({
	track: one(tracks, {
		fields: [playbackEvents.trackId],
		references: [tracks.id],
	}),
	user: one(users, {
		fields: [playbackEvents.userId],
		references: [users.id],
	}),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
	playbackEvents: many(playbackEvents),
	playlistTracks: many(playlistTracks),
	album: one(albums, {
		fields: [tracks.albumId],
		references: [albums.id],
	}),
	artist: one(artists, {
		fields: [tracks.artistId],
		references: [artists.id],
	}),
	uploadRecords: many(uploadRecords),
}));

export const usersRelations = relations(users, ({ many }) => ({
	playbackEvents: many(playbackEvents),
	playlists: many(playlists),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
	track: one(tracks, {
		fields: [playlistTracks.trackId],
		references: [tracks.id],
	}),
	playlist: one(playlists, {
		fields: [playlistTracks.playlistId],
		references: [playlists.id],
	}),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
	playlistTracks: many(playlistTracks),
	user: one(users, {
		fields: [playlists.userId],
		references: [users.id],
	}),
}));

export const uploadRecordsRelations = relations(uploadRecords, ({ one }) => ({
	track: one(tracks, {
		fields: [uploadRecords.trackId],
		references: [tracks.id],
	}),
	artist: one(artists, {
		fields: [uploadRecords.artistId],
		references: [artists.id],
	}),
}));
