import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifyTimeEntriesRoutes(fastify: FastifyInstance) {
  // GET /api/workify/time-entries - List time entries (company-scoped)
  fastify.get<{ Querystring: { employeeId?: string; start?: string; end?: string } }>(
    '/api/workify/time-entries',
    { preHandler: [requireAuth, requireWorkifyContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)

      const { employeeId, start, end } = request.query
      try {
        let query = sql`
          SELECT te.id, te."employeeId", te."companyId", te.date, te."clockIn", te."clockOut",
            te."breakStart", te."breakEnd", te.notes, te."createdAt", te."updatedAt"
          FROM time_entries te
          WHERE te."companyId" = ${ctx.companyId}
        `
        if (employeeId) {
          query = sql`${query} AND te."employeeId" = ${employeeId}`
        }
        if (start) {
          query = sql`${query} AND te.date >= ${start}`
        }
        if (end) {
          query = sql`${query} AND te.date <= ${end}`
        }
        query = sql`${query} ORDER BY te.date DESC, te."clockIn" DESC`

        const rows = (await sqlQuery(query)) as Array<Record<string, unknown>>
        return { success: true, timeEntries: rows }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al listar registros' }
      }
    }
  )
}
