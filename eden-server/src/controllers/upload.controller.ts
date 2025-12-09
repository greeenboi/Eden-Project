/**
 * Upload Controller
 * Handles HTTP requests for upload operations
 */

import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { handleError } from '../lib/errors'
import {
  CompleteUploadRequestSchema,
  ErrorResponseSchema,
  InitiateUploadRequestSchema,
  InitiateUploadResponseSchema,
  UploadStatusResponseSchema,
} from '../models/dtos'
import {
  completeUpload,
  getUploadStatus,
  initiateUpload,
  listUploads,
} from '../services/upload.service'

/**
 * POST /api/uploads/initiate
 * Initialize upload and get signed PUT URL
 */
export const initiateUploadRoute = createRoute({
  method: 'post',
  path: '/api/uploads/initiate',
  tags: ['Uploads'],
  summary: 'Initiate file upload',
  description: 'Creates an upload session and returns a signed PUT URL for uploading to R2',
  request: {
    body: {
      content: {
        'application/json': {
          schema: InitiateUploadRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: InitiateUploadResponseSchema,
        },
      },
      description: 'Upload session created successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request data',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

type ValidatedContext = Context<{ Bindings: Env }> & {
  req: Context['req'] & { valid: (t: 'json' | 'param' | 'query') => unknown }
}

export async function initiateUploadHandler(c: ValidatedContext) {
  try {
    const body = c.req.valid('json') as { artistId: string; filename: string; fileSize: number; mimeType: string; metadata?: Record<string, unknown> }
    const db = getDb(c.env)
    
    const result = await initiateUpload(db, c.env, {
      artistId: body.artistId,
      filename: body.filename,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      metadata: body.metadata,
    })
    
    return c.json(result, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * POST /api/uploads/:id/complete
 * Complete upload after file is uploaded to R2
 */
export const completeUploadRoute = createRoute({
  method: 'post',
  path: '/api/uploads/{id}/complete',
  tags: ['Uploads'],
  summary: 'Complete upload',
  description: 'Verifies R2 upload and creates track record',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: CompleteUploadRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            trackId: z.uuid(),
            message: z.string(),
          }).openapi('CompleteUploadResponse'),
        },
      },
      description: 'Upload completed successfully',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid request or upload not found',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Upload record not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

export async function completeUploadHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const body = c.req.valid('json') as { trackMetadata: { title: string; albumId?: string; duration?: number; isrc?: string; genre?: string; explicit?: boolean } }
    const db = getDb(c.env)
    
    const track = await completeUpload(db, c.env, id, body.trackMetadata)
    
    return c.json({
      success: true,
      trackId: track.id,
      message: 'Upload completed successfully. Track is now being processed.',
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/uploads/:id/status
 * Get upload status
 */
export const getUploadStatusRoute = createRoute({
  method: 'get',
  path: '/api/uploads/{id}/status',
  tags: ['Uploads'],
  summary: 'Get upload status',
  description: 'Check the current status of an upload',
  request: {
    params: z.object({
      id: z.uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UploadStatusResponseSchema,
        },
      },
      description: 'Upload status retrieved successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Upload not found',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

export async function getUploadStatusHandler(c: ValidatedContext) {
  try {
    const { id } = c.req.valid('param') as { id: string }
    const db = getDb(c.env)
    
    const upload = await getUploadStatus(db, c.env, id)
    
    if (!upload) {
      return c.json({
        error: 'NotFoundError',
        message: `Upload with id '${id}' not found`,
      }, 404)
    }
    
    return c.json({
      uploadId: upload.id,
      status: upload.status,
      trackId: upload.trackId,
      r2Key: upload.r2Key,
      fileSize: upload.fileSize,
      errorMessage: upload.errorMessage,
      createdAt: upload.createdAt?.toISOString() || '',
      updatedAt: upload.updatedAt?.toISOString() || '',
      completedAt: upload.completedAt?.toISOString() || null,
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}

/**
 * GET /api/artists/:artistId/uploads
 * List uploads for an artist
 */
export const listUploadsRoute = createRoute({
  method: 'get',
  path: '/api/artists/{artistId}/uploads',
  tags: ['Uploads'],
  summary: 'List artist uploads',
  description: 'Get all uploads for a specific artist',
  request: {
    params: z.object({
      artistId: z.uuid().openapi({
        param: {
          name: 'artistId',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
    }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1).openapi({
        param: { name: 'page', in: 'query' },
        example: 1,
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
            uploads: z.array(UploadStatusResponseSchema),
            pagination: z.object({
              page: z.number().int(),
              limit: z.number().int(),
              total: z.number().int(),
            }),
          }).openapi('ListUploadsResponse'),
        },
      },
      description: 'Uploads retrieved successfully',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Internal server error',
    },
  },
})

export async function listUploadsHandler(c: ValidatedContext) {
  try {
    const { artistId } = c.req.valid('param') as { artistId: string }
    const { page, limit } = c.req.valid('query') as { page: number; limit: number }
    const db = getDb(c.env)
    
    const offset = (page - 1) * limit
    const uploads = await listUploads(db, artistId, limit, offset)
    
    // Transform uploads to match response schema
    const transformedUploads = uploads.map(upload => ({
      uploadId: upload.id,
      status: upload.status,
      trackId: upload.trackId,
      r2Key: upload.r2Key,
      fileSize: upload.fileSize,
      errorMessage: upload.errorMessage,
      createdAt: upload.createdAt?.toISOString() || '',
      updatedAt: upload.updatedAt?.toISOString() || '',
      completedAt: upload.completedAt?.toISOString() || null,
    }))
    
    return c.json({
      uploads: transformedUploads,
      pagination: {
        page,
        limit,
        total: uploads.length, // TODO: Implement proper total count
      },
    }, 200)
  } catch (error) {
    const { status, body } = handleError(error)
    return c.json(body, status)
  }
}
