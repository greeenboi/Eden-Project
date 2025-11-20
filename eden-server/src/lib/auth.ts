/**
 * Authentication and authorization utilities
 * Bearer token validation with JWT
 */

import type { Context } from 'hono'
import type { Env } from './db'
import { logger } from './logger'

// Extend Hono context to include user variable
type Variables = {
  user: JWTPayload
}

export interface JWTPayload {
  sub: string // user/artist ID
  role: 'user' | 'artist' | 'admin'
  iat: number
  exp: number
  [key: string]: unknown
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Verify JWT token using Web Crypto API
 * For production, integrate with a proper JWT library or auth provider
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  try {
    // Simple JWT verification - in production use a proper JWT library
    // or Cloudflare Access/Auth0/Clerk
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new AuthenticationError('Invalid token format')
    }

    const [headerB64, payloadB64, signatureB64] = parts
    
    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload: JWTPayload = JSON.parse(payloadJson)
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      throw new AuthenticationError('Token expired')
    }
    
    // Verify signature (simplified - use proper HMAC verification in production)
    const encoder = new TextEncoder()
    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const secretKey = encoder.encode(secret)
    
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      data
    )
    
    if (!valid) {
      throw new AuthenticationError('Invalid signature')
    }
    
    return payload
  } catch (error) {
    if (error instanceof AuthenticationError) throw error
    logger.error('JWT verification failed', error)
    throw new AuthenticationError('Invalid token')
  }
}

/**
 * Middleware: Require authentication
 * Validates Bearer token and attaches payload to context
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  const token = extractBearerToken(authHeader)
  
  if (!token) {
    logger.warn('Missing authorization token', { path: c.req.path })
    return c.json({ error: 'AuthenticationError', message: 'Missing authorization token' }, 401)
  }
  
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    
    // Attach to context for use in handlers
    c.set('user', payload)
    
    logger.debug('User authenticated', { userId: payload.sub, role: payload.role })
    
    await next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logger.warn('Authentication failed', { error: error.message, path: c.req.path })
      return c.json({ error: 'AuthenticationError', message: error.message }, 401)
    }
    throw error
  }
}

/**
 * Middleware: Require specific role
 */
export function requireRole(...roles: Array<'user' | 'artist' | 'admin'>) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: () => Promise<void>) => {
    const user = c.get('user') as JWTPayload | undefined
    
    if (!user) {
      logger.warn('No user in context - auth middleware not applied?')
      return c.json({ error: 'AuthenticationError', message: 'Not authenticated' }, 401)
    }
    
    if (!roles.includes(user.role)) {
      logger.warn('Authorization failed', { 
        userId: user.sub, 
        userRole: user.role, 
        requiredRoles: roles 
      })
      return c.json({ 
        error: 'AuthorizationError', 
        message: 'Insufficient permissions' 
      }, 403)
    }
    
    await next()
  }
}

/**
 * Generate a JWT token (for testing purposes)
 * In production, use a proper auth service
 */
export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn = 3600
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  } as JWTPayload
  
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const encoder = new TextEncoder()
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const secretKey = encoder.encode(secret)
  
  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, data)
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  
  return `${headerB64}.${payloadB64}.${signatureB64}`
}
