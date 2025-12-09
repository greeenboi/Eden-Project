/**
 * Track Controller
 * Handles HTTP requests for track operations
 */

import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { handleError } from '../lib/errors'
import { generateSignedUrl } from '../lib/r2'
import {
  CreateTrackRequestSchema,
  ErrorResponseSchema,
  PaginationQuerySchema,
  TrackResponseSchema,
  TrackWithRelationsResponseSchema,
  UpdateTrackRequestSchema,
} from '../models/dtos'
import {
  createTrack,
  deleteTrack,
  getPublishedTracks,
  getTrackWithRelations,
  listTracks,
  searchTracks,
  updateTrack,
  updateTrackStatus
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

type ValidatedContext = Context<{ Bindings: Env }> & {
  req: Context['req'] & { valid: (t: 'json' | 'param' | 'query') => unknown }
}

export async function createTrackHandler(c: ValidatedContext) {
  try {
    const body = c.req.valid('json') as { artistId: string; title: string; albumId?: string; duration?: number; isrc?: string; genre?: string; explicit?: boolean }
    const db = getDb(c.env)
    
    const track = await createTrack(db, c.env, body)
    
    return c.json({
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
    return c.json(body, status)
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

export async function getTrackHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    const trackWithRelations = await getTrackWithRelations(db, c.env, id)
    
    if (!trackWithRelations) {
      return c.json({
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
    
    return c.json(track, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
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
      artistId: z.uuid().optional().openapi({
        param: { name: 'artistId', in: 'query' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      albumId: z.uuid().optional().openapi({
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

export async function listTracksHandler(c: ValidatedContext) {
  try {
    const query = c.req.valid('query') as { page: number; limit: number; artistId?: string; albumId?: string; status?: string }
    const db = getDb(c.env)
    
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
    
    return c.json({
      tracks: transformedTracks,
      pagination: {
        page,
        limit,
        total: tracks.length, // TODO: Implement proper total count
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
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
      id: z.uuid().openapi({
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

export async function updateTrackHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const body = c.req.valid('json') as { title?: string; albumId?: string; duration?: number; isrc?: string; genre?: string; explicit?: boolean }
    const db = getDb(c.env)
    
    const track = await updateTrack(db, c.env, id, body)
    
    return c.json({
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
    return c.json(body, status)
  }
}

/**
 * PATCH /api/tracks/:id/status
 * Update track status
 */
export const updateTrackStatusRoute = createRoute({
  method: 'patch',
  path: '/api/tracks/{id}/status',
  tags: ['Tracks'],
  summary: 'Update track status',
  description: 'Update track status (initiated → uploaded → processing → published)',
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
          schema: z.object({
            status: z.enum(['initiated', 'uploaded', 'processing', 'published']).openapi({
              description: 'New track status',
              example: 'published',
            }),
            encodings: z.record(z.string(), z.string()).optional().openapi({
              description: 'Encoding information (for processing/published status)',
              example: { '320kbps': 'tracks/uuid/320.mp3' },
            }),
            duration: z.number().int().positive().optional().openapi({
              description: 'Track duration in seconds',
              example: 180,
            }),
          }),
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
      description: 'Track status updated successfully',
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

export async function updateTrackStatusHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const body = c.req.valid('json') as { 
      status: 'initiated' | 'uploaded' | 'processing' | 'published' | 'failed'
      encodings?: Record<string, string>
      duration?: number 
    }
    const db = getDb(c.env)
    
    const track = await updateTrackStatus(db, c.env, id, body.status, body)
    
    return c.json({
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
    return c.json(body, status)
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

export async function deleteTrackHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    await deleteTrack(db, c.env, id)
    
    return c.json({
      success: true,
      message: 'Track deleted successfully',
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/tracks/published
 * Get published tracks
 */
export const getPublishedTracksRoute = createRoute({
  method: 'get',
  path: '/api/tracks/published',
  tags: ['Tracks'],
  summary: 'Get published tracks',
  description: 'Get all tracks with published status (streaming-ready)',
  request: {
    query: PaginationQuerySchema.extend({
      artistId: z.uuid().optional().openapi({
        param: { name: 'artistId', in: 'query' },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      albumId: z.uuid().optional().openapi({
        param: { name: 'albumId', in: 'query' },
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
            pagination: z.object({
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
            }),
          }).openapi('PublishedTracksResponse'),
        },
      },
      description: 'Published tracks retrieved successfully',
    },
  },
})

export async function getPublishedTracksHandler(c: ValidatedContext) {
  try {
    const query = c.req.valid('query') as { page: number; limit: number; artistId?: string; albumId?: string }
    const db = getDb(c.env)
    
    const { page, limit, artistId, albumId } = query
    const offset = (page - 1) * limit
    
    const tracks = await getPublishedTracks(db, {
      artistId,
      albumId,
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
    
    return c.json({
      tracks: transformedTracks,
      pagination: {
        page,
        limit,
        total: tracks.length, // TODO: Implement proper total count
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
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

export async function searchTracksHandler(c: ValidatedContext) {
  try {
    const { q: query, limit } = c.req.valid('query') as { q: string; limit: number }
    const db = getDb(c.env)
    
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
    
    return c.json({
      tracks: transformedTracks,
      query,
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/tracks/:id/stream
 * Get streaming URL for a track
 */
export const getTrackStreamRoute = createRoute({
  method: 'get',
  path: '/api/tracks/{id}/stream',
  tags: ['Tracks'],
  summary: 'Get track streaming URL',
  description: 'Generate a signed URL for streaming/downloading a track',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        description: 'Track ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            streamUrl: z.url().openapi({ description: 'Signed streaming URL' }),
            expiresAt: z.iso.datetime().openapi({ description: 'URL expiration timestamp' }),
            expiresIn: z.number().openapi({ description: 'Seconds until expiration' }),
            track: TrackResponseSchema,
          }),
        },
      },
      description: 'Streaming URL generated successfully',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Track not found',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Internal server error',
    },
  },
})

export async function getTrackStreamHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.param()
    const db = getDb(c.env)
    
    // Get track with relations to get all fields
    const track = await getTrackWithRelations(db, c.env, id)
    
    if (!track) {
      return c.json({
        error: 'NotFoundError',
        message: `Track with id '${id}' not found`,
      }, 404)
    }
    
    if (!track.r2KeyOriginal) {
      return c.json({
        error: 'ValidationError',
        message: 'Track does not have an audio file',
      }, 400)
    }
    
    // Generate signed GET URL (valid for 1 hour)
    const { url: streamUrl, expiresAt } = await generateSignedUrl(c.env, {
      key: track.r2KeyOriginal,
      method: 'GET',
      expiresIn: 36 , // 1 hour
    })
    
    const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    
    return c.json({
      streamUrl,
      expiresAt: expiresAt.toISOString(),
      expiresIn,
      track: {
        id: track.id,
        artistId: track.artistId,
        title: track.title,
        duration: track.duration,
        status: track.status,
        r2KeyOriginal: track.r2KeyOriginal,
        encodings: track.encodings,
        isrc: track.isrc,
        genre: track.genre,
        explicit: track.explicit,
        publishedAt: track.publishedAt?.toISOString() || null,
        createdAt: track.createdAt.toISOString(),
        updatedAt: track.updatedAt.toISOString(),
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}
