import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireTechServicesContext } from './auth-helper.js'

type AssetInput = {
  name?: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  notes?: string | null
  isActive?: boolean
}

export async function techServicesAssetsRoutes(fastify: FastifyInstance) {
  // GET /api/techservices/assets
  fastify.get<{ Querystring: { search?: string; active?: string } }>(
    '/api/techservices/assets',
    { preHandler: [requireAuth, requireTechServicesContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)

      const { search, active } = request.query
      const activeFilter = typeof active === 'string' ? active === 'true' : undefined

      try {
        let query = sql`
          SELECT id, "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes, "isActive", "createdAt", "updatedAt"
          FROM technical_assets
          WHERE "companyId" = ${ctx.companyId}
        `

        if (activeFilter !== undefined) {
          query = sql`${query} AND "isActive" = ${activeFilter}`
        }

        if (search && search.trim()) {
          const term = `%${search.trim()}%`
          query = sql`${query} AND (
            name ILIKE ${term}
            OR COALESCE("serialNumber", '') ILIKE ${term}
            OR COALESCE("customerName", '') ILIKE ${term}
            OR COALESCE("customerEmail", '') ILIKE ${term}
            OR COALESCE("customerPhone", '') ILIKE ${term}
            OR COALESCE(brand, '') ILIKE ${term}
            OR COALESCE(model, '') ILIKE ${term}
          )`
        }

        query = sql`${query} ORDER BY name ASC, "createdAt" DESC`

        const assets = await sqlQuery(query)
        return { success: true, data: assets }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al listar activos' }
      }
    }
  )

  // GET /api/techservices/assets/:id
  fastify.get<{ Params: { id: string } }>(
    '/api/techservices/assets/:id',
    { preHandler: [requireAuth, requireTechServicesContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)

      const { id } = request.params
      try {
        const rows = await sqlQuery(sql`
          SELECT id, "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes, "isActive", "createdAt", "updatedAt"
          FROM technical_assets
          WHERE id = ${id} AND "companyId" = ${ctx.companyId}
          LIMIT 1
        `)

        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Activo no encontrado' }
        }

        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al obtener activo' }
      }
    }
  )

  // POST /api/techservices/assets
  fastify.post<{ Body: AssetInput }>(
    '/api/techservices/assets',
    { preHandler: [requireAuth, requireTechServicesContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)


      const { name, brand, model, serialNumber, customerName, customerEmail, customerPhone, notes } = request.body

      if (!name || !name.trim()) {
        reply.code(400)
        return { success: false, error: 'El nombre es requerido' }
      }

      try {
        const rows = await sqlQuery(sql`
          INSERT INTO technical_assets (
            "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes
          ) VALUES (
            ${ctx.companyId}, ${name.trim()}, ${brand ?? null}, ${model ?? null}, ${serialNumber ?? null}, ${customerName ?? null}, ${customerEmail ?? null}, ${customerPhone ?? null}, ${notes ?? null}
          )
          RETURNING id, "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes, "isActive", "createdAt", "updatedAt"
        `)

        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al crear activo' }
      }
    }
  )

  // PUT /api/techservices/assets/:id
  fastify.put<{ Params: { id: string }; Body: AssetInput }>(
    '/api/techservices/assets/:id',
    { preHandler: [requireAuth, requireTechServicesContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)

      const { id } = request.params
      const { name, brand, model, serialNumber, customerName, customerEmail, customerPhone, notes, isActive } = request.body

      try {
        const existing = await sqlQuery(sql`
          SELECT id FROM technical_assets WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Activo no encontrado' }
        }

        const updates: string[] = []
        const values: Array<string | boolean | null> = []

        if (name !== undefined) {
          updates.push(`name = $${values.length + 1}`)
          values.push(name)
        }
        if (brand !== undefined) {
          updates.push(`brand = $${values.length + 1}`)
          values.push(brand)
        }
        if (model !== undefined) {
          updates.push(`model = $${values.length + 1}`)
          values.push(model)
        }
        if (serialNumber !== undefined) {
          updates.push(`"serialNumber" = $${values.length + 1}`)
          values.push(serialNumber)
        }
        if (customerName !== undefined) {
          updates.push(`"customerName" = $${values.length + 1}`)
          values.push(customerName)
        }
        if (customerEmail !== undefined) {
          updates.push(`"customerEmail" = $${values.length + 1}`)
          values.push(customerEmail)
        }
        if (customerPhone !== undefined) {
          updates.push(`"customerPhone" = $${values.length + 1}`)
          values.push(customerPhone)
        }
        if (notes !== undefined) {
          updates.push(`notes = $${values.length + 1}`)
          values.push(notes)
        }
        if (isActive !== undefined) {
          updates.push(`"isActive" = $${values.length + 1}`)
          values.push(isActive)
        }

        if (updates.length === 0) {
          const rows = await sqlQuery(sql`
            SELECT id, "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes, "isActive", "createdAt", "updatedAt"
            FROM technical_assets
            WHERE id = ${id} AND "companyId" = ${ctx.companyId}
            LIMIT 1
          `)
          return { success: true, data: rows[0] }
        }

        const query = `
          UPDATE technical_assets
          SET ${updates.join(', ')}, "updatedAt" = NOW()
          WHERE id = $${values.length + 1} AND "companyId" = $${values.length + 2}
          RETURNING id, "companyId", name, brand, model, "serialNumber", "customerName", "customerEmail", "customerPhone", notes, "isActive", "createdAt", "updatedAt"
        `

        const rows = await sqlUnsafe(query, [...values, id, ctx.companyId])
        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar activo' }
      }
    }
  )

  // DELETE /api/techservices/assets/:id (soft delete)
  fastify.delete<{ Params: { id: string } }>(
    '/api/techservices/assets/:id',
    { preHandler: [requireAuth, requireTechServicesContext] },
    async (request, reply) => {
      const ctx = contextFromRequest(request)

      const { id } = request.params
      try {
        const rows = await sqlQuery(sql`
          UPDATE technical_assets
          SET "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "companyId" = ${ctx.companyId}
          RETURNING id
        `)

        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Activo no encontrado' }
        }

        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar activo' }
      }
    }
  )
}
