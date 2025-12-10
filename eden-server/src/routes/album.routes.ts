/**
 * Album Routes
 *
 * Registers album-related endpoints to the Hono app.
 */

import type { OpenAPIHono } from '@hono/zod-openapi'
import {
    createAlbumHandler,
    createAlbumRoute,
    deleteAlbumHandler,
    deleteAlbumRoute,
    getAlbumHandler,
    getAlbumRoute,
    getAlbumTracksHandler,
    getAlbumTracksRoute,
    listAlbumsHandler,
    listAlbumsRoute,
    updateAlbumHandler,
    updateAlbumRoute,
} from '../controllers/album.controller'
import type { Env } from '../lib/db'

export function registerAlbumRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  app.openapi(listAlbumsRoute, listAlbumsHandler as never)
  app.openapi(createAlbumRoute, createAlbumHandler as never)
  app.openapi(getAlbumRoute, getAlbumHandler as never)
  app.openapi(updateAlbumRoute, updateAlbumHandler as never)
  app.openapi(deleteAlbumRoute, deleteAlbumHandler as never)
  app.openapi(getAlbumTracksRoute, getAlbumTracksHandler as never)
}
