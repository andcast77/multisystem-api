import { FastifyInstance } from 'fastify'
import { sql } from '../db/neon.js'
import { verifyToken } from './auth.js'

export async function companiesRoutes(fastify: FastifyInstance) {
  const canAccessCompany = (decoded: { id: string; companyId?: string; isSuperuser?: boolean }, companyId: string) => {
    if (decoded.isSuperuser) return true
    if (decoded.companyId !== companyId) return false
    return true
  }

  const isOwner = (decoded: { membershipRole?: string; isSuperuser?: boolean }) => {
    if (decoded.isSuperuser) return true
    return decoded.membershipRole === 'OWNER'
  }

  const canManageCompany = (decoded: { membershipRole?: string; isSuperuser?: boolean }) => {
    if (decoded.isSuperuser) return true
    return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
  }

  // GET /api/companies/:id - Get company details
  fastify.get<{
    Params: { id: string }
    Headers: { authorization?: string }
  }>('/api/companies/:id', async (request, reply) => {
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

      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      type CompanyRow = {
        id: string
        name: string
        parentId: string | null
        ownerUserId: string | null
        workifyEnabled: boolean
        shopflowEnabled: boolean
        technicalServicesEnabled: boolean
        isActive: boolean
        logo: string | null
        taxId: string | null
        address: string | null
        phone: string | null
        createdAt: string
        updatedAt: string
        ownerEmail: string | null
        ownerFirstName: string | null
        ownerLastName: string | null
      }

      const companies = (await sql`
        SELECT 
          c.id, c.name, c."parentId", c."ownerUserId",
          c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled",
          c."isActive", c.logo, c."taxId", c.address, c.phone,
          c."createdAt", c."updatedAt",
          u.email as "ownerEmail", u."firstName" as "ownerFirstName", u."lastName" as "ownerLastName"
        FROM companies c
        LEFT JOIN users u ON u.id = c."ownerUserId"
        WHERE c.id = ${companyId}
      `) as CompanyRow[]

      if (companies.length === 0) {
        reply.code(404)
        return { success: false, error: 'Empresa no encontrada' }
      }

      const company = companies[0]
      const data = {
        id: company.id,
        name: company.name,
        parentId: company.parentId,
        ownerUserId: company.ownerUserId,
        owner: company.ownerUserId
          ? {
              id: company.ownerUserId,
              email: company.ownerEmail || '',
              firstName: company.ownerFirstName || '',
              lastName: company.ownerLastName || '',
              name: `${company.ownerFirstName || ''} ${company.ownerLastName || ''}`.trim() || company.ownerEmail || '',
            }
          : null,
        workifyEnabled: company.workifyEnabled,
        shopflowEnabled: company.shopflowEnabled,
        technicalServicesEnabled: company.technicalServicesEnabled,
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
      console.error('Error fetching company:', error)
      reply.code(500)
      return { success: false, error: 'Error al obtener la empresa' }
    }
  })

  // GET /api/companies/:id/stats - Get company statistics
  fastify.get<{
    Params: { id: string }
    Headers: { authorization?: string }
  }>('/api/companies/:id/stats', async (request, reply) => {
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

      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      // Get member counts
      type CountRow = { count: string }
      const totalMembersResult = (await sql`
        SELECT COUNT(*)::text as count
        FROM company_members
        WHERE "companyId" = ${companyId}
      `) as CountRow[]
      const totalMembers = parseInt(totalMembersResult[0]?.count || '0')

      const ownerCountResult = (await sql`
        SELECT COUNT(*)::text as count
        FROM company_members
        WHERE "companyId" = ${companyId} AND "membershipRole" = 'OWNER'
      `) as CountRow[]
      const ownerCount = parseInt(ownerCountResult[0]?.count || '0')

      const adminCountResult = (await sql`
        SELECT COUNT(*)::text as count
        FROM company_members
        WHERE "companyId" = ${companyId} AND "membershipRole" = 'ADMIN'
      `) as CountRow[]
      const adminCount = parseInt(adminCountResult[0]?.count || '0')

      const userCountResult = (await sql`
        SELECT COUNT(*)::text as count
        FROM company_members
        WHERE "companyId" = ${companyId} AND "membershipRole" = 'USER'
      `) as CountRow[]
      const userCount = parseInt(userCountResult[0]?.count || '0')

      // Get last member added
      type LastMemberRow = {
        userId: string
        email: string
        firstName: string
        lastName: string
        membershipRole: string
        createdAt: string
      }
      const lastMemberResult = (await sql`
        SELECT cm."userId", cm."membershipRole", cm."createdAt",
               u.email, u."firstName", u."lastName"
        FROM company_members cm
        JOIN users u ON u.id = cm."userId"
        WHERE cm."companyId" = ${companyId}
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      `) as LastMemberRow[]

      const lastMember = lastMemberResult[0]
        ? {
            userId: lastMemberResult[0].userId,
            email: lastMemberResult[0].email,
            firstName: lastMemberResult[0].firstName,
            lastName: lastMemberResult[0].lastName,
            name: `${lastMemberResult[0].firstName || ''} ${lastMemberResult[0].lastName || ''}`.trim() || lastMemberResult[0].email,
            membershipRole: lastMemberResult[0].membershipRole,
            createdAt: lastMemberResult[0].createdAt,
          }
        : null

      const data = {
        totalMembers,
        ownerCount,
        adminCount,
        userCount,
        lastMember,
      }

      reply.code(200)
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching company stats:', error)
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
  }>('/api/companies/:id', async (request, reply) => {
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

      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
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

      // Check if trying to modify module flags - only OWNER can do this
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

      // Check if user can manage company (OWNER or ADMIN)
      if (!canManageCompany(decoded)) {
        reply.code(403)
        return { success: false, error: 'No tienes permisos para editar esta empresa' }
      }

      // Build update object
      const updates: Record<string, any> = {}
      if (name !== undefined) updates.name = name
      if (workifyEnabled !== undefined) updates.workifyEnabled = workifyEnabled
      if (shopflowEnabled !== undefined) updates.shopflowEnabled = shopflowEnabled
      if (technicalServicesEnabled !== undefined) updates.technicalServicesEnabled = technicalServicesEnabled
      if (logo !== undefined) updates.logo = logo
      if (taxId !== undefined) updates.taxId = taxId
      if (address !== undefined) updates.address = address
      if (phone !== undefined) updates.phone = phone

      if (Object.keys(updates).length === 0) {
        reply.code(400)
        return { success: false, error: 'No se proporcionaron campos para actualizar' }
      }

      updates.updatedAt = new Date()

      // Build SQL update query dynamically
      const setClause = Object.keys(updates)
        .map((key, index) => `"${key}" = $${index + 2}`)
        .join(', ')
      const values = Object.values(updates)

      await sql.query(
        `UPDATE companies SET ${setClause} WHERE id = $1`,
        [companyId, ...values]
      )

      // Fetch updated company
      type CompanyRow = {
        id: string
        name: string
        workifyEnabled: boolean
        shopflowEnabled: boolean
        technicalServicesEnabled: boolean
        updatedAt: string
      }
      const updated = (await sql`
        SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled", "updatedAt"
        FROM companies
        WHERE id = ${companyId}
      `) as CompanyRow[]

      reply.code(200)
      return {
        success: true,
        data: updated[0],
        message: 'Empresa actualizada correctamente',
      }
    } catch (error: any) {
      console.error('Error updating company:', error)
      if (error?.message?.includes('unique constraint')) {
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
  }>('/api/companies/:id', async (request, reply) => {
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

      const { id: companyId } = request.params
      if (!canAccessCompany(decoded, companyId)) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      // Only OWNER can delete company
      if (!isOwner(decoded)) {
        reply.code(403)
        return { success: false, error: 'Solo el propietario puede eliminar la empresa' }
      }

      // Check if company exists
      type CompanyRow = { id: string; name: string }
      const companies = (await sql`
        SELECT id, name FROM companies WHERE id = ${companyId}
      `) as CompanyRow[]

      if (companies.length === 0) {
        reply.code(404)
        return { success: false, error: 'Empresa no encontrada' }
      }

      // Delete company (cascade will handle related records)
      await sql`DELETE FROM companies WHERE id = ${companyId}`

      reply.code(200)
      return {
        success: true,
        message: 'Empresa eliminada correctamente',
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      reply.code(500)
      return { success: false, error: 'Error al eliminar la empresa' }
    }
  })
}
