import { FastifyInstance } from 'fastify'
import { prisma } from '../db/index.js'
import { requireAuth } from '../lib/auth.js'
import { userDisplayName } from '../lib/auth.js'
import { canAccessCompany, canManageMembers } from '../lib/permissions.js'
import { sendForbidden, sendServerError } from '../lib/errors.js'
import bcrypt from 'bcryptjs'

export async function companyMembersRoutes(fastify: FastifyInstance) {
  // GET /api/companies/:companyId/members - List company members
  fastify.get<{
    Params: { companyId: string }
    Headers: { authorization?: string }
  }>('/api/companies/:companyId/members', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }

      const members = await prisma.companyMember.findMany({
        where: { companyId },
        include: { user: true },
      })

      const roleOrder = { OWNER: 0, ADMIN: 1, USER: 2 }
      const nonSuperuser = members
        .filter((m) => !m.user.isSuperuser)
        .sort((a, b) => {
          const oa = roleOrder[a.membershipRole as keyof typeof roleOrder] ?? 3
          const ob = roleOrder[b.membershipRole as keyof typeof roleOrder] ?? 3
          if (oa !== ob) return oa - ob
          const na = `${a.user.firstName} ${a.user.lastName}`.trim()
          const nb = `${b.user.firstName} ${b.user.lastName}`.trim()
          return na.localeCompare(nb)
        })

      const data = await Promise.all(
        nonSuperuser.map(async (m) => {
          const base = {
            id: m.id,
            userId: m.userId,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            name: userDisplayName(m.user),
            membershipRole: m.membershipRole,
            createdAt: m.createdAt,
          }
          if (m.membershipRole === 'USER') {
            const userStores = await prisma.userStore.findMany({
              where: {
                userId: m.userId,
                store: { companyId },
              },
              select: { storeId: true },
            })
            return { ...base, storeIds: userStores.map((us) => us.storeId) }
          }
          return base
        })
      )

      return { success: true, data }
    } catch (error) {
      return sendServerError(reply, error, fastify.log)
    }
  })

  // POST /api/companies/:companyId/members - Create user and add as company member
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
  }>('/api/companies/:companyId/members', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }
      if (!canManageMembers(decoded)) {
        return sendForbidden(reply, 'Solo el owner o un admin pueden crear usuarios')
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

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (existing) {
        reply.code(400)
        return { success: false, error: 'Ya existe un usuario con este email' }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      })

      await prisma.companyMember.create({
        data: {
          userId: user.id,
          companyId,
          membershipRole,
        },
      })

      if (membershipRole === 'USER') {
        let idsToAssign: string[] = []
        if (Array.isArray(storeIds) && storeIds.length > 0) {
          const validStores = await prisma.store.findMany({
            where: { id: { in: storeIds }, companyId },
            select: { id: true },
          })
          idsToAssign = validStores.map((s) => s.id)
        } else {
          const allStores = await prisma.store.findMany({
            where: { companyId, active: true },
            select: { id: true },
          })
          idsToAssign = allStores.map((s) => s.id)
        }
        for (const storeId of idsToAssign) {
          await prisma.userStore.upsert({
            where: {
              userId_storeId: { userId: user.id, storeId },
            },
            create: { userId: user.id, storeId },
            update: {},
          })
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

  // PUT /api/companies/:companyId/members/:userId/stores - Update stores for a USER member
  fastify.put<{
    Params: { companyId: string; userId: string }
    Headers: { authorization?: string }
    Body: { storeIds: string[] }
  }>('/api/companies/:companyId/members/:userId/stores', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { companyId, userId } = request.params
      const { storeIds } = request.body

      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }
      if (!canManageMembers(decoded)) {
        return sendForbidden(reply, 'Solo el owner o un admin pueden modificar locales de usuarios')
      }

      const member = await prisma.companyMember.findUnique({
        where: { userId_companyId: { userId, companyId } },
        select: { membershipRole: true },
      })
      if (!member) {
        reply.code(404)
        return { success: false, error: 'Usuario no encontrado en esta empresa' }
      }
      if (member.membershipRole !== 'USER') {
        reply.code(400)
        return { success: false, error: 'Solo los usuarios con rol USER tienen locales asignados. Los owners y admins tienen acceso a todos.' }
      }

      let idsToAssign: string[] = []
      if (Array.isArray(storeIds) && storeIds.length > 0) {
        const validStores = await prisma.store.findMany({
          where: { id: { in: storeIds }, companyId },
          select: { id: true },
        })
        idsToAssign = validStores.map((s) => s.id)
      }

      const companyStores = await prisma.store.findMany({
        where: { companyId },
        select: { id: true },
      })
      const companyStoreIds = companyStores.map((s) => s.id)

      await prisma.userStore.deleteMany({
        where: {
          userId,
          storeId: { in: companyStoreIds },
        },
      })

      for (const storeId of idsToAssign) {
        await prisma.userStore.upsert({
          where: { userId_storeId: { userId, storeId } },
          create: { userId, storeId },
          update: {},
        })
      }

      return { success: true, data: { storeIds: idsToAssign } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })
}
