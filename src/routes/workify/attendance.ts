import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyAttendanceRoutes(fastify: FastifyInstance) {
  // GET /api/workify/attendance/stats - Attendance stats (company-scoped, optional date)
  fastify.get<{ Querystring: { date?: string } }>('/api/workify/attendance/stats', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    const { date } = request.query
    const targetDate = date ? new Date(date) : new Date()
    try {
      const query = sql`
        SELECT COUNT(DISTINCT te."employeeId")::int as present
        FROM time_entries te
        WHERE te."companyId" = ${ctx.companyId} AND te.date::date = ${targetDate.toISOString().slice(0, 10)}::date
      `
      const rows = (await sqlQuery(query)) as Array<{ present: number }>
      const present = rows[0]?.present ?? 0
      return { success: true, present }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener asistencia' }
    }
  })
}
