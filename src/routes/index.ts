import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { usersRoutes } from './users.js'

export async function registerRoutes(fastify: FastifyInstance) {
  // Ruta raíz - información de la API
  fastify.get('/', async () => {
    return {
      name: 'Multisystem API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        health: '/health',
        users: {
          list: 'GET /api/users',
          getById: 'GET /api/users/:id',
        },
      },
    }
  })

  await fastify.register(healthRoutes)
  await fastify.register(usersRoutes)
}
