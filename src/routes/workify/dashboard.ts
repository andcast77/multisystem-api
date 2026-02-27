import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifyDashboardRoutes(fastify: FastifyInstance) {
  // GET /api/workify/dashboard/stats - Dashboard stats (company-scoped)
  fastify.get('/api/workify/dashboard/stats', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    const ctx = contextFromRequest(request)

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
