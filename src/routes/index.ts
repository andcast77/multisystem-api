import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health'
import { usersRoutes } from './users'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes)
  await fastify.register(usersRoutes)
}
