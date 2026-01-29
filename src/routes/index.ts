import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { usersRoutes } from './users.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes)
  await fastify.register(usersRoutes)
}
