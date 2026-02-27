import { FastifyInstance } from 'fastify'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      description: 'Verifica el estado de salud del API.',
      tags: ['Health'],
      response: {
        200: {
          description: 'API funcionando',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' }
          }
        }
      }
    }
  }, async () => {
    return { status: 'ok' }
  })
}
