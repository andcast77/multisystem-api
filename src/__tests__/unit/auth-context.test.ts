import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyToken } from '../../lib/auth.js'

describe('auth', () => {
  describe('verifyToken', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test')
    })

    it('returns null for invalid or malformed token', () => {
      expect(verifyToken('')).toBeNull()
      expect(verifyToken('invalid')).toBeNull()
      expect(verifyToken('Bearer no-jwt-here')).toBeNull()
    })

    it('returns null for expired or bad signature token', () => {
      const badJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyJ9.xxx'
      expect(verifyToken(badJwt)).toBeNull()
    })
  })
})
