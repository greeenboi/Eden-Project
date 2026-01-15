/**
 * Album Service
 * Business logic for album management (CRUD + relations)
 */

import { and, desc, eq } from "drizzle-orm";
import type { DbClient, Env } from "../lib/db";
import { NotFoundError, ValidationError } from "../lib/errors";
import type {
	Album,
	AlbumWithRelations,
	NewAlbum,
	Track,
} from "../models/types";
import { albums, artists, tracks } from "../schema";

/**
 * Create a new album
 */
export async function createAlbum(
	db: DbClient,
	env: Env,
	data: NewAlbum,
): Promise<Album> {
	const artist = await db
		.select()
		.from(artists)
		.where(eq(artists.id, data.artistId))
		.limit(1);
	if (!artist.length) {
		throw new NotFoundError("Artist", data.artistId);
	}

	// Basic validation
	if (!data.title || data.title.trim().length === 0) {
		throw new ValidationError("Album title is required");
	}

	const [album] = await db
		.insert(albums)
		.values({
			...data,
			title: data.title.trim(),
		})
		.returning();

	return album;
}

/**
 * Get album by ID
 */
export async function getAlbumById(
	db: DbClient,
	env: Env,
	id: string,
): Promise<Album> {
	const [album] = await db
		.select()
		.from(albums)
		.where(eq(albums.id, id))
		.limit(1);
	if (!album) {
		throw new NotFoundError("Album", id);
	}
	return album;
}

/**
 * Get album with artist and tracks
 */
export async function getAlbumWithRelations(
	db: DbClient,
	env: Env,
	id: string,
): Promise<AlbumWithRelations> {
	const result = await db
		.select({ album: albums, artist: artists })
		.from(albums)
		.leftJoin(artists, eq(albums.artistId, artists.id))
		.where(eq(albums.id, id))
		.limit(1);

	if (!result.length || !result[0].album) {
		throw new NotFoundError("Album", id);
	}

	const albumRow = result[0];
	if (!albumRow.artist) {
		throw new NotFoundError("Artist", id);
	}
	const albumTracks = await db
		.select()
		.from(tracks)
		.where(eq(tracks.albumId, id))
		.orderBy(desc(tracks.createdAt));

	return {
		...albumRow.album,
		artist: albumRow.artist,
		tracks: albumTracks as Track[],
	};
}

/**
 * List albums with optional filters
 */
export async function listAlbums(
	db: DbClient,
	env: Env,
	filters: {
		artistId?: string;
		limit?: number;
		offset?: number;
	} = {},
) {
	const { artistId, limit = 20, offset = 0 } = filters;

	const conditions = [] as Array<ReturnType<typeof eq>>;
	if (artistId) {
		conditions.push(eq(albums.artistId, artistId));
	}

	const rows = await db
		.select()
		.from(albums)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(albums.createdAt))
		.limit(limit)
		.offset(offset);

	return rows;
}

/**
 * Update album
 */
export async function updateAlbum(
	db: DbClient,
	env: Env,
	id: string,
	updates: Partial<NewAlbum>,
): Promise<Album> {
	const existing = await getAlbumById(db, env, id);

	if (updates.title !== undefined && updates.title.trim().length === 0) {
		throw new ValidationError("Album title cannot be empty");
	}

	const updateData: Partial<Album> = {
		...updates,
		title: updates.title !== undefined ? updates.title.trim() : undefined,
		updatedAt: new Date(),
	};

	const [updated] = await db
		.update(albums)
		.set(updateData)
		.where(eq(albums.id, existing.id))
		.returning();

	return updated;
}

/**
 * Delete album
 */
export async function deleteAlbum(
	db: DbClient,
	env: Env,
	id: string,
): Promise<void> {
	await getAlbumById(db, env, id);
	await db.delete(albums).where(eq(albums.id, id));
}

/**
 * Get tracks for an album
 */
export async function getAlbumTracks(
	db: DbClient,
	env: Env,
	id: string,
): Promise<Track[]> {
	await getAlbumById(db, env, id);

	const rows = await db
		.select()
		.from(tracks)
		.where(eq(tracks.albumId, id))
		.orderBy(desc(tracks.createdAt));

	return rows as Track[];
}
