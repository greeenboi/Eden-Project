/**
 * Track Service
 * Business logic for track management, CRUD operations, and status transitions
 */

import { eq, and, desc, sql } from 'drizzle-orm'
import type { DbClient } from '../lib/db'
import type { Env } from '../lib/db'
import { tracks, artists, albums } from '../schema'
import type { Track, NewTrack } from '../models/types'
import { TrackStatus } from '../models/enums'
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors'
import { getCache, setCache, deleteCache, CachePrefix, CacheTTL } from '../lib/kv'
import { deleteFromR2, deleteMultipleFromR2 } from '../lib/r2'

/**
 * Create a new track
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param data - Track data
 * @returns Created track
 */
export async function createTrack(
  db: DbClient,
  env: Env,
  data: NewTrack
): Promise<Track> {
  // Validate artist exists
  const artist = await db.select().from(artists).where(eq(artists.id, data.artistId)).limit(1)
  if (!artist.length) {
    throw new NotFoundError('Artist', data.artistId)
  }
  
  // Validate album if provided
  if (data.albumId) {
    const album = await db.select().from(albums).where(eq(albums.id, data.albumId)).limit(1)
    if (!album.length) {
      throw new NotFoundError('Album', data.albumId)
    }
  }
  
  // Insert track
  const [track] = await db.insert(tracks).values(data).returning()
  
  return track
}

/**
 * Get track by ID
 * Uses cache when possible
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param id - Track ID
 * @returns Track or null if not found
 */
export async function getTrackById(
  db: DbClient,
  env: Env,
  id: string
): Promise<Track | null> {
  const cacheKey = `${CachePrefix.TRACK}${id}`
  
  // Try cache first
  const cached = await getCache<Track>(env, cacheKey)
  if (cached) {
    return cached
  }
  
  // Query database
  const [track] = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1)
  
  if (!track) {
    return null
  }
  
  // Cache for 1 hour if published
  if (track.status === TrackStatus.PUBLISHED) {
    await setCache(env, cacheKey, track, CacheTTL.LONG)
  }
  
  return track
}

/**
 * Get track by ID with related data (artist, album)
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param id - Track ID
 * @returns Track with relations or null
 */
export async function getTrackWithRelations(
  db: DbClient,
  env: Env,
  id: string
) {
  const track = await db
    .select({
      track: tracks,
      artist: artists,
      album: albums,
    })
    .from(tracks)
    .leftJoin(artists, eq(tracks.artistId, artists.id))
    .leftJoin(albums, eq(tracks.albumId, albums.id))
    .where(eq(tracks.id, id))
    .limit(1)
  
  if (!track.length) {
    return null
  }
  
  return {
    ...track[0].track,
    artist: track[0].artist,
    album: track[0].album,
  }
}

/**
 * List tracks with optional filters
 * 
 * @param db - Database client
 * @param filters - Filter options
 * @returns Array of tracks
 */
export async function listTracks(
  db: DbClient,
  filters: {
    artistId?: string
    albumId?: string
    status?: string
    limit?: number
    offset?: number
  } = {}
) {
  const { artistId, albumId, status, limit = 20, offset = 0 } = filters
  
  const conditions = []
  if (artistId) {
    conditions.push(eq(tracks.artistId, artistId))
  }
  if (albumId) {
    conditions.push(eq(tracks.albumId, albumId))
  }
  if (status) {
    conditions.push(sql`${tracks.status} = ${status}`)
  }
  
  if (conditions.length === 0) {
    // No filters
    const results = await db
      .select()
      .from(tracks)
      .orderBy(desc(tracks.createdAt))
      .limit(limit)
      .offset(offset)
    
    return results
  }
  
  // With filters
  const results = await db
    .select()
    .from(tracks)
    .where(and(...conditions))
    .orderBy(desc(tracks.createdAt))
    .limit(limit)
    .offset(offset)
  
  return results
}

/**
 * Update track metadata
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param id - Track ID
 * @param data - Updated track data
 * @returns Updated track
 */
export async function updateTrack(
  db: DbClient,
  env: Env,
  id: string,
  data: Partial<NewTrack>
): Promise<Track> {
  // Verify track exists
  const existing = await getTrackById(db, env, id)
  if (!existing) {
    throw new NotFoundError('Track', id)
  }
  
  // Validate album if being updated
  if (data.albumId) {
    const album = await db.select().from(albums).where(eq(albums.id, data.albumId)).limit(1)
    if (!album.length) {
      throw new NotFoundError('Album', data.albumId)
    }
  }
  
  // Update track
  const [updated] = await db
    .update(tracks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tracks.id, id))
    .returning()
  
  // Invalidate cache
  await deleteCache(env, `${CachePrefix.TRACK}${id}`)
  
  return updated
}

/**
 * Update track status
 * Handles status transitions: initiated -> uploaded -> processing -> published | failed
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param id - Track ID
 * @param newStatus - New status
 * @param additionalData - Additional data to update (e.g., encodings, publishedAt)
 * @returns Updated track
 */
export async function updateTrackStatus(
  db: DbClient,
  env: Env,
  id: string,
  newStatus: string,
  additionalData: Partial<NewTrack> = {}
): Promise<Track> {
  const track = await getTrackById(db, env, id)
  if (!track) {
    throw new NotFoundError('Track', id)
  }
  
  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    [TrackStatus.INITIATED]: [TrackStatus.UPLOADED, TrackStatus.FAILED],
    [TrackStatus.UPLOADED]: [TrackStatus.PROCESSING, TrackStatus.FAILED],
    [TrackStatus.PROCESSING]: [TrackStatus.PUBLISHED, TrackStatus.FAILED],
    [TrackStatus.PUBLISHED]: [TrackStatus.PROCESSING], // Allow re-processing
    [TrackStatus.FAILED]: [TrackStatus.UPLOADED, TrackStatus.PROCESSING], // Allow retry
  }
  
  const allowedTransitions = validTransitions[track.status] || []
  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(
      `Invalid status transition from ${track.status} to ${newStatus}`
    )
  }
  
  // Prepare update data
  const updateData: Partial<NewTrack> = {
    ...additionalData,
    status: newStatus as typeof TrackStatus[keyof typeof TrackStatus],
  }
  
  // Set publishedAt when publishing
  if (newStatus === TrackStatus.PUBLISHED && !track.publishedAt) {
    updateData.publishedAt = new Date()
  }
  
  // Update track
  const [updated] = await db
    .update(tracks)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(tracks.id, id))
    .returning()
  
  // Invalidate cache
  await deleteCache(env, `${CachePrefix.TRACK}${id}`)
  
  return updated
}

/**
 * Delete track and associated R2 objects
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param id - Track ID
 * @returns True if deleted successfully
 */
export async function deleteTrack(
  db: DbClient,
  env: Env,
  id: string
): Promise<boolean> {
  const track = await getTrackById(db, env, id)
  if (!track) {
    throw new NotFoundError('Track', id)
  }
  
  // Collect R2 keys to delete
  const keysToDelete: string[] = []
  
  if (track.r2KeyOriginal) {
    keysToDelete.push(track.r2KeyOriginal)
  }
  
  if (track.encodings) {
    const encodingKeys = Object.values(track.encodings).filter(Boolean) as string[]
    keysToDelete.push(...encodingKeys)
  }
  
  // Delete from R2
  if (keysToDelete.length > 0) {
    await deleteMultipleFromR2(env, keysToDelete)
  }
  
  // Delete from database
  await db.delete(tracks).where(eq(tracks.id, id))
  
  // Invalidate cache
  await deleteCache(env, `${CachePrefix.TRACK}${id}`)
  
  return true
}

/**
 * Count tracks for an artist
 * 
 * @param db - Database client
 * @param artistId - Artist ID
 * @returns Track count
 */
export async function countTracksByArtist(
  db: DbClient,
  artistId: string
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tracks)
    .where(eq(tracks.artistId, artistId))
  
  return result[0]?.count ?? 0
}

/**
 * Count tracks for an album
 * 
 * @param db - Database client
 * @param albumId - Album ID
 * @returns Track count
 */
export async function countTracksByAlbum(
  db: DbClient,
  albumId: string
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(tracks)
    .where(eq(tracks.albumId, albumId))
  
  return result[0]?.count ?? 0
}

/**
 * Get published tracks for streaming
 * Only returns tracks with published status and valid encodings
 * 
 * @param db - Database client
 * @param filters - Filter options
 * @returns Array of published tracks
 */
export async function getPublishedTracks(
  db: DbClient,
  filters: {
    artistId?: string
    albumId?: string
    limit?: number
    offset?: number
  } = {}
) {
  const { artistId, albumId, limit = 20, offset = 0 } = filters
  
  const conditions = [eq(tracks.status, TrackStatus.PUBLISHED)]
  
  if (artistId) {
    conditions.push(eq(tracks.artistId, artistId))
  }
  if (albumId) {
    conditions.push(eq(tracks.albumId, albumId))
  }
  
  const results = await db
    .select()
    .from(tracks)
    .where(and(...conditions))
    .orderBy(desc(tracks.publishedAt))
    .limit(limit)
    .offset(offset)
  
  return results
}

/**
 * Search tracks by title
 * 
 * @param db - Database client
 * @param query - Search query
 * @param limit - Result limit
 * @returns Array of matching tracks
 */
export async function searchTracks(
  db: DbClient,
  query: string,
  limit = 20
) {
  const searchPattern = `%${query}%`
  const results = await db
    .select()
    .from(tracks)
    .where(sql`lower(${tracks.title}) LIKE lower(${searchPattern})`)
    .limit(limit)
  
  return results
}
