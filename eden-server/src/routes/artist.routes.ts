/**
 * Artist Routes
 * 
 * Registers artist-related endpoints to the Hono app.
 * Handles artist profile management, statistics, tracks, and search.
 */

import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from '../lib/db'
import {
  createArtistRoute,
  createArtistHandler,
  getArtistRoute,
  getArtistHandler,
  updateArtistRoute,
  updateArtistHandler,
  deleteArtistRoute,
  deleteArtistHandler,
  listArtistsRoute,
  listArtistsHandler,
  getArtistStatsRoute,
  getArtistStatsHandler,
  getArtistTracksRoute,
  getArtistTracksHandler,
  searchArtistsRoute,
  searchArtistsHandler,
} from '../controllers/artist.controller'

/**
 * Register artist routes to the provided Hono app instance
 */
export function registerArtistRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  // POST /api/artists - Create a new artist
  app.openapi(createArtistRoute, createArtistHandler as never)

  // GET /api/artists/:id - Get artist profile by ID
  app.openapi(getArtistRoute, getArtistHandler as never)

  // PATCH /api/artists/:id - Update artist profile
  app.openapi(updateArtistRoute, updateArtistHandler as never)

  // DELETE /api/artists/:id - Delete artist
  app.openapi(deleteArtistRoute, deleteArtistHandler as never)

  // GET /api/artists - List artists with pagination and filters
  app.openapi(listArtistsRoute, listArtistsHandler as never)

  // GET /api/artists/:id/stats - Get artist statistics
  app.openapi(getArtistStatsRoute, getArtistStatsHandler as never)

  // GET /api/artists/:id/tracks - Get artist's tracks
  app.openapi(getArtistTracksRoute, getArtistTracksHandler as never)

  // GET /api/artists/search - Search artists by name
  app.openapi(searchArtistsRoute, searchArtistsHandler as never)
}
