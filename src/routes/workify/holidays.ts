import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyHolidaysRoutes(fastify: FastifyInstance) {
  // GET /api/workify/holidays - List holidays (company-scoped)
  fastify.get('/api/workify/holidays', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    try {
      const rows = (await sql`
        SELECT id, name, date, "isRecurring", "companyId", "createdAt", "updatedAt"
        FROM holidays
        WHERE "companyId" = ${ctx.companyId}
        ORDER BY date ASC
      `) as Array<Record<string, unknown>>

      return { success: true, holidays: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar festivos' }
    }
  })

  // GET /api/workify/holidays/:id
  fastify.get<{ Params: { id: string } }>('/api/workify/holidays/:id', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    const { id } = request.params
    try {
      const rows = (await sql`
        SELECT id, name, date, "isRecurring", "companyId"
        FROM holidays
        WHERE id = ${id} AND "companyId" = ${ctx.companyId}
        LIMIT 1
      `) as Array<Record<string, unknown>>

      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Festivo no encontrado' }
      }
      return { success: true, holiday: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener festivo' }
    }
  })
}
