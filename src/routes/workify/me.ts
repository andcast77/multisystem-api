import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { verifyToken } from '../auth.js'

export async function workifyMeRoutes(fastify: FastifyInstance) {
  // GET /api/workify/me - Current user with companyId and roles (Workify shape)
  fastify.get<{
    Headers: { authorization?: string }
  }>('/api/workify/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }

      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      const userId = decoded.id

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

      // Prefer companyId and membershipRole from token (set at login)
      let companyId: string | null = decoded.companyId ?? null
      let roles: Array<{ role: { name: string }; companyId: string }> = []

      if (!companyId) {
        try {
          const roleRows = (await sql`
            SELECT ur."companyId", r.name as role_name
            FROM user_roles ur
            JOIN roles r ON r.id = ur."roleId"
            WHERE ur."userId" = ${userId}
          `) as Array<{ companyId: string; role_name: string }>
          if (roleRows.length > 0) {
            companyId = roleRows[0].companyId
            roles = roleRows.map((r) => ({
              role: { name: r.role_name },
              companyId: r.companyId,
            }))
          }
        } catch {
          // user_roles or roles table may not exist
        }
      } else {
        roles = companyId ? [{ role: { name: decoded.membershipRole || 'USER' }, companyId }] : []
      }

      let company: { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean } | null = null
      if (companyId) {
        const rows = (await sql`
          SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
          FROM companies WHERE id = ${companyId} AND "isActive" = true LIMIT 1
        `) as Array<{ id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }>
        company = rows[0] ?? null
      }

      const safeUser = {
        id: user.id,
        email: user.email,
        name,
        companyId: companyId ?? undefined,
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
