/**
 * Upload Service
 * Business logic for upload initialization, completion, and R2 coordination
 */

import { eq, and } from 'drizzle-orm'
import type { DbClient, Env } from '../lib/db'
import { uploadRecords, tracks } from '../schema'
import type { UploadRecord, NewUploadRecord, NewTrack } from '../models/types'
import { UploadStatus, TrackStatus } from '../models/enums'
import { NotFoundError, ValidationError, UploadError } from '../lib/errors'
import { generateR2Key, generateSignedUrl, r2ObjectExists } from '../lib/r2'
import { setCache, getCache, CachePrefix, CacheTTL } from '../lib/kv'
import { createTrack, updateTrackStatus } from './track.service'

/**
 * Initiate upload session
 * Creates upload record and generates signed PUT URL for R2
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param data - Upload initiation data
 * @returns Upload record with signed URL
 */
export async function initiateUpload(
  db: DbClient,
  env: Env,
  data: {
    artistId: string
    filename: string
    fileSize: number
    mimeType: string
    metadata?: Record<string, unknown>
  }
) {
  const { artistId, filename, fileSize, mimeType, metadata } = data
  
  // Validate file size (max 100MB for now)
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  if (fileSize > MAX_FILE_SIZE) {
    throw new ValidationError(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`)
  }
  
  // Validate MIME type
  const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg']
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new ValidationError(`Unsupported MIME type: ${mimeType}`)
  }
  
  // Generate R2 key for upload
  const r2Key = generateR2Key(artistId, 'originals', filename)
  
  // Create upload record
  const uploadRecord: NewUploadRecord = {
    artistId,
    status: UploadStatus.INITIATED,
    r2Key,
    fileSize,
    mimeType,
    metadata,
  }
  
  const [record] = await db.insert(uploadRecords).values(uploadRecord).returning()
  
  // Generate signed PUT URL (valid for 10 minutes)
  const { url: signedUrl, expiresAt } = await generateSignedUrl(env, {
    key: r2Key,
    method: 'PUT',
    expiresIn: 600, // 10 minutes
    contentType: mimeType,
    contentLength: fileSize,
  })
  
  // Update record with signed URL expiration
  const [updated] = await db
    .update(uploadRecords)
    .set({
      signedUrlExpiresAt: expiresAt,
      status: UploadStatus.UPLOADING,
      updatedAt: new Date(),
    })
    .where(eq(uploadRecords.id, record.id))
    .returning()
  
  // Cache upload record
  await setCache(env, `${CachePrefix.UPLOAD}${record.id}`, updated, CacheTTL.MEDIUM)
  
  return {
    uploadId: record.id,
    signedUrl,
    r2Key,
    expiresAt,
  }
}

/**
 * Complete upload and create track
 * Verifies R2 object exists and creates track record
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param uploadId - Upload record ID
 * @param trackMetadata - Track metadata
 * @returns Created track
 */
export async function completeUpload(
  db: DbClient,
  env: Env,
  uploadId: string,
  trackMetadata: {
    title: string
    albumId?: string
    duration?: number
    isrc?: string
    genre?: string
    explicit?: boolean
  }
) {
  // Get upload record
  const [upload] = await db
    .select()
    .from(uploadRecords)
    .where(eq(uploadRecords.id, uploadId))
    .limit(1)
  
  if (!upload) {
    throw new NotFoundError('Upload', uploadId)
  }
  
  // Check upload status
  if (upload.status !== UploadStatus.UPLOADING) {
    throw new ValidationError(`Upload is in ${upload.status} status, cannot complete`)
  }
  
  // Verify R2 object exists
  if (!upload.r2Key) {
    throw new UploadError('Upload record missing R2 key')
  }
  
  const exists = await r2ObjectExists(env, upload.r2Key)
  if (!exists) {
    // Update upload status to failed
    await db
      .update(uploadRecords)
      .set({
        status: UploadStatus.FAILED,
        errorMessage: 'File not found in R2 storage',
        updatedAt: new Date(),
      })
      .where(eq(uploadRecords.id, uploadId))
    
    throw new UploadError('File not found in R2 storage')
  }
  
  // Create track record
  const trackData: NewTrack = {
    artistId: upload.artistId,
    title: trackMetadata.title,
    albumId: trackMetadata.albumId,
    duration: trackMetadata.duration,
    isrc: trackMetadata.isrc,
    genre: trackMetadata.genre,
    explicit: trackMetadata.explicit ?? false,
    r2KeyOriginal: upload.r2Key,
    status: TrackStatus.UPLOADED,
  }
  
  const track = await createTrack(db, env, trackData)
  
  // Update upload record
  await db
    .update(uploadRecords)
    .set({
      trackId: track.id,
      status: UploadStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(uploadRecords.id, uploadId))
  
  // Update cache
  const updatedUpload = { ...upload, trackId: track.id, status: UploadStatus.COMPLETED }
  await setCache(env, `${CachePrefix.UPLOAD}${uploadId}`, updatedUpload, CacheTTL.LONG)
  
  // TODO: Enqueue transcoding job (will be handled by Durable Objects later)
  
  return track
}

/**
 * Get upload status
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param uploadId - Upload record ID
 * @returns Upload record
 */
export async function getUploadStatus(
  db: DbClient,
  env: Env,
  uploadId: string
): Promise<UploadRecord | null> {
  // Try cache first
  const cached = await getCache<UploadRecord>(env, `${CachePrefix.UPLOAD}${uploadId}`)
  if (cached) {
    return cached
  }
  
  // Query database
  const [upload] = await db
    .select()
    .from(uploadRecords)
    .where(eq(uploadRecords.id, uploadId))
    .limit(1)
  
  if (!upload) {
    return null
  }
  
  // Cache if completed or failed
  if (upload.status === UploadStatus.COMPLETED || upload.status === UploadStatus.FAILED) {
    await setCache(env, `${CachePrefix.UPLOAD}${uploadId}`, upload, CacheTTL.LONG)
  }
  
  return upload
}

/**
 * Fail upload with error message
 * 
 * @param db - Database client
 * @param env - Cloudflare environment
 * @param uploadId - Upload record ID
 * @param errorMessage - Error description
 */
export async function failUpload(
  db: DbClient,
  env: Env,
  uploadId: string,
  errorMessage: string
): Promise<void> {
  await db
    .update(uploadRecords)
    .set({
      status: UploadStatus.FAILED,
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(uploadRecords.id, uploadId))
  
  // Update cache
  const upload = await getUploadStatus(db, env, uploadId)
  if (upload) {
    await setCache(env, `${CachePrefix.UPLOAD}${uploadId}`, upload, CacheTTL.MEDIUM)
  }
}

/**
 * List uploads for an artist
 * 
 * @param db - Database client
 * @param artistId - Artist ID
 * @param limit - Result limit
 * @param offset - Result offset
 * @returns Array of upload records
 */
export async function listUploads(
  db: DbClient,
  artistId: string,
  limit = 20,
  offset = 0
) {
  const results = await db
    .select()
    .from(uploadRecords)
    .where(eq(uploadRecords.artistId, artistId))
    .limit(limit)
    .offset(offset)
  
  return results
}
