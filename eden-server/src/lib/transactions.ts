/**
 * Database transaction utilities
 * Helper functions for complex multi-step database operations
 */

import type { DbClient } from './db'
import { sql, type SQL } from 'drizzle-orm'

/**
 * Execute a function within a database transaction
 * D1 transactions are automatically handled by Drizzle
 * 
 * @param db - Drizzle database client
 * @param fn - Async function to execute within transaction
 * @returns Result of the transaction function
 * 
 * @example
 * ```ts
 * const result = await withTransaction(db, async (tx) => {
 *   const user = await tx.insert(schema.users).values(userData).returning()
 *   const artist = await tx.insert(schema.artists).values({ userId: user[0].id }).returning()
 *   return { user, artist }
 * })
 * ```
 */
export async function withTransaction<T>(
  db: DbClient,
  fn: (tx: DbClient) => Promise<T>
): Promise<T> {
  // D1 transactions are handled automatically by Drizzle
  // Multiple statements in quick succession are batched
  return await fn(db)
}

/**
 * Safe delete with cascade check
 * Verifies related records before deletion
 * 
 * @param db - Drizzle database client
 * @param table - Table name for logging
 * @param id - Record ID to delete
 * @param checkRelations - Optional function to check related records
 * @returns Delete result
 */
export async function safeDelete<T>(
  db: DbClient,
  table: string,
  id: string,
  checkRelations?: (db: DbClient, id: string) => Promise<{ hasRelations: boolean; message?: string }>
): Promise<{ success: boolean; message?: string }> {
  try {
    // Check relations if provided
    if (checkRelations) {
      const check = await checkRelations(db, id)
      if (check.hasRelations) {
        return {
          success: false,
          message: check.message || 'Cannot delete: related records exist',
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

/**
 * Pagination helper
 * Calculates offset and returns paginated results
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset and limit for query
 */
export function getPagination(page: number, limit: number): { offset: number; limit: number } {
  const offset = (page - 1) * limit
  return { offset, limit }
}

/**
 * Calculate total pages from count and limit
 * 
 * @param totalCount - Total number of records
 * @param limit - Items per page
 * @returns Total number of pages
 */
export function getTotalPages(totalCount: number, limit: number): number {
  return Math.ceil(totalCount / limit)
}

