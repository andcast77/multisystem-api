import { FastifyInstance } from 'fastify'
import { sql, type User } from '../db/neon.js'

export async function usersRoutes(fastify: FastifyInstance) {
  // GET /api/users - Obtener todos los usuarios
  fastify.get('/api/users', async (request, reply) => {
    try {
      const users = (await sql`
        SELECT 
          id,
          email,
          name,
          role,
          active,
          "createdAt",
          "updatedAt"
        FROM users
        WHERE active = true
        ORDER BY "createdAt" DESC
      `) as User[]

      return {
        success: true,
        data: users,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined
      return {
        success: false,
        error: 'Error al obtener usuarios',
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      }
    }
  })

  // GET /api/users/:id - Obtener un usuario por ID
  fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const users = (await sql`
        SELECT 
          id,
          email,
          name,
          role,
          active,
          "createdAt",
          "updatedAt"
        FROM users
        WHERE id = ${id}
        LIMIT 1
      `) as User[]

      if (users.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      return {
        success: true,
        data: users[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined
      return {
        success: false,
        error: 'Error al obtener usuario',
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      }
    }
  })
}
