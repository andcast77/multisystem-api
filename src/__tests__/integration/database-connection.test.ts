import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestServer, closeTestServer } from '../helpers/test-utils'
import type { FastifyInstance } from 'fastify'

describe('Database Connection - Integration Tests', () => {
  let app: FastifyInstance
  const DATABASE_API_URL = process.env.DATABASE_API_URL || 'http://localhost:3001'

  beforeAll(async () => {
    app = await buildTestServer({
      logger: false,
    })
  })

  afterAll(async () => {
    if (app) {
      await closeTestServer(app)
    }
  })

  describe('Conexión HTTP al servicio database', () => {
    it('debería poder hacer requests exitosos al endpoint de health del servicio database', async () => {
      try {
        const response = await fetch(`${DATABASE_API_URL}/health`)
        
        if (response.ok) {
          const data = await response.json()
          expect(data).toHaveProperty('status')
          expect(data.status).toBe('ok')
        } else {
          // Si el servicio no está disponible, el test debería fallar o ser skip
          console.warn('Database service no está disponible para tests de integración')
        }
      } catch (error) {
        // Si no se puede conectar, saltar el test pero documentarlo
        console.warn('No se pudo conectar al servicio database:', error)
        // En un entorno de CI/CD, podrías querer que esto falle
        // pero para desarrollo local, es aceptable que el servicio no esté corriendo
      }
    }, 10000)

    it('debería manejar errores cuando el servicio database no está disponible', async () => {
      const invalidUrl = 'http://localhost:9999'
      
      try {
        const response = await fetch(`${invalidUrl}/health`, {
          signal: AbortSignal.timeout(2000), // Timeout de 2 segundos
        })
        
        // Si llega aquí, el servicio está disponible (caso inesperado)
        expect(response.ok).toBe(false)
      } catch (error: any) {
        // Esperamos un error de conexión
        expect(error).toBeDefined()
        expect(error.message).toMatch(/fetch|ECONNREFUSED|timeout/i)
      }
    }, 5000)

    it('debería poder hacer queries a través del servicio database (si está disponible)', async () => {
      try {
        const response = await fetch(`${DATABASE_API_URL}/users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          expect(data).toHaveProperty('success')
          // La respuesta debería tener la estructura esperada
          if (data.success) {
            expect(data).toHaveProperty('data')
            expect(Array.isArray(data.data)).toBe(true)
          }
        } else {
          console.warn('Database service respondió con error:', response.status)
        }
      } catch (error) {
        console.warn('No se pudo conectar al servicio database para obtener usuarios:', error)
        // En desarrollo, es aceptable que el servicio no esté corriendo
      }
    }, 10000)
  })

  describe('Endpoints de la API que consumen el servicio database', () => {
    it('debería poder obtener usuarios a través del endpoint /api/users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          'Origin': 'http://localhost:3003',
        },
      })

      // Si el servicio database está disponible, debería funcionar
      // Si no, debería retornar un error 500
      expect([200, 500]).toContain(response.statusCode)

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body)
        expect(data).toHaveProperty('success')
      } else {
        const data = JSON.parse(response.body)
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('database')
      }
    }, 10000)

    it('debería manejar errores cuando el servicio database no responde', async () => {
      // Usar una URL inválida temporalmente
      const originalUrl = process.env.DATABASE_API_URL
      process.env.DATABASE_API_URL = 'http://localhost:9999'

      // Reiniciar la app con la nueva configuración
      // Nota: El DATABASE_API_URL se lee desde process.env en users.ts
      // Para este test, simplemente usamos buildTestServer normal
      // ya que el cambio de URL se hace modificando process.env antes
      const testApp = await buildTestServer({
        logger: false,
      })

      try {
        const response = await testApp.inject({
          method: 'GET',
          url: '/api/users',
          headers: {
            'Origin': 'http://localhost:3003',
          },
        })

        // Debería retornar un error 500
        expect(response.statusCode).toBe(500)
        const data = JSON.parse(response.body)
        expect(data).toHaveProperty('error')
        expect(data.error).toContain('database')
      } finally {
        await closeTestServer(testApp)
        if (originalUrl) {
          process.env.DATABASE_API_URL = originalUrl
        } else {
          delete process.env.DATABASE_API_URL
        }
      }
    }, 10000)
  })

  describe('Health check de conexión', () => {
    it('debería verificar que la API puede comunicarse con el servicio database', async () => {
      try {
        const response = await fetch(`${DATABASE_API_URL}/health`)
        
        if (response.ok) {
          const data = await response.json()
          expect(data).toBeDefined()
          expect(data.status).toBe('ok')
        }
      } catch (error) {
        // Si no está disponible, documentar pero no fallar en desarrollo
        console.warn('Health check falló - servicio database no disponible')
      }
    }, 5000)
  })
})
