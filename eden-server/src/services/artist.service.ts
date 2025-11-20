/**
 * Artist Service
 * Business logic for artist profile management and related operations
 */

import { eq, desc, and, sql } from 'drizzle-orm'
import type { DbClient } from '../lib/db'
import { artists, tracks, albums, uploadRecords } from '../schema'
import type { NewArtist, Artist } from '../models/types'
import { NotFoundError, ValidationError } from '../lib/errors'
import { getCache, setCache, deleteCache } from '../lib/kv'
import type { Env } from '../lib/db'

/**
 * Create a new artist
 */
export async function createArtist(
  db: DbClient,
  env: Env,
  data: {
    name: string
    email: string
    profile?: string
    bio?: string
    avatarUrl?: string
  }
): Promise<Artist> {
  const { name, email, profile, bio, avatarUrl } = data

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Artist name is required')
  }

  if (!email || email.trim().length === 0) {
    throw new ValidationError('Artist email is required')
  }

  // Check if email is already taken
  const existing = await db
    .select()
    .from(artists)
    .where(eq(artists.email, email))
    .limit(1)

  if (existing.length > 0) {
    throw new ValidationError(`Artist with email '${email}' already exists`)
  }

  // Create artist record
  const newArtist: NewArtist = {
    name: name.trim(),
    email: email.trim(),
    profile: profile || null,
    bio: bio || null,
    avatarUrl: avatarUrl || null,
    verified: false,
  }

  const [artist] = await db.insert(artists).values(newArtist).returning()

  return artist
}

/**
 * Get artist by ID (with caching)
 */
export async function getArtistById(
  db: DbClient,
  env: Env,
  artistId: string
): Promise<Artist> {
  const cacheKey = `artist:${artistId}`

  // Try cache first
  const cached = await getCache<Artist>(env, cacheKey)
  if (cached) {
    return cached
  }

  // Query database
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1)

  if (!artist) {
    throw new NotFoundError('Artist', artistId)
  }

  // Cache for 1 hour
  await setCache(env, cacheKey, artist, 3600)

  return artist
}

/**
 * Update artist profile
 */
export async function updateArtist(
  db: DbClient,
  env: Env,
  artistId: string,
  updates: {
    name?: string
    email?: string
    profile?: string
    bio?: string
    avatarUrl?: string
    verified?: boolean
  }
): Promise<Artist> {
  // Verify artist exists
  await getArtistById(db, env, artistId)

  // Validate updates
  if (updates.name !== undefined && updates.name.trim().length === 0) {
    throw new ValidationError('Artist name cannot be empty')
  }

  if (updates.email !== undefined && updates.email.trim().length === 0) {
    throw new ValidationError('Artist email cannot be empty')
  }

  // Check email uniqueness if being updated
  if (updates.email) {
    const existing = await db
      .select()
      .from(artists)
      .where(and(eq(artists.email, updates.email), sql`${artists.id} != ${artistId}`))
      .limit(1)

    if (existing.length > 0) {
      throw new ValidationError(`Email '${updates.email}' is already taken`)
    }
  }

  // Build update object (only include defined fields)
  const updateData: Partial<Artist> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) updateData.name = updates.name.trim()
  if (updates.email !== undefined) updateData.email = updates.email.trim()
  if (updates.profile !== undefined) updateData.profile = updates.profile
  if (updates.bio !== undefined) updateData.bio = updates.bio
  if (updates.avatarUrl !== undefined) updateData.avatarUrl = updates.avatarUrl
  if (updates.verified !== undefined) updateData.verified = updates.verified

  // Update in database
  const [updated] = await db
    .update(artists)
    .set(updateData)
    .where(eq(artists.id, artistId))
    .returning()

  // Invalidate cache
  await deleteCache(env, `artist:${artistId}`)

  return updated
}

/**
 * Delete artist (soft delete - keep records but mark as deleted)
 */
export async function deleteArtist(
  db: DbClient,
  env: Env,
  artistId: string
): Promise<void> {
  // Verify artist exists
  await getArtistById(db, env, artistId)

  // Check if artist has published tracks
  const publishedTracks = await db
    .select({ count: sql<number>`count(*)` })
    .from(tracks)
    .where(and(eq(tracks.artistId, artistId), eq(tracks.status, 'published')))

  if (publishedTracks[0]?.count > 0) {
    throw new ValidationError(
      `Cannot delete artist with ${publishedTracks[0].count} published tracks. Unpublish tracks first.`
    )
  }

  // For now, we'll just delete the artist record
  // In production, you might want to soft-delete or archive
  await db.delete(artists).where(eq(artists.id, artistId))

  // Invalidate cache
  await deleteCache(env, `artist:${artistId}`)
}

/**
 * List all artists with pagination
 */
export async function listArtists(
  db: DbClient,
  page = 1,
  limit = 20,
  verified?: boolean
): Promise<{ artists: Artist[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit

  // Build where conditions
  const conditions = []
  if (verified !== undefined) {
    conditions.push(eq(artists.verified, verified))
  }

  // Get artists
  const artistsList = await db
    .select()
    .from(artists)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(artists.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(artists)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return {
    artists: artistsList,
    total: count,
    page,
    limit,
  }
}

/**
 * Get artist statistics (track count, album count, etc.)
 */
export async function getArtistStats(
  db: DbClient,
  env: Env,
  artistId: string
): Promise<{
  totalTracks: number
  publishedTracks: number
  totalAlbums: number
  totalUploads: number
  pendingUploads: number
}> {
  const cacheKey = `artist:stats:${artistId}`

  // Try cache first (5 minute TTL for stats)
  const cached = await getCache<{
    totalTracks: number
    publishedTracks: number
    totalAlbums: number
    totalUploads: number
    pendingUploads: number
  }>(env, cacheKey)

  if (cached) {
    return cached
  }

  // Verify artist exists
  await getArtistById(db, env, artistId)

  // Get track counts
  const [trackStats] = await db
    .select({
      total: sql<number>`count(*)`,
      published: sql<number>`count(case when ${tracks.status} = 'published' then 1 end)`,
    })
    .from(tracks)
    .where(eq(tracks.artistId, artistId))

  // Get album count
  const [albumStats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(albums)
    .where(eq(albums.artistId, artistId))

  // Get upload counts
  const [uploadStats] = await db
    .select({
      total: sql<number>`count(*)`,
      pending: sql<number>`count(case when ${uploadRecords.status} in ('initiated', 'uploading') then 1 end)`,
    })
    .from(uploadRecords)
    .where(eq(uploadRecords.artistId, artistId))

  const stats = {
    totalTracks: trackStats?.total || 0,
    publishedTracks: trackStats?.published || 0,
    totalAlbums: albumStats?.count || 0,
    totalUploads: uploadStats?.total || 0,
    pendingUploads: uploadStats?.pending || 0,
  }

  // Cache for 5 minutes
  await setCache(env, cacheKey, stats, 300)

  return stats
}

/**
 * Get artist's tracks with pagination
 */
export async function getArtistTracks(
  db: DbClient,
  artistId: string,
  page = 1,
  limit = 20,
  statusFilter?: 'initiated' | 'uploaded' | 'processing' | 'published' | 'failed'
): Promise<{ tracks: typeof tracks.$inferSelect[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit

  // Build where conditions
  const conditions = [eq(tracks.artistId, artistId)]
  if (statusFilter) {
    conditions.push(eq(tracks.status, statusFilter))
  }

  // Get tracks
  const tracksList = await db
    .select()
    .from(tracks)
    .where(and(...conditions))
    .orderBy(desc(tracks.createdAt))
    .limit(limit)
    .offset(offset)

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tracks)
    .where(and(...conditions))

  return {
    tracks: tracksList,
    total: count,
    page,
    limit,
  }
}

/**
 * Search artists by name
 */
export async function searchArtists(
  db: DbClient,
  query: string,
  limit = 20
): Promise<Artist[]> {
  if (!query || query.trim().length === 0) {
    throw new ValidationError('Search query is required')
  }

  const searchPattern = `%${query.trim()}%`

  const results = await db
    .select()
    .from(artists)
    .where(sql`${artists.name} LIKE ${searchPattern}`)
    .orderBy(desc(artists.verified), desc(artists.createdAt))
    .limit(limit)

  return results
}
