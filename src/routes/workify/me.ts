import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { requireWorkifyContext } from '../../lib/auth-context.js'

export async function workifyMeRoutes(fastify: FastifyInstance) {
  // GET /api/workify/me - Current user with companyId and roles (Workify shape)
  fastify.get<{
    Headers: { authorization?: string }
  }>('/api/workify/me', { preHandler: [requireAuth, requireWorkifyContext] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const userId = decoded.id
      const companyId = request.companyId ?? decoded.companyId ?? null

      const users = (await sql`
        SELECT id, email, "firstName", "lastName", "isActive"
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `) as Array<{ id: string; email: string; firstName: string | null; lastName: string | null; isActive: boolean }>

      if (users.length === 0 || !users[0].isActive) {
        reply.code(401)
        return { success: false, error: 'Usuario no encontrado o inactivo' }
      }

      const user = users[0]
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

      // Prefer companyId from context (set by requireWorkifyContext) or token
      let resolvedCompanyId: string | null = companyId
      let roles: Array<{ role: { name: string }; companyId: string }> = []

      if (!resolvedCompanyId) {
        try {
          const roleRows = (await sql`
            SELECT ur."companyId", r.name as role_name
            FROM user_roles ur
            JOIN roles r ON r.id = ur."roleId"
            WHERE ur."userId" = ${userId}
          `) as Array<{ companyId: string; role_name: string }>
          if (roleRows.length > 0) {
            resolvedCompanyId = roleRows[0].companyId
            roles = roleRows.map((r) => ({
              role: { name: r.role_name },
              companyId: r.companyId,
            }))
          }
        } catch {
          // user_roles or roles table may not exist
        }
      } else {
        roles = resolvedCompanyId ? [{ role: { name: decoded.membershipRole || 'USER' }, companyId: resolvedCompanyId }] : []
      }

      let company: { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean } | null = null
      if (resolvedCompanyId) {
        const rows = (await sql`
          SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
          FROM companies WHERE id = ${resolvedCompanyId} AND "isActive" = true LIMIT 1
        `) as Array<{ id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }>
        company = rows[0] ?? null
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        name,
        companyId: resolvedCompanyId ?? undefined,
        membershipRole: decoded.membershipRole ?? undefined,
        isSuperuser: decoded.isSuperuser ?? false,
        company: company ?? undefined,
        roles,
      }

      return { success: true, user: safeUser }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener usuario',
      }
    }
  })
}
