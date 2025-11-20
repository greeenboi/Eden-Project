/**
 * KV cache utilities for metadata caching and rate limiting
 * Cloudflare KV provides low-latency key-value storage at the edge
 */

import type { Env } from './db'
import { RateLimitError } from './errors'

/**
 * Cache key prefixes for organization
 */
export const CachePrefix = {
  TRACK: 'track:',
  ARTIST: 'artist:',
  ALBUM: 'album:',
  USER: 'user:',
  PLAYLIST: 'playlist:',
  UPLOAD: 'upload:',
  SESSION: 'session:',
  RATE_LIMIT: 'rate:',
} as const

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const

/**
 * Generate cache key with prefix
 * 
 * @param prefix - Cache key prefix
 * @param id - Resource identifier
 * @returns Formatted cache key
 */
export function getCacheKey(prefix: string, id: string): string {
  return `${prefix}${id}`
}

/**
 * Set value in KV cache
 * 
 * @param env - Cloudflare environment
 * @param key - Cache key
 * @param value - Value to cache (will be JSON stringified)
 * @param ttl - Time to live in seconds (optional)
 * 
 * @example
 * ```ts
 * await setCache(env, 'track:123', trackData, CacheTTL.LONG)
 * ```
 */
export async function setCache<T>(
  env: Env,
  key: string,
  value: T,
  ttl?: number
): Promise<void> {
  const serialized = JSON.stringify(value)
  await env.EDEN_KV.put(key, serialized, {
    expirationTtl: ttl,
  })
}

/**
 * Get value from KV cache
 * 
 * @param env - Cloudflare environment
 * @param key - Cache key
 * @returns Cached value or null if not found/expired
 * 
 * @example
 * ```ts
 * const track = await getCache<Track>(env, 'track:123')
 * if (!track) {
 *   // Cache miss - fetch from database
 * }
 * ```
 */
export async function getCache<T>(
  env: Env,
  key: string
): Promise<T | null> {
  const value = await env.EDEN_KV.get(key)
  if (!value) {
    return null
  }
  
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Delete value from KV cache
 * 
 * @param env - Cloudflare environment
 * @param key - Cache key
 */
export async function deleteCache(
  env: Env,
  key: string
): Promise<void> {
  await env.EDEN_KV.delete(key)
}

/**
 * Delete multiple keys from cache
 * 
 * @param env - Cloudflare environment
 * @param keys - Array of cache keys
 */
export async function deleteCacheBatch(
  env: Env,
  keys: string[]
): Promise<void> {
  await Promise.all(keys.map(key => env.EDEN_KV.delete(key)))
}

/**
 * Invalidate all cache entries with a specific prefix
 * Note: KV doesn't support prefix deletion, so this lists and deletes
 * Use sparingly as it can be slow for large datasets
 * 
 * @param env - Cloudflare environment
 * @param prefix - Cache key prefix to invalidate
 */
export async function invalidateCacheByPrefix(
  env: Env,
  prefix: string
): Promise<void> {
  const keys: string[] = []
  let cursor: string | undefined
  
  // List all keys with prefix
  do {
    const result = await env.EDEN_KV.list({ prefix, cursor })
    keys.push(...result.keys.map(k => k.name))
    cursor = result.list_complete ? undefined : result.cursor
  } while (cursor)
  
  // Delete all found keys
  if (keys.length > 0) {
    await deleteCacheBatch(env, keys)
  }
}

/**
 * Get or set cache (cache-aside pattern)
 * Checks cache first, if miss, calls factory function and caches result
 * 
 * @param env - Cloudflare environment
 * @param key - Cache key
 * @param factory - Function to generate value on cache miss
 * @param ttl - Time to live in seconds
 * @returns Cached or freshly generated value
 * 
 * @example
 * ```ts
 * const track = await getOrSetCache(
 *   env,
 *   'track:123',
 *   async () => db.select().from(tracks).where(eq(tracks.id, '123')),
 *   CacheTTL.LONG
 * )
 * ```
 */
export async function getOrSetCache<T>(
  env: Env,
  key: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(env, key)
  if (cached !== null) {
    return cached
  }
  
  // Cache miss - generate value
  const value = await factory()
  
  // Cache the result
  await setCache(env, key, value, ttl)
  
  return value
}

/**
 * Rate limiting using KV
 * Tracks request count per identifier within a time window
 * 
 * @param env - Cloudflare environment
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param limit - Maximum requests allowed
 * @param window - Time window in seconds
 * @returns Object with allowed status and remaining requests
 * 
 * @example
 * ```ts
 * const result = await rateLimit(env, userId, 100, 60) // 100 req/min
 * if (!result.allowed) {
 *   throw new RateLimitError('Rate limit exceeded')
 * }
 * ```
 */
export async function rateLimit(
  env: Env,
  identifier: string,
  limit: number,
  window: number
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const key = getCacheKey(CachePrefix.RATE_LIMIT, identifier)
  
  // Get current count
  const currentData = await getCache<{ count: number; resetAt: number }>(env, key)
  const now = Date.now()
  
  if (!currentData || now > currentData.resetAt) {
    // No existing rate limit or expired - create new
    const resetAt = now + (window * 1000)
    await setCache(
      env,
      key,
      { count: 1, resetAt },
      window
    )
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAt),
    }
  }
  
  // Check if limit exceeded
  if (currentData.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(currentData.resetAt),
    }
  }
  
  // Increment count
  const newCount = currentData.count + 1
  const ttl = Math.ceil((currentData.resetAt - now) / 1000)
  
  await setCache(
    env,
    key,
    { count: newCount, resetAt: currentData.resetAt },
    ttl
  )
  
  return {
    allowed: true,
    remaining: limit - newCount,
    resetAt: new Date(currentData.resetAt),
  }
}

/**
 * Check rate limit without incrementing
 * 
 * @param env - Cloudflare environment
 * @param identifier - Unique identifier
 * @returns Current rate limit status
 */
export async function checkRateLimit(
  env: Env,
  identifier: string
): Promise<{
  count: number
  resetAt: Date | null
}> {
  const key = getCacheKey(CachePrefix.RATE_LIMIT, identifier)
  const data = await getCache<{ count: number; resetAt: number }>(env, key)
  
  if (!data) {
    return { count: 0, resetAt: null }
  }
  
  return {
    count: data.count,
    resetAt: new Date(data.resetAt),
  }
}

/**
 * Reset rate limit for an identifier
 * 
 * @param env - Cloudflare environment
 * @param identifier - Unique identifier
 */
export async function resetRateLimit(
  env: Env,
  identifier: string
): Promise<void> {
  const key = getCacheKey(CachePrefix.RATE_LIMIT, identifier)
  await deleteCache(env, key)
}

/**
 * Session management utilities
 */

/**
 * Set session data in KV
 * 
 * @param env - Cloudflare environment
 * @param sessionId - Session identifier
 * @param data - Session data
 * @param ttl - Session TTL (default: 7 days)
 */
export async function setSession<T>(
  env: Env,
  sessionId: string,
  data: T,
  ttl = CacheTTL.WEEK
): Promise<void> {
  const key = getCacheKey(CachePrefix.SESSION, sessionId)
  await setCache(env, key, data, ttl)
}

/**
 * Get session data from KV
 * 
 * @param env - Cloudflare environment
 * @param sessionId - Session identifier
 * @returns Session data or null if not found/expired
 */
export async function getSession<T>(
  env: Env,
  sessionId: string
): Promise<T | null> {
  const key = getCacheKey(CachePrefix.SESSION, sessionId)
  return await getCache<T>(env, key)
}

/**
 * Delete session from KV
 * 
 * @param env - Cloudflare environment
 * @param sessionId - Session identifier
 */
export async function deleteSession(
  env: Env,
  sessionId: string
): Promise<void> {
  const key = getCacheKey(CachePrefix.SESSION, sessionId)
  await deleteCache(env, key)
}

/**
 * Extend session TTL
 * 
 * @param env - Cloudflare environment
 * @param sessionId - Session identifier
 * @param ttl - New TTL in seconds
 */
export async function extendSession(
  env: Env,
  sessionId: string,
  ttl = CacheTTL.WEEK
): Promise<boolean> {
  const key = getCacheKey(CachePrefix.SESSION, sessionId)
  const data = await getCache(env, key)
  
  if (!data) {
    return false
  }
  
  await setCache(env, key, data, ttl)
  return true
}
