import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifyWorkShiftsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/workify/work-shifts', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    const companyId = request.companyId!

    try {
      const rows = (await sql`
        SELECT id, name, description, "startTime", "endTime", "breakStart", "breakEnd",
          tolerance, "isActive", "isNightShift", "companyId", "createdAt", "updatedAt"
        FROM work_shifts
        WHERE "companyId" = ${companyId}
        ORDER BY name ASC
      `) as Array<Record<string, unknown>>

      return { success: true, workShifts: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar turnos' }
    }
  })
}
