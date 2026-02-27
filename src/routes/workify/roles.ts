import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifyRolesRoutes(fastify: FastifyInstance) {
  // GET /api/workify/roles - List roles (company-scoped)
  fastify.get('/api/workify/roles', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    const ctx = contextFromRequest(request)

    try {
      const rows = (await sql`
        SELECT id, name, description, "parentId", "companyId", "createdAt", "updatedAt"
        FROM roles
        WHERE "companyId" = ${ctx.companyId}
        ORDER BY name ASC
      `) as Array<Record<string, unknown>>

      return { success: true, roles: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar roles' }
    }
  })

  // GET /api/workify/roles/:id
  fastify.get<{ Params: { id: string } }>('/api/workify/roles/:id', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    const ctx = contextFromRequest(request)

    const { id } = request.params
    try {
      const rows = (await sql`
        SELECT id, name, description, "parentId", "companyId"
        FROM roles
        WHERE id = ${id} AND "companyId" = ${ctx.companyId}
        LIMIT 1
      `) as Array<Record<string, unknown>>

      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Rol no encontrado' }
      }
      return { success: true, role: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener rol' }
    }
  })
}
