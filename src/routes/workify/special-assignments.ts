import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifySpecialAssignmentsRoutes(fastify: FastifyInstance) {
  // GET /api/workify/employees/special-assignments - List special day assignments (company-scoped)
  fastify.get('/api/workify/employees/special-assignments', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    const ctx = contextFromRequest(request)

    try {
      const rows = (await sql`
        SELECT sda.id, sda."employeeId", sda."workShiftId", sda.date, sda.notes, sda."createdAt", sda."updatedAt"
        FROM special_day_assignments sda
        JOIN employees e ON e.id = sda."employeeId"
        WHERE e."companyId" = ${ctx.companyId}
        ORDER BY sda.date DESC
      `) as Array<Record<string, unknown>>

      return { success: true, specialAssignments: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar asignaciones' }
    }
  })
}
