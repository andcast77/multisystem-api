import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestServer, closeTestServer } from '../helpers/test-utils'
import type { FastifyInstance } from 'fastify'

describe('Server - Unit Tests', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer({ logger: false })
  })

  afterEach(async () => {
    await closeTestServer(app)
  })

  describe('Inicialización del servidor', () => {
    it('debería crear una instancia de Fastify', () => {
      expect(app).toBeDefined()
      expect(app.server).toBeDefined()
    })

    it('debería estar listo para recibir requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Registro de plugins', () => {
    it('debería tener CORS configurado', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3003',
          'Access-Control-Request-Method': 'GET'
        }
      })

      const corsHeader = response.headers['access-control-allow-origin']
      expect(corsHeader).toBeDefined()
    })

    it('debería tener variables de entorno configuradas', () => {
      const config = (app as any).config
      expect(config).toBeDefined()
      expect(config.NODE_ENV).toBe('test')
    })

    it('debería tener rutas registradas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Manejo de errores', () => {
    it('debería retornar 404 para rutas inexistentes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-route'
      })

      expect(response.statusCode).toBe(404)
    })

    it('debería retornar 404 con método incorrecto', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/health'
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('CORS', () => {
    it('debería permitir orígenes configurados', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3003'
        }
      })

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3003')
    })

    it('debería incluir headers CORS en respuesta', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'Origin': 'http://localhost:3004'
        }
      })

      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })
  })
})
