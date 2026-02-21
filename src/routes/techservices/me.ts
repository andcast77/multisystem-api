import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'
import { getTechServicesContext } from './auth-helper.js'

export async function techServicesMeRoutes(fastify: FastifyInstance) {
  fastify.get('/api/techservices/me', async (request, reply) => {
    const ctx = await getTechServicesContext(request, reply)
    if (!ctx) return

    try {
      const users = (await sql`
        SELECT id, email, "firstName", "lastName", "isActive"
        FROM users
        WHERE id = ${ctx.userId}
        LIMIT 1
      `) as Array<{ id: string; email: string; firstName: string | null; lastName: string | null; isActive: boolean }>

      if (users.length === 0 || !users[0].isActive) {
        reply.code(401)
        return { success: false, error: 'Usuario no encontrado o inactivo' }
      }

      const user = users[0]
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

      const companies = (await sql`
        SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
        FROM companies
        WHERE id = ${ctx.companyId} AND "isActive" = true
        LIMIT 1
      `) as Array<{
        id: string
        name: string
        workifyEnabled: boolean
        shopflowEnabled: boolean
        technicalServicesEnabled: boolean
      }>

      const company = companies[0] ?? undefined

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name,
          companyId: ctx.companyId,
          membershipRole: ctx.membershipRole,
          isSuperuser: ctx.isSuperuser ?? false,
          company,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener usuario' }
    }
  })
}
