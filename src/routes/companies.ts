import { FastifyInstance } from 'fastify'
import { prisma } from '../db/index.js'
import { requireAuth } from '../lib/auth.js'
import { canAccessCompany, isOwner, canManageCompany } from '../lib/permissions.js'
import { sendForbidden, sendNotFound, sendServerError } from '../lib/errors.js'
import { getCompanyModules } from '../lib/modules.js'

export async function companiesRoutes(fastify: FastifyInstance) {
  // GET /api/companies/:id - Get company details
  fastify.get<{
    Params: { id: string }
    Headers: { authorization?: string }
  }>('/api/companies/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { owner: true },
      })

      if (!company) {
        return sendNotFound(reply, 'Empresa no encontrada')
      }

      const modules = await getCompanyModules(company.id)
      const ownerName = company.owner
        ? `${company.owner.firstName || ''} ${company.owner.lastName || ''}`.trim() ||
          company.owner.email
        : ''

      const data = {
        id: company.id,
        name: company.name,
        parentId: company.parentId,
        ownerUserId: company.ownerUserId,
        owner: company.ownerUserId
          ? {
              id: company.ownerUserId,
              email: company.owner?.email || '',
              firstName: company.owner?.firstName || '',
              lastName: company.owner?.lastName || '',
              name: ownerName,
            }
          : null,
        modules,
        isActive: company.isActive,
        logo: company.logo,
        taxId: company.taxId,
        address: company.address,
        phone: company.phone,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      }

      reply.code(200)
      return { success: true, data }
    } catch (error) {
      return sendServerError(reply, error, fastify.log, 'Error al obtener la empresa')
    }
  })

  // GET /api/companies/:id/stats - Get company statistics
  fastify.get<{
    Params: { id: string }
    Headers: { authorization?: string }
  }>('/api/companies/:id/stats', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      const [totalMembers, ownerCount, adminCount, userCount, lastMember] = await Promise.all([
        prisma.companyMember.count({ where: { companyId } }),
        prisma.companyMember.count({
          where: { companyId, membershipRole: 'OWNER' },
        }),
        prisma.companyMember.count({
          where: { companyId, membershipRole: 'ADMIN' },
        }),
        prisma.companyMember.count({
          where: { companyId, membershipRole: 'USER' },
        }),
        prisma.companyMember.findFirst({
          where: { companyId },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      const lastMemberData = lastMember
        ? {
            userId: lastMember.userId,
            email: lastMember.user.email,
            firstName: lastMember.user.firstName,
            lastName: lastMember.user.lastName,
            name: `${lastMember.user.firstName || ''} ${lastMember.user.lastName || ''}`.trim() ||
              lastMember.user.email,
            membershipRole: lastMember.membershipRole,
            createdAt: lastMember.createdAt,
          }
        : null

      reply.code(200)
      return {
        success: true,
        data: {
          totalMembers,
          ownerCount,
          adminCount,
          userCount,
          lastMember: lastMemberData,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: 'Error al obtener estadísticas de la empresa' }
    }
  })

  // PUT /api/companies/:id - Update company
  fastify.put<{
    Params: { id: string }
    Headers: { authorization?: string }
    Body: {
      name?: string
      workifyEnabled?: boolean
      shopflowEnabled?: boolean
      technicalServicesEnabled?: boolean
      logo?: string
      taxId?: string
      address?: string
      phone?: string
    }
  }>('/api/companies/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }

      const {
        name,
        workifyEnabled,
        shopflowEnabled,
        technicalServicesEnabled,
        logo,
        taxId,
        address,
        phone,
      } = request.body

      if (
        (workifyEnabled !== undefined ||
          shopflowEnabled !== undefined ||
          technicalServicesEnabled !== undefined) &&
        !isOwner(decoded)
      ) {
        reply.code(403)
        return {
          success: false,
          error: 'Solo el propietario puede activar/desactivar módulos',
        }
      }

      if (!canManageCompany(decoded)) {
        reply.code(403)
        return { success: false, error: 'No tienes permisos para editar esta empresa' }
      }

      const companyUpdate: Record<string, unknown> = {}
      if (name !== undefined) companyUpdate.name = name
      if (logo !== undefined) companyUpdate.logo = logo
      if (taxId !== undefined) companyUpdate.taxId = taxId
      if (address !== undefined) companyUpdate.address = address
      if (phone !== undefined) companyUpdate.phone = phone

      if (Object.keys(companyUpdate).length > 0) {
        await prisma.company.update({
          where: { id: companyId },
          data: companyUpdate,
        })
      }

      if (
        workifyEnabled !== undefined ||
        shopflowEnabled !== undefined ||
        technicalServicesEnabled !== undefined
      ) {
        const [workifyMod, shopflowMod, techservicesMod] = await Promise.all([
          prisma.module.findUnique({ where: { key: 'workify' } }),
          prisma.module.findUnique({ where: { key: 'shopflow' } }),
          prisma.module.findUnique({ where: { key: 'techservices' } }),
        ])

        const updates: { moduleId: string; enabled: boolean }[] = []
        if (workifyEnabled !== undefined && workifyMod)
          updates.push({ moduleId: workifyMod.id, enabled: workifyEnabled })
        if (shopflowEnabled !== undefined && shopflowMod)
          updates.push({ moduleId: shopflowMod.id, enabled: shopflowEnabled })
        if (technicalServicesEnabled !== undefined && techservicesMod)
          updates.push({ moduleId: techservicesMod.id, enabled: technicalServicesEnabled })

        for (const { moduleId, enabled } of updates) {
          await prisma.companyModule.upsert({
            where: {
              companyId_moduleId: { companyId, moduleId },
            },
            create: { companyId, moduleId, enabled },
            update: { enabled },
          })
        }
      }

      const updated = await prisma.company.findUnique({
        where: { id: companyId },
      })
      if (!updated) {
        return sendNotFound(reply, 'Empresa no encontrada')
      }

      const modules = await getCompanyModules(updated.id)

      reply.code(200)
      return {
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          modules,
          updatedAt: updated.updatedAt,
        },
        message: 'Empresa actualizada correctamente',
      }
    } catch (error: unknown) {
      fastify.log.error(error)
      const err = error as { message?: string; code?: string }
      if (err?.code === 'P2002' || err?.message?.includes('unique constraint')) {
        reply.code(409)
        return { success: false, error: 'Ya existe una empresa con ese nombre' }
      }
      reply.code(500)
      return { success: false, error: 'Error al actualizar la empresa' }
    }
  })

  // DELETE /api/companies/:id - Delete company (OWNER only)
  fastify.delete<{
    Params: { id: string }
    Headers: { authorization?: string }
  }>('/api/companies/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        return sendForbidden(reply, 'No tienes acceso a esta empresa')
      }

      if (!isOwner(decoded)) {
        reply.code(403)
        return { success: false, error: 'Solo el propietario puede eliminar la empresa' }
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true },
      })

      if (!company) {
        reply.code(404)
        return { success: false, error: 'Empresa no encontrada' }
      }

      await prisma.company.delete({ where: { id: companyId } })

      reply.code(200)
      return {
        success: true,
        message: 'Empresa eliminada correctamente',
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: 'Error al eliminar la empresa' }
    }
  })
}
