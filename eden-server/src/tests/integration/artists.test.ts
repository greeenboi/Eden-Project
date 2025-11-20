import { describe, it, expect, beforeAll } from 'vitest'
import type { Env } from '../../lib/db'
import app from '../../../src/index'
import { generateJWT } from '../../lib/auth'

describe('Artist API', () => {
  let authToken: string
  const testEnv: Env = {} as Env // Mock env for testing

  beforeAll(async () => {
    // Generate test token
    authToken = await generateJWT(
      { sub: 'test-artist-123', role: 'artist' },
      'test-secret',
      3600
    )
  })

  describe('POST /api/artists', () => {
    it('should create a new artist', async () => {
      const response = await app.request('/api/artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Artist',
          bio: 'A test artist bio',
        }),
      })

      expect(response.status).toBe(201)
      const data = await response.json() as { id: string; name: string; bio: string }
      expect(data.id).toBeDefined()
      expect(data.name).toBe('Test Artist')
      expect(data.bio).toBe('A test artist bio')
    })

    it('should reject invalid artist data', async () => {
      const response = await app.request('/api/artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // missing required name field
          bio: 'A bio without a name',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/artists/:id', () => {
    it('should return 404 for non-existent artist', async () => {
      const response = await app.request('/api/artists/nonexistent-id')
      expect(response.status).toBe(404)
    })
  })
})
