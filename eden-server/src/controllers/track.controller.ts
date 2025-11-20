/**
 * Track Controller
 * Handles HTTP requests for track operations
 */

import { createRoute, z } from '@hono/zod-openapi'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { handleError } from '../lib/errors'
import {
  CreateTrackRequestSchema,
  TrackResponseSchema,
  TrackWithRelationsResponseSchema,
  UpdateTrackRequestSchema,
  ErrorResponseSchema,
  PaginationQuerySchema,
} from '../models/dtos'
import {
  createTrack,
  getTrackById,
  getTrackWithRelations,
  listTracks,
  updateTrack,
  updateTrackStatus,
  deleteTrack,
  getPublishedTracks,
  searchTracks,
} from '../services/track.service'

/**
 * POST /api/tracks
 * Create a new track
 */
export const createTrackRoute = createRoute({
  method: 'post',
  path: '/api/tracks',
  tags: ['Tracks'],
  summary: 'Create track',
  description: 'Create a new track record',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTrackRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: TrackResponseSchema,
        },
      },
      description: 'Track created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request data',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Artist or Album not found',
    },
  },
})

export async function createTrackHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const body = ctx.req.valid('json') as { artistId: string; title: string; albumId?: string; duration?: number; isrc?: string; genre?: string; explicit?: boolean }
    const db = getDb(ctx.env)
    
    const track = await createTrack(db, ctx.env, body)
    
    return ctx.json({
      id: track.id,
      artistId: track.artistId,
      albumId: track.albumId,
      title: track.title,
      duration: track.duration,
      r2KeyOriginal: track.r2KeyOriginal,
      encodings: track.encodings,
      status: track.status,
      isrc: track.isrc,
      genre: track.genre,
      explicit: track.explicit,
      publishedAt: track.publishedAt?.toISOString() || null,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    }, 201)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}

/**
 * GET /api/tracks/:id
 * Get track by ID with relations
 */
export const getTrackRoute = createRoute({
  method: 'get',
  path: '/api/tracks/{id}',
  tags: ['Tracks'],
  summary: 'Get track',
  description: 'Get track by ID with artist and album information',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TrackWithRelationsResponseSchema,
        },
      },
      description: 'Track retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Track not found',
    },
  },
})

export async function getTrackHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const { id } = ctx.req.valid('param') as { id: string }
    const db = getDb(ctx.env)
    
    const trackWithRelations = await getTrackWithRelations(db, ctx.env, id)
    
    if (!trackWithRelations) {
      return ctx.json({
        error: 'NotFoundError',
        message: `Track with id '${id}' not found`,
      }, 404)
    }
    
    // Transform dates to ISO strings
    const track = {
      ...trackWithRelations,
      publishedAt: trackWithRelations.publishedAt?.toISOString() || null,
      createdAt: trackWithRelations.createdAt.toISOString(),
      updatedAt: trackWithRelations.updatedAt.toISOString(),
      artist: trackWithRelations.artist ? {
        ...trackWithRelations.artist,
        createdAt: trackWithRelations.artist.createdAt.toISOString(),
        updatedAt: trackWithRelations.artist.updatedAt.toISOString(),
      } : null,
      album: trackWithRelations.album ? {
        ...trackWithRelations.album,
        releaseDate: trackWithRelations.album.releaseDate?.toISOString() || null,
        createdAt: trackWithRelations.album.createdAt.toISOString(),
        updatedAt: trackWithRelations.album.updatedAt.toISOString(),
      } : null,
    }
    
    return ctx.json(track, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}

/**
 * GET /api/tracks
 * List tracks with filters
 */
export const listTracksRoute = createRoute({
  method: 'get',
  path: '/api/tracks',
  tags: ['Tracks'],
  summary: 'List tracks',
  description: 'List tracks with optional filters',
  request: {
    query: PaginationQuerySchema.extend({
      artistId: z.string().uuid().optional().openapi({
        param: { name: 'artistId', in: 'query' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      albumId: z.string().uuid().optional().openapi({
        param: { name: 'albumId', in: 'query' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      status: z.string().optional().openapi({
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
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
            }),
          }).openapi('ListTracksResponse'),
        },
      },
      description: 'Tracks retrieved successfully',
    },
  },
})

export async function listTracksHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const query = ctx.req.valid('query') as { page: number; limit: number; artistId?: string; albumId?: string; status?: string }
    const db = getDb(ctx.env)
    
    const { page, limit, artistId, albumId, status } = query
    const offset = (page - 1) * limit
    
    const tracks = await listTracks(db, {
      artistId,
      albumId,
      status,
      limit,
      offset,
    })
    
    // Transform tracks
    const transformedTracks = tracks.map(track => ({
      id: track.id,
      artistId: track.artistId,
      albumId: track.albumId,
      title: track.title,
      duration: track.duration,
      r2KeyOriginal: track.r2KeyOriginal,
      encodings: track.encodings,
      status: track.status,
      isrc: track.isrc,
      genre: track.genre,
      explicit: track.explicit,
      publishedAt: track.publishedAt?.toISOString() || null,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    }))
    
    return ctx.json({
      tracks: transformedTracks,
      pagination: {
        page,
        limit,
        total: tracks.length, // TODO: Implement proper total count
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}

/**
 * PATCH /api/tracks/:id
 * Update track metadata
 */
export const updateTrackRoute = createRoute({
  method: 'patch',
  path: '/api/tracks/{id}',
  tags: ['Tracks'],
  summary: 'Update track',
  description: 'Update track metadata',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: { name: 'id', in: 'path' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTrackRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: TrackResponseSchema,
        },
      },
      description: 'Track updated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Track not found',
    },
  },
})

export async function updateTrackHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const { id } = ctx.req.valid('param') as { id: string }
    const body = ctx.req.valid('json') as { title?: string; albumId?: string; duration?: number; isrc?: string; genre?: string; explicit?: boolean }
    const db = getDb(ctx.env)
    
    const track = await updateTrack(db, ctx.env, id, body)
    
    return ctx.json({
      id: track.id,
      artistId: track.artistId,
      albumId: track.albumId,
      title: track.title,
      duration: track.duration,
      r2KeyOriginal: track.r2KeyOriginal,
      encodings: track.encodings,
      status: track.status,
      isrc: track.isrc,
      genre: track.genre,
      explicit: track.explicit,
      publishedAt: track.publishedAt?.toISOString() || null,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}

/**
 * DELETE /api/tracks/:id
 * Delete track
 */
export const deleteTrackRoute = createRoute({
  method: 'delete',
  path: '/api/tracks/{id}',
  tags: ['Tracks'],
  summary: 'Delete track',
  description: 'Delete track and associated R2 objects',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
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
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: 'Track deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Track not found',
    },
  },
})

export async function deleteTrackHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const { id } = ctx.req.valid('param') as { id: string }
    const db = getDb(ctx.env)
    
    await deleteTrack(db, ctx.env, id)
    
    return ctx.json({
      success: true,
      message: 'Track deleted successfully',
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}

/**
 * GET /api/tracks/search
 * Search tracks
 */
export const searchTracksRoute = createRoute({
  method: 'get',
  path: '/api/tracks/search',
  tags: ['Tracks'],
  summary: 'Search tracks',
  description: 'Search tracks by title',
  request: {
    query: z.object({
      q: z.string().min(1).openapi({
        param: { name: 'q', in: 'query' },
        example: 'Anti-Hero',
      }),
      limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
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
            tracks: z.array(TrackResponseSchema),
            query: z.string(),
          }).openapi('SearchTracksResponse'),
        },
      },
      description: 'Search results',
    },
  },
})

export async function searchTracksHandler(c: unknown) {
  const ctx = c as { req: { valid: (t: string) => unknown }; env: Env; json: (data: unknown, status?: number) => unknown }
  try {
    const { q: query, limit } = ctx.req.valid('query') as { q: string; limit: number }
    const db = getDb(ctx.env)
    
    const tracks = await searchTracks(db, query, limit)
    
    // Transform tracks
    const transformedTracks = tracks.map(track => ({
      id: track.id,
      artistId: track.artistId,
      albumId: track.albumId,
      title: track.title,
      duration: track.duration,
      r2KeyOriginal: track.r2KeyOriginal,
      encodings: track.encodings,
      status: track.status,
      isrc: track.isrc,
      genre: track.genre,
      explicit: track.explicit,
      publishedAt: track.publishedAt?.toISOString() || null,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    }))
    
    return ctx.json({
      tracks: transformedTracks,
      query,
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return ctx.json(body, status)
  }
}
