/**
 * Authentication routes - Login and Signup
 */

import { type OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import type { Env } from '../lib/db'
import { getDb } from '../lib/db'
import { users, artists } from '../schema'
import { generateJWT } from '../lib/auth'
import { hashPassword, verifyPassword } from '../lib/password'
import { handleError } from '../lib/errors'
import { logger } from '../lib/logger'

// ============================================================================
// Schemas
// ============================================================================

const LoginRequestSchema = z.object({
  email: z.string().email().openapi({ example: 'user@example.com' }),
  password: z.string().min(6).openapi({ example: 'password123' }),
})

const SignupRequestSchema = z.object({
  email: z.string().email().openapi({ example: 'newuser@example.com' }),
  password: z.string().min(8).openapi({ 
    example: 'SecurePass123!',
    description: 'Minimum 8 characters',
  }),
  name: z.string().min(1).openapi({ example: 'John Doe' }),
})

const AuthResponseSchema = z.object({
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
  user: z.object({
    id: z.string().openapi({ example: 'user-123' }),
    email: z.string().email().openapi({ example: 'user@example.com' }),
    name: z.string().openapi({ example: 'John Doe' }),
    role: z.enum(['user', 'artist', 'admin']).openapi({ example: 'user' }),
  }),
}).openapi('AuthResponse')

const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
}).openapi('ErrorResponse')

// ============================================================================
// Routes
// ============================================================================

export function registerAuthRoutes(app: OpenAPIHono<{ Bindings: Env }>) {
  
  // Login Route
  const loginRoute = createRoute({
    method: 'post',
    path: '/api/auth/login',
    tags: ['Auth'],
    summary: 'Login with email and password',
    description: 'Authenticate user or artist and receive a JWT token',
    request: {
      body: {
        content: {
          'application/json': {
            schema: LoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: AuthResponseSchema,
          },
        },
        description: 'Login successful, returns JWT token',
      },
      401: {
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
        description: 'Invalid credentials',
      },
    },
  })

  app.openapi(loginRoute, async (c) => {
    try {
      const { email, password } = await c.req.json()
      const db = getDb(c.env)

      logger.info('Login attempt', { email })

      // Query users table
      const account = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true, email: true, name: true, passwordHash: true },
      })

      if (!account || !account.passwordHash) {
        logger.warn('Login failed - account not found', { email })
        return c.json({
          error: 'AuthenticationError',
          message: 'Invalid email or password',
        } as const, 401)
      }

      // Verify password
      const isValid = await verifyPassword(password, account.passwordHash)
      if (!isValid) {
        logger.warn('Login failed - invalid password', { email })
        return c.json({
          error: 'AuthenticationError',
          message: 'Invalid email or password',
        } as const, 401)
      }

      // Generate JWT token
      const token = await generateJWT(
        { sub: account.id, role: 'user' },
        c.env.JWT_SECRET,
        86400 // 24 hours
      )

      logger.info('Login successful', { userId: account.id })

      return c.json({
        token,
        user: {
          id: account.id,
          email: account.email,
          name: account.name || '',
          role: 'user' as const,
        },
      } as const, 200)
    } catch (error) {
      logger.error('Login error', error)
      // Return 401 for any unexpected errors during auth
      return c.json({
        error: 'AuthenticationError',
        message: 'Authentication failed',
      } as const, 401 as const)
    }
  })

  // Signup Route
  const signupRoute = createRoute({
    method: 'post',
    path: '/api/auth/signup',
    tags: ['Auth'],
    summary: 'Create a new account',
    description: 'Register a new user or artist account',
    request: {
      body: {
        content: {
          'application/json': {
            schema: SignupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: AuthResponseSchema,
          },
        },
        description: 'Account created successfully, returns JWT token',
      },
      400: {
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
        description: 'Validation error or email already exists',
      },
    },
  })

  app.openapi(signupRoute, async (c) => {
    try {
      const { email, password, name } = await c.req.json()
      const db = getDb(c.env)

      logger.info('Signup attempt', { email })

      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      })

      if (existingUser) {
        logger.warn('Signup failed - email already exists', { email })
        return c.json({
          error: 'ValidationError',
          message: 'Email already registered',
        } as const, 400)
      }

      // Hash password
      const passwordHash = await hashPassword(password)

      // Create user account
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        name,
      }).returning({ id: users.id })

      // Generate JWT token
      const token = await generateJWT(
        { sub: newUser.id, role: 'user' },
        c.env.JWT_SECRET,
        86400 // 24 hours
      )

      logger.info('Signup successful', { userId: newUser.id })

      return c.json({
        token,
        user: {
          id: newUser.id,
          email,
          name,
          role: 'user' as const,
        },
      } as const, 201)
    } catch (error) {
      logger.error('Signup error', error)
      return c.json({
        error: 'ValidationError',
        message: 'Signup failed',
      } as const, 400)
    }
  })
}
