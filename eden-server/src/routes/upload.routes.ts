/**
 * Upload Routes
 * 
 * Registers upload-related endpoints to the Hono app.
 * Handles file upload initiation, completion, status tracking, and listing.
 */

import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '../lib/db'
import {
  initiateUploadRoute,
  initiateUploadHandler,
  completeUploadRoute,
  completeUploadHandler,
  getUploadStatusRoute,
  getUploadStatusHandler,
  listUploadsRoute,
  listUploadsHandler,
} from '../controllers/upload.controller'

/**
 * Register upload routes to the provided Hono app instance
 */
export function registerUploadRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // POST /api/uploads/initiate - Initialize upload and get signed PUT URL
  app.openapi(initiateUploadRoute, initiateUploadHandler as never)

  // POST /api/uploads/:id/complete - Complete upload after client uploads to R2
  app.openapi(completeUploadRoute, completeUploadHandler as never)

  // GET /api/uploads/:id/status - Check upload processing status
  app.openapi(getUploadStatusRoute, getUploadStatusHandler as never)

  // GET /api/uploads - List uploads (with optional filtering)
  app.openapi(listUploadsRoute, listUploadsHandler as never)
}
