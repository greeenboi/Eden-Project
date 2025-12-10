/**
 * Artist Controller
 * Handles HTTP requests for artist operations
 */

import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { handleError } from '../lib/errors'
import {
  ArtistResponseSchema,
  CreateArtistRequestSchema,
  ErrorResponseSchema,
  PaginationQuerySchema,
  TrackResponseSchema,
  UpdateArtistRequestSchema,
} from '../models/dtos'
import {
  createArtist,
  deleteArtist,
  getArtistById,
  getArtistStats,
  getArtistTracks,
  listArtists,
  searchArtists,
  updateArtist,
} from '../services/artist.service'

/**
 * POST /api/artists
 * Create a new artist
 */
export const createArtistRoute = createRoute({
  method: 'post',
  path: '/api/artists',
  tags: ['Artists'],
  summary: 'Create artist',
  description: 'Register a new artist profile',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateArtistRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ArtistResponseSchema,
        },
      },
      description: 'Artist created successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid request data',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

type ValidatedContext = Context<{ Bindings: Env }> & {
  req: Context['req'] & { valid: (t: 'json' | 'param' | 'query') => unknown }
}

export const createArtistHandler = async (c: ValidatedContext) => {
  try {
    const body = c.req.valid('json') as z.infer<typeof CreateArtistRequestSchema>
    const db = getDb(c.env)
    
    const artist = await createArtist(db, c.env, body)
    
    return c.json({
      ...artist,
      createdAt: artist.createdAt?.toISOString() || '',
      updatedAt: artist.updatedAt?.toISOString() || '',
    }, 201)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists/:id
 * Get artist by ID
 */
export const getArtistRoute = createRoute({
  method: 'get',
  path: '/api/artists/{id}',
  tags: ['Artists'],
  summary: 'Get artist',
  description: 'Retrieve artist profile by ID',
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
          schema: ArtistResponseSchema,
        },
      },
      description: 'Artist retrieved successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const getArtistHandler = async (c: ValidatedContext) => {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    const artist = await getArtistById(db, c.env, id)
    
    return c.json({
      ...artist,
      createdAt: artist.createdAt.toISOString(),
      updatedAt: artist.updatedAt.toISOString(),
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * PATCH /api/artists/:id
 * Update artist profile
 */
export const updateArtistRoute = createRoute({
  method: 'patch',
  path: '/api/artists/{id}',
  tags: ['Artists'],
  summary: 'Update artist',
  description: 'Update artist profile information',
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
          schema: UpdateArtistRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ArtistResponseSchema,
        },
      },
      description: 'Artist updated successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid request data',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const updateArtistHandler = async (c: ValidatedContext) => {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const body = c.req.valid('json') as z.infer<typeof UpdateArtistRequestSchema>
    const db = getDb(c.env)
    
    const artist = await updateArtist(db, c.env, id, body)
    
    return c.json({
      ...artist,
      createdAt: artist.createdAt.toISOString(),
      updatedAt: artist.updatedAt.toISOString(),
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * DELETE /api/artists/:id
 * Delete artist
 */
export const deleteArtistRoute = createRoute({
  method: 'delete',
  path: '/api/artists/{id}',
  tags: ['Artists'],
  summary: 'Delete artist',
  description: 'Delete an artist profile (only if no published tracks)',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    204: {
      description: 'Artist deleted successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Cannot delete artist with published tracks',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const deleteArtistHandler = async (c: ValidatedContext) => {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    await deleteArtist(db, c.env, id)
    
    return c.json({ success: true }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists
 * List artists with pagination
 */
export const listArtistsRoute = createRoute({
  method: 'get',
  path: '/api/artists',
  tags: ['Artists'],
  summary: 'List artists',
  description: 'Get paginated list of artists',
  request: {
    query: PaginationQuerySchema.extend({
      verified: z.coerce.boolean().optional().openapi({
        param: { name: 'verified', in: 'query' },
        example: true,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            artists: z.array(ArtistResponseSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
      description: 'Artists retrieved successfully',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const listArtistsHandler = async (c: ValidatedContext) => {
  try {
    const { page, limit, verified } = c.req.valid('query') as { page: number; limit: number; verified?: boolean }
    const db = getDb(c.env)
    
    const result = await listArtists(db, page, limit, verified)
    
    return c.json({
      artists: result.artists.map(artist => ({
        ...artist,
        createdAt: artist.createdAt.toISOString(),
        updatedAt: artist.updatedAt.toISOString(),
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists/:id/stats
 * Get artist statistics
 */
export const getArtistStatsRoute = createRoute({
  method: 'get',
  path: '/api/artists/{id}/stats',
  tags: ['Artists'],
  summary: 'Get artist statistics',
  description: 'Get track counts, album counts, and upload statistics for an artist',
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
            totalTracks: z.number(),
            publishedTracks: z.number(),
            totalAlbums: z.number(),
            totalUploads: z.number(),
            pendingUploads: z.number(),
          }),
        },
      },
      description: 'Statistics retrieved successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const getArtistStatsHandler = async (c: ValidatedContext) => {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    const stats = await getArtistStats(db, c.env, id)
    
    return c.json(stats, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists/:id/tracks
 * Get artist's tracks
 */
export const getArtistTracksRoute = createRoute({
  method: 'get',
  path: '/api/artists/{id}/tracks',
  tags: ['Artists'],
  summary: 'Get artist tracks',
  description: 'Get all tracks by an artist with pagination',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
    query: PaginationQuerySchema.extend({
      status: z.enum(['initiated', 'uploaded', 'processing', 'published', 'failed']).optional().openapi({
        param: { name: 'status', in: 'query' },
        example: 'published',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            tracks: z.array(TrackResponseSchema),
            pagination: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
            }),
          }),
        },
      },
      description: 'Tracks retrieved successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Artist not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const getArtistTracksHandler = async (c: ValidatedContext) => {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const query = c.req.valid('query') as { page: number; limit: number; status?: 'initiated' | 'uploaded' | 'processing' | 'published' | 'failed' }
    const db = getDb(c.env)
    
    const result = await getArtistTracks(db, id, query.page, query.limit, query.status)
    
    return c.json({
      tracks: result.tracks.map(track => ({
        ...track,
        createdAt: track.createdAt.toISOString(),
        updatedAt: track.updatedAt.toISOString(),
        publishedAt: track.publishedAt?.toISOString() || null,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists/search
 * Search artists
 */
export const searchArtistsRoute = createRoute({
  method: 'get',
  path: '/api/artists/search',
  tags: ['Artists'],
  summary: 'Search artists',
  description: 'Search for artists by name',
  request: {
    query: z.object({
      q: z.string().min(1).openapi({
        param: { name: 'q', in: 'query' },
        example: 'Artist',
      }),
      limit: z.coerce.number().int().min(1).max(50).default(20).openapi({
        param: { name: 'limit', in: 'query' },
        example: 20,
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            artists: z.array(ArtistResponseSchema),
            query: z.string(),
          }),
        },
      },
      description: 'Search results retrieved successfully',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid search query',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export const searchArtistsHandler = async (c: ValidatedContext) => {
  try {
    const { q, limit } = c.req.valid('query') as { q: string; limit: number }
    const db = getDb(c.env)
    
    const artists = await searchArtists(db, q, limit)
    
    return c.json({
      artists: artists.map(artist => ({
        ...artist,
        createdAt: artist.createdAt.toISOString(),
        updatedAt: artist.updatedAt.toISOString(),
      })),
      query: q,
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}
