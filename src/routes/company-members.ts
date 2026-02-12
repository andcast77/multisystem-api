import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../db/neon.js'
import { userDisplayName } from '../db/neon.js'
import { verifyToken } from './auth.js'
import bcrypt from 'bcryptjs'

export async function companyMembersRoutes(fastify: FastifyInstance) {
  const canAccessCompany = (decoded: { id: string; companyId?: string; isSuperuser?: boolean; membershipRole?: string }, companyId: string) => {
    if (decoded.isSuperuser) return true
    if (decoded.companyId !== companyId) return false
    return true
  }

  const canManageMembers = (decoded: { membershipRole?: string; isSuperuser?: boolean }) => {
    if (decoded.isSuperuser) return true
    return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
  }

  // GET /api/companies/:companyId/members - List company members (same list for Workify and Shopflow)
  fastify.get<{
    Params: { companyId: string }
    Headers: { authorization?: string }
  }>('/api/companies/:companyId/members', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }
      const decoded = verifyToken(authHeader.substring(7))
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      const { companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      type MemberRow = {
        id: string
        userId: string
        email: string
        firstName: string
        lastName: string
        membershipRole: string
        createdAt: string
      }
      let members: MemberRow[] = []
      try {
        members = (await sql`
          SELECT cm.id, cm."userId", cm."membershipRole", cm."createdAt",
                 u.email, u."firstName", u."lastName"
          FROM company_members cm
          JOIN users u ON u.id = cm."userId"
          WHERE cm."companyId" = ${companyId} AND u."isSuperuser" = false
          ORDER BY cm."membershipRole" = 'OWNER' DESC, u."firstName", u."lastName"
        `) as MemberRow[]
        // For USER members, fetch storeIds from user_stores
        for (const m of members) {
          if (m.membershipRole === 'USER') {
            const storeRows = (await sql`
              SELECT us."storeId" FROM user_stores us
              JOIN stores s ON s.id = us."storeId" AND s."companyId" = ${companyId}
              WHERE us."userId" = ${m.userId}
            `) as Array<{ storeId: string }>
            ;(m as MemberRow & { storeIds?: string[] }).storeIds = storeRows.map((r) => r.storeId)
          }
        }
      } catch {
        // company_members may not exist; fallback: no members or user_roles
        const fallback = (await sql`
          SELECT ur.id, ur."userId", ur."companyId",
                 u.email, u."firstName", u."lastName"
          FROM user_roles ur
          JOIN users u ON u.id = ur."userId"
          WHERE ur."companyId" = ${companyId} AND u."isSuperuser" = false
        `) as Array<{ id: string; userId: string; companyId: string; email: string; firstName: string; lastName: string }>
        members = fallback.map((r) => ({
          id: r.id,
          userId: r.userId,
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          membershipRole: 'USER',
          createdAt: '',
        }))
      }

      const data = members.map((m) => {
        const base = {
          id: m.id,
          userId: m.userId,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          name: userDisplayName({ email: m.email, firstName: m.firstName, lastName: m.lastName }),
          membershipRole: m.membershipRole,
          createdAt: m.createdAt,
        }
        const withStores = m as MemberRow & { storeIds?: string[] }
        if (withStores.storeIds) {
          return { ...base, storeIds: withStores.storeIds }
        }
        return base
      })

      return { success: true, data }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // POST /api/companies/:companyId/members - Create user and add as company member (owner/admin only)
  fastify.post<{
    Params: { companyId: string }
    Headers: { authorization?: string }
    Body: {
      email: string
      password: string
      firstName?: string
      lastName?: string
      membershipRole: 'ADMIN' | 'USER'
      storeIds?: string[]
    }
  }>('/api/companies/:companyId/members', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }
      const decoded = verifyToken(authHeader.substring(7))
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      const { companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }
      if (!canManageMembers(decoded)) {
        reply.code(403)
        return { success: false, error: 'Solo el owner o un admin pueden crear usuarios' }
      }

      const { email, password, firstName = '', lastName = '', membershipRole, storeIds } = request.body
      if (!email || !password) {
        reply.code(400)
        return { success: false, error: 'Email y contraseña son requeridos' }
      }
      if (membershipRole !== 'ADMIN' && membershipRole !== 'USER') {
        reply.code(400)
        return { success: false, error: 'membershipRole debe ser ADMIN o USER' }
      }

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `)
      if (existing.length > 0) {
        reply.code(400)
        return { success: false, error: 'Ya existe un usuario con este email' }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const users = (await sqlQuery<{ id: string; email: string; firstName: string; lastName: string }>(sql`
        INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isSuperuser", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'USER', true, false, NOW(), NOW())
        RETURNING id, email, "firstName", "lastName"
      `))
      if (users.length === 0) {
        reply.code(500)
        return { success: false, error: 'Error al crear usuario' }
      }
      const user = users[0]

      try {
        await sql`
          INSERT INTO company_members (id, "userId", "companyId", "membershipRole", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), ${user.id}, ${companyId}, ${membershipRole}, NOW(), NOW())
        `
      } catch (err) {
        fastify.log.error(err)
        reply.code(500)
        return { success: false, error: 'Error al asignar usuario a la empresa (tabla company_members). Ejecuta migraciones.' }
      }

      // For USER role: assign stores in user_stores. If storeIds empty/undefined, assign all company stores (backward compat).
      if (membershipRole === 'USER') {
        let idsToAssign: string[] = []
        if (Array.isArray(storeIds) && storeIds.length > 0) {
          for (const sid of storeIds) {
            const rows = await sqlQuery<{ id: string }>(sql`
              SELECT id FROM stores WHERE id = ${sid} AND "companyId" = ${companyId} LIMIT 1
            `)
            if (rows.length > 0) idsToAssign.push(sid)
          }
        } else {
          const allStores = await sqlQuery<{ id: string }>(sql`
            SELECT id FROM stores WHERE "companyId" = ${companyId} AND active = true
          `)
          idsToAssign = allStores.map((s) => s.id)
        }
        for (const storeId of idsToAssign) {
          await sql`
            INSERT INTO user_stores (id, "userId", "storeId", "createdAt")
            VALUES (gen_random_uuid(), ${user.id}, ${storeId}, NOW())
            ON CONFLICT ("userId", "storeId") DO NOTHING
          `
        }
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: userDisplayName(user),
          membershipRole,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // PUT /api/companies/:companyId/members/:userId/stores - Update stores for a USER member (owner/admin only)
  fastify.put<{
    Params: { companyId: string; userId: string }
    Headers: { authorization?: string }
    Body: { storeIds: string[] }
  }>('/api/companies/:companyId/members/:userId/stores', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }
      const decoded = verifyToken(authHeader.substring(7))
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      const { companyId, userId } = request.params
      const { storeIds } = request.body

      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }
      if (!canManageMembers(decoded)) {
        reply.code(403)
        return { success: false, error: 'Solo el owner o un admin pueden modificar locales de usuarios' }
      }

      const member = await sqlQuery<{ membershipRole: string }>(sql`
        SELECT "membershipRole" FROM company_members
        WHERE "userId" = ${userId} AND "companyId" = ${companyId} LIMIT 1
      `)
      if (member.length === 0) {
        reply.code(404)
        return { success: false, error: 'Usuario no encontrado en esta empresa' }
      }
      if (member[0].membershipRole !== 'USER') {
        reply.code(400)
        return { success: false, error: 'Solo los usuarios con rol USER tienen locales asignados. Los owners y admins tienen acceso a todos.' }
      }

      const idsToAssign: string[] = []
      if (Array.isArray(storeIds) && storeIds.length > 0) {
        for (const sid of storeIds) {
          const rows = await sqlQuery<{ id: string }>(sql`
            SELECT id FROM stores WHERE id = ${sid} AND "companyId" = ${companyId} LIMIT 1
          `)
          if (rows.length > 0) idsToAssign.push(sid)
        }
      }

      await sql`
        DELETE FROM user_stores us
        USING stores s
        WHERE us."storeId" = s.id AND s."companyId" = ${companyId} AND us."userId" = ${userId}
      `
      for (const storeId of idsToAssign) {
        await sql`
          INSERT INTO user_stores (id, "userId", "storeId", "createdAt")
          VALUES (gen_random_uuid(), ${userId}, ${storeId}, NOW())
          ON CONFLICT ("userId", "storeId") DO NOTHING
        `
      }

      return { success: true, data: { storeIds: idsToAssign } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })
}
