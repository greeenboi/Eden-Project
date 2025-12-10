/**
 * Eden Server - Main Application Entry
 * 
 * A Spotify-like music streaming API built on Cloudflare's edge stack:
 * - Cloudflare Workers for serverless compute
 * - D1 (SQLite) for relational metadata storage
 * - R2 for audio file object storage
 * - KV for caching and rate limiting
 * - Hono with OpenAPI for type-safe API routing
 */

import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import type { Env } from './lib/db'
import { logger as workerLogger } from './lib/logger'
import { renderer } from './renderer'
import { registerAlbumRoutes } from './routes/album.routes'
import { registerArtistRoutes } from './routes/artist.routes'
import { registerAuthRoutes } from './routes/auth.routes'
import { registerHomeRoutes } from './routes/home.routes.tsx'
import { registerTrackRoutes } from './routes/track.routes'
import { registerUploadRoutes } from './routes/upload.routes'

// Initialize Hono app with Cloudflare bindings
const app = new OpenAPIHono<{ Bindings: Env }>()

// Middleware
app.use(renderer)
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://eden-server.suvan-gowrishanker-204.workers.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
app.use(prettyJSON()) 

// Custom request/response logger with status coloring and human-readable timings
app.use('*', async (c, next) => {
  const start = Date.now()
  const { method } = c.req
  const path = new URL(c.req.url).pathname

  // Log incoming request
  workerLogger.info('Incoming request', { method, path })
  console.log(`<-- ${method} ${path}`)

  await next()

  const status = c.res.status || 0
  const durationMs = Date.now() - start
  const durationHuman = durationMs < 1000
    ? `${durationMs}ms`
    : `${(durationMs / 1000).toFixed(2)}s`

  const statusColor = (() => {
    if (status >= 500) return '\x1b[31m' // red
    if (status >= 400) return '\x1b[33m' // yellow
    if (status >= 300) return '\x1b[36m' // cyan
    if (status >= 200) return '\x1b[32m' // green
    return '\x1b[35m' // magenta for other codes
  })()

  const resetColor = '\x1b[0m'
  const coloredStatus = `${statusColor}${status}${resetColor}`

  // Structured log for observability; console for quick readability
  workerLogger.info('Outgoing response', { method, path, status, durationMs })
  console.log(`--> ${method} ${path} ${coloredStatus} ${durationHuman}`)
})

// Error handling middleware
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({
    error: 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  }, 500)
})

// ============================================================================
// Register API Routes
// ============================================================================

registerHomeRoutes(app)
registerAuthRoutes(app)
registerUploadRoutes(app)
registerAlbumRoutes(app)
registerTrackRoutes(app)
registerArtistRoutes(app)

// ============================================================================
// OpenAPI Documentation
// ============================================================================

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Eden Server API',
    description: `
# Eden Server - Music Streaming API

A comprehensive music streaming platform API built on Cloudflare's edge stack.

## Features

### Upload Management
- Initialize file uploads with signed R2 URLs
- Complete upload workflow with automatic track creation
- Track upload status and processing

### Track Management
- CRUD operations for track metadata
- Search tracks by title, artist, or album
- List and filter tracks with pagination
- Automatic R2 cleanup on deletion

### Architecture
- **Cloudflare Workers**: Serverless compute at the edge
- **D1 Database**: Relational metadata storage (SQLite)
- **R2 Storage**: Scalable audio file storage
- **KV Namespace**: Caching and rate limiting
- **Drizzle ORM**: Type-safe database queries
- **Hono + OpenAPI**: Type-safe routing with automatic docs

## Authentication

Authentication is required for most endpoints. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limits

- Upload initiation: 10 requests per minute per artist
- Other endpoints: 100 requests per minute per user

## Getting Started

1. Initialize an upload session: \`POST /api/uploads/initiate\`
2. Upload audio file to the signed R2 URL
3. Complete the upload: \`POST /api/uploads/{id}/complete\`
4. Track will be processed and made available for streaming
    `.trim(),
  },
  servers: [
    { url: 'http://localhost:5173', description: 'Development Server' },
    { url: 'https://eden-server.suvan-gowrishanker-204.workers.dev', description: 'Production (Cloudflare Workers)' },
  ],
  tags: [
    {
      name: 'System',
      description: 'System health and status endpoints',
    },
    {
      name: 'Artists',
      description: 'Artist profile management, statistics, and track listings',
    },
    {
      name: 'Uploads',
      description: 'File upload initiation, completion, and status tracking',
    },
    {
      name: 'Tracks',
      description: 'Track metadata management and search',
    },
  ],
})

// Scalar UI for API documentation
app.get(
  '/scalar',
  Scalar({
    url: '/doc',
    pageTitle: 'Eden Server API Documentation',
    theme: 'kepler',
    layout: 'modern',
    expandAllModelSections: true,
    defaultOpenAllTags: true,
    hideClientButton: false,
    showSidebar: true,
  })
)

export default app
