import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyDashboardRoutes(fastify: FastifyInstance) {
  // GET /api/workify/dashboard/stats - Dashboard stats (company-scoped)
  fastify.get('/api/workify/dashboard/stats', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    try {
      const employeeCount = (await sql`
        SELECT COUNT(*)::int as total FROM employees WHERE "companyId" = ${ctx.companyId} AND ("isDeleted" IS NOT TRUE OR "isDeleted" IS NULL)
      `) as Array<{ total: number }>
      const stats = {
        totalEmployees: employeeCount[0]?.total ?? 0,
      }
      return { success: true, ...stats }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener estadísticas' }
    }
  })
}
