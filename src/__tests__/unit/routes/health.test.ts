import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestServer, closeTestServer } from '../../helpers/test-utils'
import type { FastifyInstance } from 'fastify'

describe('Health Routes - Unit Tests', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer({ logger: false })
  })

  afterEach(async () => {
    await closeTestServer(app)
  })

  describe('GET /health', () => {
    it('debería responder con status 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
    })

    it('debería retornar { status: "ok" }', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      const data = response.json()
      expect(data).toEqual({ status: 'ok' })
    })

    it('debería tener content-type application/json', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.headers['content-type']).toContain('application/json')
    })

    it('debería responder rápidamente (< 100ms)', async () => {
      const start = Date.now()
      await app.inject({
        method: 'GET',
        url: '/health'
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })

    it('debería manejar múltiples requests concurrentes', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/health'
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
        expect(response.json()).toEqual({ status: 'ok' })
      })
    })
  })
})
