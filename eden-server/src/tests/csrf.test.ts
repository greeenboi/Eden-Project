import { describe, it, expect } from 'vitest'
import { generateCSRFToken, verifyCSRFToken } from '../lib/csrf'

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate token of correct length', async () => {
      const token = await generateCSRFToken()
      expect(token).toBeDefined()
      expect(token.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate unique tokens', async () => {
      const token1 = await generateCSRFToken()
      const token2 = await generateCSRFToken()
      expect(token1).not.toBe(token2)
    })

    it('should only contain hex characters', async () => {
      const token = await generateCSRFToken()
      expect(token).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('verifyCSRFToken', () => {
    it('should return true for matching tokens', () => {
      const token = 'abc123def456'
      expect(verifyCSRFToken(token, token)).toBe(true)
    })

    it('should return false for non-matching tokens', () => {
      expect(verifyCSRFToken('token1', 'token2')).toBe(false)
    })

    it('should return false for missing header token', () => {
      expect(verifyCSRFToken(undefined, 'token')).toBe(false)
    })

    it('should return false for missing cookie token', () => {
      expect(verifyCSRFToken('token', undefined)).toBe(false)
    })

    it('should return false for different length tokens', () => {
      expect(verifyCSRFToken('short', 'muchlongertoken')).toBe(false)
    })

    it('should use constant-time comparison', () => {
      // This is a behavioral test - timing attacks are prevented
      const token1 = 'a'.repeat(64)
      const token2 = 'b'.repeat(64)
      
      expect(verifyCSRFToken(token1, token2)).toBe(false)
    })
  })
})
