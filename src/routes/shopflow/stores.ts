import { FastifyInstance } from 'fastify'
import { prisma } from '../../db/index.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireShopflowContext } from '../../lib/auth-context.js'

export type Store = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export async function shopflowStoresRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { includeInactive?: string } }>(
    '/api/shopflow/stores',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { includeInactive } = request.query

        const hasFullStoreAccess =
          ctx.isSuperuser || ctx.membershipRole === 'OWNER' || ctx.membershipRole === 'ADMIN'

        const stores = hasFullStoreAccess
          ? await prisma.store.findMany({
              where: {
                companyId: ctx.companyId,
                ...(includeInactive !== 'true' ? { active: true } : {}),
              },
              orderBy: { name: 'asc' },
            })
          : await prisma.store.findMany({
              where: {
                companyId: ctx.companyId,
                ...(includeInactive !== 'true' ? { active: true } : {}),
                userStores: { some: { userId: ctx.userId } },
              },
              orderBy: { name: 'asc' },
            })

        return { success: true, data: stores }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return { success: false, error: 'Error al obtener tiendas', message: errorMessage }
      }
    }
  )

  fastify.get<{ Params: { code: string } }>(
    '/api/shopflow/stores/by-code/:code',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { code } = request.params
        const decodedCode = decodeURIComponent(code)

        const hasFullStoreAccess =
          ctx.isSuperuser || ctx.membershipRole === 'OWNER' || ctx.membershipRole === 'ADMIN'

        const store = hasFullStoreAccess
          ? await prisma.store.findFirst({
              where: { companyId: ctx.companyId, code: decodedCode },
            })
          : await prisma.store.findFirst({
              where: {
                companyId: ctx.companyId,
                code: decodedCode,
                userStores: { some: { userId: ctx.userId } },
              },
            })

        if (!store) {
          reply.code(404)
          return { success: false, error: 'Tienda no encontrada' }
        }
        return { success: true, data: store }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return { success: false, error: 'Error al obtener tienda', message: errorMessage }
      }
    }
  )

  fastify.get<{ Params: { id: string } }>(
    '/api/shopflow/stores/:id',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { id } = request.params

        const hasFullStoreAccess =
          ctx.isSuperuser || ctx.membershipRole === 'OWNER' || ctx.membershipRole === 'ADMIN'

        const store = hasFullStoreAccess
          ? await prisma.store.findFirst({
              where: { id, companyId: ctx.companyId },
            })
          : await prisma.store.findFirst({
              where: {
                id,
                companyId: ctx.companyId,
                userStores: { some: { userId: ctx.userId } },
              },
            })

        if (!store) {
          reply.code(404)
          return { success: false, error: 'Tienda no encontrada' }
        }
        return { success: true, data: store }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return { success: false, error: 'Error al obtener tienda', message: errorMessage }
      }
    }
  )

  fastify.post<{
    Body: {
      name: string
      code: string
      address?: string | null
      phone?: string | null
      email?: string | null
      taxId?: string | null
    }
  }>('/api/shopflow/stores', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const { name, code, address, phone, email, taxId } = request.body

      const store = await prisma.store.create({
        data: {
          companyId: ctx.companyId,
          name,
          code,
          address: address ?? null,
          phone: phone ?? null,
          email: email ?? null,
          taxId: taxId ?? null,
        },
      })
      return { success: true, data: store }
    } catch (error: unknown) {
      fastify.log.error(error)
      reply.code(500)
      const err = error as { code?: string }
      if (err?.code === 'P2002') {
        reply.code(409)
        return { success: false, error: 'El código de tienda ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { success: false, error: 'Error al crear tienda', message: errorMessage }
    }
  })

  fastify.put<{
    Params: { id: string }
    Body: Partial<{
      name: string
      code: string
      address: string | null
      phone: string | null
      email: string | null
      taxId: string | null
      active: boolean
    }>
  }>('/api/shopflow/stores/:id', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const { id } = request.params
      const body = request.body

      const existing = await prisma.store.findFirst({
        where: { id, companyId: ctx.companyId },
      })
      if (!existing) {
        reply.code(404)
        return { success: false, error: 'Tienda no encontrada' }
      }

      const updateData: Record<string, unknown> = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.code !== undefined) updateData.code = body.code
      if (body.address !== undefined) updateData.address = body.address
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.email !== undefined) updateData.email = body.email
      if (body.taxId !== undefined) updateData.taxId = body.taxId
      if (body.active !== undefined) updateData.active = body.active

      const store =
        Object.keys(updateData).length === 0
          ? existing
          : await prisma.store.update({
              where: { id },
              data: updateData,
            })

      return { success: true, data: store }
    } catch (error: unknown) {
      fastify.log.error(error)
      reply.code(500)
      const err = error as { code?: string }
      if (err?.code === 'P2002') {
        reply.code(409)
        return { success: false, error: 'El código de tienda ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return { success: false, error: 'Error al actualizar tienda', message: errorMessage }
    }
  })

  fastify.delete<{ Params: { id: string } }>(
    '/api/shopflow/stores/:id',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { id } = request.params

        const existing = await prisma.store.findFirst({
          where: { id, companyId: ctx.companyId },
        })
        if (!existing) {
          reply.code(404)
          return { success: false, error: 'Tienda no encontrada' }
        }

        await prisma.store.delete({ where: { id } })
        return { success: true, data: { id } }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return { success: false, error: 'Error al eliminar tienda', message: errorMessage }
      }
    }
  )
}
