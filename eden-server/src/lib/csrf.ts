/**
 * CSRF protection middleware
 * Uses double-submit cookie pattern for state-changing operations
 */

import type { Context } from 'hono'
import type { Env } from './db'
import { logger } from './logger'

export class CSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSRFError'
  }
}

const CSRF_HEADER = 'X-CSRF-Token'
const CSRF_COOKIE = 'csrf_token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a random CSRF token
 */
export async function generateCSRFToken(): Promise<string> {
  const buffer = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(buffer)
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify CSRF token matches between header and cookie
 */
export function verifyCSRFToken(headerToken: string | undefined, cookieToken: string | undefined): boolean {
  if (!headerToken || !cookieToken) {
    return false
  }
  
  // Constant-time comparison to prevent timing attacks
  if (headerToken.length !== cookieToken.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < headerToken.length; i++) {
    result |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Middleware: CSRF protection for state-changing methods
 * Validates CSRF token for POST, PUT, PATCH, DELETE requests
 */
export async function csrfProtection(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const method = c.req.method
  
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await next()
    return
  }
  
  // Get tokens from header and cookie
  const headerToken = c.req.header(CSRF_HEADER)
  const cookieHeader = c.req.header('Cookie')
  
  let cookieToken: string | undefined
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
    cookieToken = cookies[CSRF_COOKIE]
  }
  
  // Verify tokens match
  if (!verifyCSRFToken(headerToken, cookieToken)) {
    logger.warn('CSRF validation failed', {
      method,
      path: c.req.path,
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
    })
    return c.json({
      error: 'CSRFError',
      message: 'Invalid or missing CSRF token',
    }, 403)
  }
  
  logger.debug('CSRF validation passed', { method, path: c.req.path })
  await next()
}

/**
 * Middleware: Set CSRF cookie for GET requests
 * Generates and sets a CSRF token cookie if one doesn't exist
 */
export async function setCSRFCookie(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  await next()
  
  // Only set cookie for successful GET requests
  if (c.req.method === 'GET' && c.res.status >= 200 && c.res.status < 300) {
    const cookieHeader = c.req.header('Cookie')
    const hasCookie = cookieHeader?.includes(CSRF_COOKIE)
    
    if (!hasCookie) {
      const token = await generateCSRFToken()
      c.header(
        'Set-Cookie',
        `${CSRF_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
      )
      logger.debug('CSRF cookie set', { path: c.req.path })
    }
  }
}
