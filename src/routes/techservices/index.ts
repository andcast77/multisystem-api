import { FastifyInstance } from 'fastify'
import { techServicesMeRoutes } from './me.js'
import { techServicesAssetsRoutes } from './assets.js'
import { techServicesWorkOrdersRoutes } from './work-orders.js'
import { techServicesPartsRoutes } from './parts.js'
import { techServicesVisitsRoutes } from './visits.js'

export async function techServicesRoutes(fastify: FastifyInstance) {
  await fastify.register(techServicesMeRoutes)
  await fastify.register(techServicesAssetsRoutes)
  await fastify.register(techServicesWorkOrdersRoutes)
  await fastify.register(techServicesPartsRoutes)
  await fastify.register(techServicesVisitsRoutes)
}
