/**
 * Database connection and utilities for D1 with Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as schema from '../schema'

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  eden_db_main: D1Database
  EDEN_R2_BUCKET: R2Bucket
  EDEN_KV: KVNamespace
  // Secrets
  JWT_SECRET: string
  R2_SIGNING_SECRET: string
  // Optional
  ENVIRONMENT?: 'development' | 'staging' | 'production'
}

/**
 * Drizzle database client type with schema
 */
export type DbClient = DrizzleD1Database<typeof schema>

/**
 * Initialize Drizzle client with D1 database binding
 * 
 * @param d1 - D1Database binding from Cloudflare Workers environment
 * @returns Configured Drizzle client with schema
 * 
 * @example
 * ```ts
 * const db = initDb(c.env.eden_db_main)
 * const users = await db.select().from(schema.users)
 * ```
 */
export function initDb(d1: D1Database): DbClient {
  return drizzle(d1, { schema })
}

/**
 * Get database client from Hono context
 * Convenience helper for use in route handlers
 * 
 * @param env - Cloudflare environment bindings
 * @returns Configured Drizzle client
 * 
 * @example
 * ```ts
 * app.get('/users', async (c) => {
 *   const db = getDb(c.env)
 *   const users = await db.select().from(schema.users)
 *   return c.json(users)
 * })
 * ```
 */
export function getDb(env: Env): DbClient {
  return initDb(env.eden_db_main)
}

/**
 * Validate database connection
 * Runs a simple query to ensure D1 is accessible
 * 
 * @param db - D1Database binding from Cloudflare Workers environment
 * @returns Promise resolving to true if connection is valid
 * @throws Error if connection fails
 */
export async function validateDbConnection(db: D1Database): Promise<boolean> {
  try {
    // Simple query to test connection using D1 prepare API
    await db.prepare('SELECT 1 as test').first()
    return true
  } catch (error) {
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get database health status
 * Returns detailed information about database connectivity
 * 
 * @param db - D1Database binding from Cloudflare Workers environment
 * @returns Health status object
 */
export async function getDbHealth(db: D1Database): Promise<{
  healthy: boolean
  latencyMs: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    await db.prepare('SELECT 1').first()
    const latencyMs = Date.now() - startTime
    
    return {
      healthy: true,
      latencyMs,
    }
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Re-export schema for convenience
export { schema }

// Import sql for raw queries
import { sql } from 'drizzle-orm'
export { sql }
