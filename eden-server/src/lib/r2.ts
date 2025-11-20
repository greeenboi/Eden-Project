/**
 * R2 Storage utilities for audio file management
 * Handles signed URLs, uploads, and object operations
 */

import type { Env } from './db'
import { StorageError } from './errors'

/**
 * R2 object metadata for uploads
 */
export interface R2ObjectMetadata {
  artistId: string
  trackId?: string
  uploadId: string
  originalFilename: string
  mimeType: string
  uploadedAt: string
}

/**
 * Signed URL configuration
 */
export interface SignedUrlConfig {
  key: string
  method: 'GET' | 'PUT'
  expiresIn: number // seconds
  contentType?: string
  contentLength?: number
}

/**
 * Generate R2 object key with consistent naming pattern
 * Pattern: {artistId}/{type}/{timestamp}_{filename}
 * 
 * @param artistId - Artist UUID
 * @param type - Object type (originals, encodings, artwork)
 * @param filename - Original filename
 * @returns R2 object key
 * 
 * @example
 * ```ts
 * const key = generateR2Key('artist-123', 'originals', 'song.mp3')
 * // Returns: "artist-123/originals/1700000000000_song.mp3"
 * ```
 */
export function generateR2Key(
  artistId: string,
  type: 'originals' | 'encodings' | 'artwork' | 'temp',
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${artistId}/${type}/${timestamp}_${sanitizedFilename}`
}

/**
 * Generate encoding key from original track key
 * 
 * @param originalKey - Original R2 key
 * @param quality - Encoding quality (96kbps, 160kbps, 320kbps, flac)
 * @returns Encoding key
 * 
 * @example
 * ```ts
 * const key = generateEncodingKey('artist-123/originals/file.mp3', '320kbps')
 * // Returns: "artist-123/encodings/file_320kbps.mp3"
 * ```
 */
export function generateEncodingKey(originalKey: string, quality: string): string {
  const parts = originalKey.split('/')
  const filename = parts[parts.length - 1]
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'))
  const artistId = parts[0]
  
  const extension = quality === 'flac' ? 'flac' : 'mp3'
  return `${artistId}/encodings/${nameWithoutExt}_${quality}.${extension}`
}

/**
 * Create HMAC-SHA256 signature for signed URLs
 * 
 * @param secret - Signing secret
 * @param message - Message to sign
 * @returns Hex signature
 */
async function createSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate AWS S3-compatible presigned URL for R2 object access
 * Creates a time-limited URL that works with R2's S3 API
 * 
 * @param env - Cloudflare environment
 * @param config - Signed URL configuration
 * @returns Signed URL and expiration timestamp
 * 
 * @example
 * ```ts
 * const { url, expiresAt } = await generateSignedUrl(env, {
 *   key: 'artist-123/originals/song.mp3',
 *   method: 'PUT',
 *   expiresIn: 3600,
 * })
 * ```
 */
export async function generateSignedUrl(
  env: Env,
  config: SignedUrlConfig
): Promise<{ url: string; expiresAt: Date }> {
  const { key, method, expiresIn, contentType } = config
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  
  // Construct R2 endpoint URL
  const bucketName = 'eden-audio-storage'
  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const url = `${endpoint}/${bucketName}/${key}`
  
  // Import AwsClient dynamically
  const { AwsClient } = await import('aws4fetch')
  
  // Create AWS client with R2 credentials
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })
  
  // Create request for signing
  const headers: Record<string, string> = {}
  if (contentType) {
    headers['Content-Type'] = contentType
  }
  
  // Sign the URL
  const signedRequest = await client.sign(url, {
    method,
    headers,
    aws: {
      signQuery: true,
      datetime: new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
      allHeaders: false,
    },
  })
  
  return {
    url: signedRequest.url,
    expiresAt,
  }
}

/**
 * Verify signed URL signature
 * Used by the signed URL handler to validate requests
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 * @param method - HTTP method
 * @param expires - Expiration timestamp
 * @param signature - Provided signature
 * @param contentType - Optional content type
 * @returns True if signature is valid and not expired
 */
export async function verifySignedUrl(
  env: Env,
  key: string,
  method: string,
  expires: number,
  signature: string,
  contentType?: string
): Promise<boolean> {
  // Check expiration
  if (Date.now() > expires) {
    return false
  }
  
  // Verify signature
  const message = `${method}|${key}|${expires}|${contentType || ''}`
  const expectedSignature = await createSignature(env.R2_SIGNING_SECRET, message)
  
  return signature === expectedSignature
}

/**
 * Upload object to R2 with metadata
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 * @param data - File data (ArrayBuffer, ReadableStream, etc.)
 * @param options - Upload options
 * @returns R2 object info
 */
export async function uploadToR2(
  env: Env,
  key: string,
  data: ReadableStream | ArrayBuffer | string,
  options: {
    contentType?: string
    metadata?: R2ObjectMetadata
  } = {}
): Promise<R2Object> {
  try {
    const { contentType, metadata } = options
    
    const object = await env.EDEN_R2_BUCKET.put(key, data, {
      httpMetadata: contentType ? { contentType } : undefined,
      customMetadata: metadata ? {
        artistId: metadata.artistId,
        trackId: metadata.trackId || '',
        uploadId: metadata.uploadId,
        originalFilename: metadata.originalFilename,
        mimeType: metadata.mimeType,
        uploadedAt: metadata.uploadedAt,
      } : undefined,
    })
    
    if (!object) {
      throw new StorageError('Failed to upload to R2')
    }
    
    return object
  } catch (error) {
    throw new StorageError(
      'R2 upload failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Get object from R2
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 * @returns R2 object with body, or null if not found
 */
export async function getFromR2(
  env: Env,
  key: string
): Promise<R2ObjectBody | null> {
  try {
    const object = await env.EDEN_R2_BUCKET.get(key)
    return object
  } catch (error) {
    throw new StorageError(
      'R2 get failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Check if R2 object exists
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 * @returns True if object exists
 */
export async function r2ObjectExists(
  env: Env,
  key: string
): Promise<boolean> {
  try {
    const object = await env.EDEN_R2_BUCKET.head(key)
    return object !== null
  } catch (error) {
    return false
  }
}

/**
 * Delete object from R2
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 */
export async function deleteFromR2(
  env: Env,
  key: string
): Promise<void> {
  try {
    await env.EDEN_R2_BUCKET.delete(key)
  } catch (error) {
    throw new StorageError(
      'R2 delete failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Delete multiple objects from R2
 * 
 * @param env - Cloudflare environment
 * @param keys - Array of R2 object keys
 */
export async function deleteMultipleFromR2(
  env: Env,
  keys: string[]
): Promise<void> {
  try {
    await env.EDEN_R2_BUCKET.delete(keys)
  } catch (error) {
    throw new StorageError(
      'R2 batch delete failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * List objects in R2 by prefix
 * 
 * @param env - Cloudflare environment
 * @param prefix - Key prefix to filter by
 * @param limit - Maximum number of results
 * @returns List of R2 objects
 */
export async function listR2Objects(
  env: Env,
  prefix: string,
  limit = 1000
): Promise<R2Objects> {
  try {
    const objects = await env.EDEN_R2_BUCKET.list({
      prefix,
      limit,
    })
    return objects
  } catch (error) {
    throw new StorageError(
      'R2 list failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Get R2 object metadata without body
 * 
 * @param env - Cloudflare environment
 * @param key - R2 object key
 * @returns Object metadata or null
 */
export async function getR2ObjectMetadata(
  env: Env,
  key: string
): Promise<R2Object | null> {
  try {
    const object = await env.EDEN_R2_BUCKET.head(key)
    return object
  } catch (error) {
    throw new StorageError(
      'R2 head request failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Copy R2 object to new key
 * 
 * @param env - Cloudflare environment
 * @param sourceKey - Source object key
 * @param destKey - Destination object key
 */
export async function copyR2Object(
  env: Env,
  sourceKey: string,
  destKey: string
): Promise<void> {
  try {
    const source = await env.EDEN_R2_BUCKET.get(sourceKey)
    if (!source) {
      throw new StorageError(`Source object not found: ${sourceKey}`)
    }
    
    await env.EDEN_R2_BUCKET.put(destKey, source.body, {
      httpMetadata: source.httpMetadata,
      customMetadata: source.customMetadata,
    })
  } catch (error) {
    throw new StorageError(
      'R2 copy failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
