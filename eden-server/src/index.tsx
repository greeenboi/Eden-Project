import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { renderer } from './renderer'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono()

app.use(renderer)

// Schema for / route
const GreetingQuerySchema = z.object({
  name: z.string().optional().openapi({
    param: {
      name: 'name',
      in: 'query',
    },
    example: 'World',
  }),
})

const GreetingResponseSchema = z.object({
  message: z.string().openapi({
    example: 'Hello World!',
  }),
}).openapi('Greeting')

// Schema for /health route
const HealthResponseSchema = z.object({
  status: z.string().openapi({
    example: 'ok',
  }),
  timestamp: z.string().openapi({
    example: '2025-11-20T12:00:00Z',
  }),
}).openapi('Health')

// Create routes
const greetingRoute = createRoute({
  method: 'get',
  path: '/',
  request: {
    query: GreetingQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GreetingResponseSchema,
        },
      },
      description: 'Say hello to the user',
    },
  },
})

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'Health check endpoint',
    },
  },
})

// Register routes
app.openapi(greetingRoute, (c) => {
  const { name } = c.req.valid('query')
  return c.json({
    message: `Hello ${name ?? 'Hono'}!`,
  })
})

app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// OpenAPI documentation
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Eden Server API',
    description: 'Greeting and Health Check API',
  },
  servers: [
    { url: 'http://localhost:5173', description: 'Local Server' },
  ],
})

// Scalar UI for API documentation
app.get(
  '/scalar',
  Scalar({
    url: '/doc',
    pageTitle: 'Eden Server Docs',
    theme: 'mars',
    layout: "modern",
    expandAllModelSections: true,
    defaultOpenAllTags: true,
    hideClientButton: false,
    showSidebar: true,
  })
)

export default app
