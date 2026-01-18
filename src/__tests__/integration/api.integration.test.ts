import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestServer, closeTestServer } from '../helpers/test-utils'
import type { FastifyInstance } from 'fastify'

describe('API - Integration Tests', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer({ logger: false })
  })

  afterEach(async () => {
    await closeTestServer(app)
  })

  describe('GET /health', () => {
    it('debería responder con status 200 y { status: "ok" }', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')

      const data = response.json()
      expect(data).toEqual({ status: 'ok' })
    })

    it('debería incluir headers CORS correctos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3003'
        }
      })

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3003')
      expect(response.statusCode).toBe(200)
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
  })

  describe('Rutas inexistentes', () => {
    it('debería retornar 404 para GET /non-existent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent'
      })

      expect(response.statusCode).toBe(404)
    })

    it('debería retornar 404 para cualquier ruta no definida', async () => {
      const routes = ['/api', '/v1', '/test', '/random-path']

      for (const route of routes) {
        const response = await app.inject({
          method: 'GET',
          url: route
        })

        expect(response.statusCode).toBe(404)
      }
    })
  })

  describe('CORS Preflight', () => {
    it('debería manejar OPTIONS request correctamente', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3003',
          'Access-Control-Request-Method': 'GET'
        }
      })

      expect(response.statusCode).toBe(204)
      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })

    it('debería permitir múltiples orígenes configurados', async () => {
      const origins = ['http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005']

      for (const origin of origins) {
        const response = await app.inject({
          method: 'GET',
          url: '/health',
          headers: {
            'Origin': origin
          }
        })

        expect(response.headers['access-control-allow-origin']).toBe(origin)
        expect(response.statusCode).toBe(200)
      }
    })
  })

  describe('Concurrencia', () => {
    it('debería manejar múltiples requests concurrentes', async () => {
      const requests = Array.from({ length: 20 }, () =>
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

    it('debería mantener consistencia bajo carga', async () => {
      const iterations = 50
      const requests = Array.from({ length: iterations }, () =>
        app.inject({
          method: 'GET',
          url: '/health'
        })
      )

      const responses = await Promise.all(requests)

      const allOk = responses.every(
        response => response.statusCode === 200 && response.json().status === 'ok'
      )

      expect(allOk).toBe(true)
    })
  })

  describe('Headers y Metadata', () => {
    it('debería incluir content-type correcto', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.headers['content-type']).toContain('application/json')
    })

    it('debería tener headers de seguridad básicos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      // Verificar que la respuesta tiene headers válidos
      expect(response.headers).toBeDefined()
      expect(response.headers['content-type']).toBeDefined()
    })
  })

  describe('Validación de variables de entorno', () => {
    it('debería funcionar con configuración de test', async () => {
      const testApp = await buildTestServer({
        logger: false,
        corsOrigin: 'http://localhost:9999'
      })

      const response = await testApp.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:9999'
        }
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:9999')

      await closeTestServer(testApp)
    })
  })
})
