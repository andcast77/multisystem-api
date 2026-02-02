import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifySpecialAssignmentsRoutes(fastify: FastifyInstance) {
  // GET /api/workify/employees/special-assignments - List special day assignments (company-scoped)
  fastify.get('/api/workify/employees/special-assignments', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

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
