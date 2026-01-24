import { FastifyInstance } from 'fastify'

const DATABASE_API_URL = process.env.DATABASE_API_URL || 'http://database:3001'

export async function usersRoutes(fastify: FastifyInstance) {
  // GET /api/users - Obtener todos los usuarios (hace request HTTP al servicio database)
  fastify.get('/api/users', async (request, reply) => {
    try {
      const response = await fetch(`${DATABASE_API_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        reply.code(response.status)
        return {
          success: false,
          error: 'Error al obtener usuarios del servicio database',
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return {
        success: false,
        error: 'Error al conectar con el servicio database',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  })

  // GET /api/users/:id - Obtener un usuario por ID (hace request HTTP al servicio database)
  fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const response = await fetch(`${DATABASE_API_URL}/users/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        reply.code(response.status)
        return {
          success: false,
          error: 'Error al obtener usuario del servicio database',
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return {
        success: false,
        error: 'Error al conectar con el servicio database',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }
    }
  })
}
