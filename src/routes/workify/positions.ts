import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyPositionsRoutes(fastify: FastifyInstance) {
  // GET /api/workify/positions - List positions (company-scoped via department)
  fastify.get('/api/workify/positions', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    try {
      const rows = (await sql`
        SELECT p.id, p.name, p.description, p."departmentId", p."salaryType", p."baseSalary",
          p."overtimeType", p."overtimeMultiplier", p."overtimeFixedAmount", p."createdAt", p."updatedAt"
        FROM positions p
        JOIN departments d ON d.id = p."departmentId"
        WHERE d."companyId" = ${ctx.companyId}
        ORDER BY p.name ASC
      `) as Array<Record<string, unknown>>

      return { success: true, positions: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar posiciones' }
    }
  })

  // GET /api/workify/positions/:id
  fastify.get<{ Params: { id: string } }>('/api/workify/positions/:id', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    const { id } = request.params
    try {
      const rows = (await sql`
        SELECT p.id, p.name, p.description, p."departmentId", p."salaryType", p."baseSalary",
          p."overtimeType", p."overtimeMultiplier", p."overtimeFixedAmount"
        FROM positions p
        JOIN departments d ON d.id = p."departmentId"
        WHERE p.id = ${id} AND d."companyId" = ${ctx.companyId}
        LIMIT 1
      `) as Array<Record<string, unknown>>

      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Posición no encontrada' }
      }
      return { success: true, position: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener posición' }
    }
  })
}
