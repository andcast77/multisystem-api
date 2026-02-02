import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyWorkShiftsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/workify/work-shifts', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    try {
      const rows = (await sql`
        SELECT id, name, description, "startTime", "endTime", "breakStart", "breakEnd",
          tolerance, "isActive", "isNightShift", "companyId", "createdAt", "updatedAt"
        FROM work_shifts
        WHERE "companyId" = ${ctx.companyId}
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
