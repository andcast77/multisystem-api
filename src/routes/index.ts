import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes)
  // Aquí se registrarán más rutas en el futuro
}
