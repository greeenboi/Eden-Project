/**
 * Album Controller
 * Handles HTTP requests for album operations
 */

import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { handleError } from '../lib/errors'
import { serializeDate, serializeDateOrNull } from '../lib/utils'
import {
  AlbumResponseSchema,
  CreateAlbumRequestSchema,
  ErrorResponseSchema,
  PaginationQuerySchema,
  TrackResponseSchema,
  UpdateAlbumRequestSchema,
} from '../models/dtos'
import {
  createAlbum,
  deleteAlbum,
  getAlbumTracks,
  getAlbumWithRelations,
  listAlbums,
  updateAlbum,
} from '../services/album.service'

const transformAlbum = <T extends { releaseDate: Date | string | null; createdAt: Date | string; updatedAt: Date | string }>(album: T) => ({
  ...album,
  releaseDate: serializeDateOrNull(album.releaseDate),
  createdAt: serializeDate(album.createdAt),
  updatedAt: serializeDate(album.updatedAt),
})

const transformArtist = <T extends { createdAt: Date | string; updatedAt: Date | string }>(artist: T) => ({
  ...artist,
  createdAt: serializeDate(artist.createdAt),
  updatedAt: serializeDate(artist.updatedAt),
})

const transformTrack = <T extends { publishedAt: Date | string | null; createdAt: Date | string; updatedAt: Date | string }>(track: T) => ({
  ...track,
  publishedAt: serializeDateOrNull(track.publishedAt),
  createdAt: serializeDate(track.createdAt),
  updatedAt: serializeDate(track.updatedAt),
})

type ValidatedContext = Context<{ Bindings: Env }> & {
  req: Context['req'] & { valid: (t: 'json' | 'param' | 'query') => unknown }
}

/**
 * POST /api/albums
 */
export const createAlbumRoute = createRoute({
  method: 'post',
  path: '/api/albums',
  tags: ['Albums'],
  summary: 'Create album',
  description: 'Create a new album for an artist',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAlbumRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AlbumResponseSchema,
        },
      },
      description: 'Album created successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid request data',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
  },
})

export async function createAlbumHandler(c: ValidatedContext) {
  try {
    const body = c.req.valid('json') as z.infer<typeof CreateAlbumRequestSchema>
    const db = getDb(c.env)

    const album = await createAlbum(db, c.env, body)

    return c.json(transformAlbum(album), 201)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/albums/{id}
 */
export const getAlbumRoute = createRoute({
  method: 'get',
  path: '/api/albums/{id}',
  tags: ['Albums'],
  summary: 'Get album',
  description: 'Get album by ID with artist and tracks',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            album: AlbumResponseSchema,
            artist: z.object({
              id: z.uuid(),
              name: z.string(),
              bio: z.string().nullable(),
              avatarUrl: z.string().nullable(),
              verified: z.boolean(),
              createdAt: z.string().datetime(),
              updatedAt: z.string().datetime(),
            }),
            tracks: z.array(TrackResponseSchema),
          }).openapi('AlbumDetailResponse'),
        },
      },
      description: 'Album retrieved successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Album not found',
    },
  },
})

export async function getAlbumHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)

    const album = await getAlbumWithRelations(db, c.env, id)

    return c.json({
      album: transformAlbum(album),
      artist: transformArtist(album.artist),
      tracks: album.tracks.map(transformTrack),
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/albums
 */
export const listAlbumsRoute = createRoute({
  method: 'get',
  path: '/api/albums',
  tags: ['Albums'],
  summary: 'List albums',
  description: 'List albums with optional artist filter and pagination',
  request: {
    query: PaginationQuerySchema.extend({
      artistId: z.uuid().optional().openapi({
        param: { name: 'artistId', in: 'query' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            albums: z.array(AlbumResponseSchema),
            pagination: z.object({
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
            }),
          }).openapi('ListAlbumsResponse'),
        },
      },
      description: 'Albums retrieved successfully',
    },
  },
})

export async function listAlbumsHandler(c: ValidatedContext) {
  try {
    const { page, limit, artistId } = c.req.valid('query') as { page: number; limit: number; artistId?: string }
    const db = getDb(c.env)

    const offset = (page - 1) * limit
    const rows = await listAlbums(db, c.env, { artistId, limit, offset })

    return c.json({
      albums: rows.map(transformAlbum),
      pagination: {
        page,
        limit,
        total: rows.length, // TODO: add total count
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * PATCH /api/albums/{id}
 */
export const updateAlbumRoute = createRoute({
  method: 'patch',
  path: '/api/albums/{id}',
  tags: ['Albums'],
  summary: 'Update album',
  description: 'Update album metadata',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateAlbumRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AlbumResponseSchema,
        },
      },
      description: 'Album updated successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Album not found',
    },
  },
})

export async function updateAlbumHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const body = c.req.valid('json') as z.infer<typeof UpdateAlbumRequestSchema>
    const db = getDb(c.env)

    const album = await updateAlbum(db, c.env, id, body)

    return c.json(transformAlbum(album), 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * DELETE /api/albums/{id}
 */
export const deleteAlbumRoute = createRoute({
  method: 'delete',
  path: '/api/albums/{id}',
  tags: ['Albums'],
  summary: 'Delete album',
  description: 'Delete an album. Tracks will remain but lose album association.',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Album deleted successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Album not found',
    },
  },
})

export async function deleteAlbumHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)

    await deleteAlbum(db, c.env, id)

    return c.json({ success: true, message: 'Album deleted successfully' }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/albums/{id}/tracks
 */
export const getAlbumTracksRoute = createRoute({
  method: 'get',
  path: '/api/albums/{id}/tracks',
  tags: ['Albums'],
  summary: 'Get album tracks',
  description: 'Get all tracks within an album',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            tracks: z.array(TrackResponseSchema),
          }).openapi('AlbumTracksResponse'),
        },
      },
      description: 'Album tracks retrieved successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Album not found',
    },
  },
})

export async function getAlbumTracksHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)

    const tracks = await getAlbumTracks(db, c.env, id)

    return c.json({ tracks: tracks.map(transformTrack) }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}
