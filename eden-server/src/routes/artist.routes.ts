/**
 * Artist Routes
 * 
 * Registers artist-related endpoints to the Hono app.
 * Handles artist profile management, statistics, tracks, and search.
 */

import type { OpenAPIHono } from '@hono/zod-openapi'
import {
  createArtistHandler,
  createArtistRoute,
  deleteArtistHandler,
  deleteArtistRoute,
  getArtistHandler,
  getArtistRoute,
  getArtistStatsHandler,
  getArtistStatsRoute,
  getArtistTracksHandler,
  getArtistTracksRoute,
  listArtistsHandler,
  listArtistsRoute,
  searchArtistsHandler,
  searchArtistsRoute,
  updateArtistHandler,
  updateArtistRoute,
} from '../controllers/artist.controller'
import type { Env } from '../lib/db'

/**
 * Register artist routes to the provided Hono app instance
 */
export function registerArtistRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // Register static/non-param routes first to avoid param shadowing
  // GET /api/artists/search - Search artists by name
  app.openapi(searchArtistsRoute, searchArtistsHandler as never)

  // GET /api/artists - List artists with pagination and filters
  app.openapi(listArtistsRoute, listArtistsHandler as never)

  // POST /api/artists - Create a new artist
  app.openapi(createArtistRoute, createArtistHandler as never)

  // GET /api/artists/:id - Get artist profile by ID
  app.openapi(getArtistRoute, getArtistHandler as never)

  // PATCH /api/artists/:id - Update artist profile
  app.openapi(updateArtistRoute, updateArtistHandler as never)

  // DELETE /api/artists/:id - Delete artist
  app.openapi(deleteArtistRoute, deleteArtistHandler as never)

  // GET /api/artists/:id/stats - Get artist statistics
  app.openapi(getArtistStatsRoute, getArtistStatsHandler as never)

  // GET /api/artists/:id/tracks - Get artist's tracks
  app.openapi(getArtistTracksRoute, getArtistTracksHandler as never)
}
