/**
 * Track Routes
 * 
 * Registers track-related endpoints to the Hono app.
 * Handles track metadata CRUD, listing, searching, and streaming URL generation.
 */

import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '../lib/db'
import {
  createTrackRoute,
  createTrackHandler,
  getTrackRoute,
  getTrackHandler,
  listTracksRoute,
  listTracksHandler,
  updateTrackRoute,
  updateTrackHandler,
  deleteTrackRoute,
  deleteTrackHandler,
  searchTracksRoute,
  searchTracksHandler,
} from '../controllers/track.controller'

/**
 * Register track routes to the provided Hono app instance
 */
export function registerTrackRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // POST /api/tracks - Create a new track (used internally after upload completion)
  app.openapi(createTrackRoute, createTrackHandler as never)

  // GET /api/tracks/:id - Get track metadata by ID
  app.openapi(getTrackRoute, getTrackHandler as never)

  // GET /api/tracks - List tracks (with optional filtering and pagination)
  app.openapi(listTracksRoute, listTracksHandler as never)

  // PATCH /api/tracks/:id - Update track metadata
  app.openapi(updateTrackRoute, updateTrackHandler as never)

  // DELETE /api/tracks/:id - Delete track and associated R2 objects
  app.openapi(deleteTrackRoute, deleteTrackHandler as never)

  // GET /api/tracks/search - Search tracks by title, artist, or album
  app.openapi(searchTracksRoute, searchTracksHandler as never)
}
