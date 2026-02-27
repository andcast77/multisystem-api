import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireShopflowContext } from '../../lib/auth-context.js'

export type StoreConfig = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  currency: string
  taxRate: number
  lowStockAlert: number
  invoicePrefix: string
  invoiceNumber: number
  allowSalesWithoutStock: boolean
  createdAt: Date
  updatedAt: Date
}

export async function shopflowStoreConfigRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/store-config - Get store configuration
  fastify.get('/api/shopflow/store-config', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const config = await sqlQuery<any>(sql`
        SELECT 
          id, "companyId", name, address, phone, email, "taxId", currency, "taxRate", 
          "lowStockAlert", "invoicePrefix", "invoiceNumber", "allowSalesWithoutStock",
          "createdAt", "updatedAt"
        FROM store_configs
        WHERE "companyId" = ${ctx.companyId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (config.length === 0) {
        // Create default config if none exists for this company
        const defaultConfig = await sqlQuery<any>(sql`
          INSERT INTO store_configs (
            "companyId", name, currency, "taxRate", "lowStockAlert", "invoicePrefix", 
            "invoiceNumber", "allowSalesWithoutStock"
          )
          VALUES (
            ${ctx.companyId}, 'My Store', 'USD', 0, 10, 'INV-', 1, false
          )
          RETURNING 
            id, "companyId", name, address, phone, email, "taxId", currency, "taxRate", 
            "lowStockAlert", "invoicePrefix", "invoiceNumber", "allowSalesWithoutStock",
            "createdAt", "updatedAt"
        `)

        return {
          success: true,
          data: defaultConfig[0],
        }
      }

      return {
        success: true,
        data: config[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener configuración de tienda',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/store-config - Update store configuration
  fastify.put<{ Body: Partial<StoreConfig> }>('/api/shopflow/store-config', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const {
        name,
        address,
        phone,
        email,
        taxId,
        currency,
        taxRate,
        lowStockAlert,
        invoicePrefix,
        allowSalesWithoutStock,
      } = request.body

      // Get current config (company-scoped)
      const current = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM store_configs
        WHERE "companyId" = ${ctx.companyId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (current.length === 0) {
        // Create if doesn't exist for this company
        const newConfig = await sqlQuery<any>(sql`
          INSERT INTO store_configs (
            "companyId", name, address, phone, email, "taxId", currency, "taxRate", 
            "lowStockAlert", "invoicePrefix", "invoiceNumber", "allowSalesWithoutStock"
          )
          VALUES (
            ${ctx.companyId}, ${name ?? 'My Store'}, ${address ?? null}, ${phone ?? null}, ${email ?? null}, ${taxId ?? null}, 
            ${currency ?? 'USD'}, ${taxRate ?? 0}, ${lowStockAlert ?? 10}, 
            ${invoicePrefix ?? 'INV-'}, 1, ${allowSalesWithoutStock ?? false}
          )
          RETURNING 
            id, "companyId", name, address, phone, email, "taxId", currency, "taxRate", 
            "lowStockAlert", "invoicePrefix", "invoiceNumber", "allowSalesWithoutStock",
            "createdAt", "updatedAt"
        `)

        return {
          success: true,
          data: newConfig[0],
        }
      }

      // Build update query
      const updates: string[] = []
      const values: any[] = []

      if (name !== undefined) {
        updates.push(`name = $${values.length + 1}`)
        values.push(name)
      }
      if (address !== undefined) {
        updates.push(`address = $${values.length + 1}`)
        values.push(address)
      }
      if (phone !== undefined) {
        updates.push(`phone = $${values.length + 1}`)
        values.push(phone)
      }
      if (email !== undefined) {
        updates.push(`email = $${values.length + 1}`)
        values.push(email)
      }
      if (taxId !== undefined) {
        updates.push(`"taxId" = $${values.length + 1}`)
        values.push(taxId)
      }
      if (currency !== undefined) {
        updates.push(`currency = $${values.length + 1}`)
        values.push(currency)
      }
      if (taxRate !== undefined) {
        updates.push(`"taxRate" = $${values.length + 1}`)
        values.push(taxRate)
      }
      if (lowStockAlert !== undefined) {
        updates.push(`"lowStockAlert" = $${values.length + 1}`)
        values.push(lowStockAlert)
      }
      if (invoicePrefix !== undefined) {
        updates.push(`"invoicePrefix" = $${values.length + 1}`)
        values.push(invoicePrefix)
      }
      if (allowSalesWithoutStock !== undefined) {
        updates.push(`"allowSalesWithoutStock" = $${values.length + 1}`)
        values.push(allowSalesWithoutStock)
      }

      if (updates.length === 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No hay campos para actualizar',
        }
      }

      updates.push(`"updatedAt" = NOW()`)
      values.push(ctx.companyId, current[0].id)

      const idParam = values.length
      const companyParam = values.length - 1
      const query = `
        UPDATE store_configs 
        SET ${updates.join(', ')}
        WHERE id = $${idParam} AND "companyId" = $${companyParam}
        RETURNING 
          id, "companyId", name, address, phone, email, "taxId", currency, "taxRate", 
          "lowStockAlert", "invoicePrefix", "invoiceNumber", "allowSalesWithoutStock",
          "createdAt", "updatedAt"
      `

      const updated = await sqlUnsafe<any>(query, values)

      return {
        success: true,
        data: updated[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar configuración de tienda',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/store-config/next-invoice-number - Get next invoice number
  fastify.post('/api/shopflow/store-config/next-invoice-number', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const config = await sqlQuery<any>(sql`
        SELECT "invoicePrefix", "invoiceNumber"
        FROM store_configs
        WHERE "companyId" = ${ctx.companyId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (config.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Configuración de tienda no encontrada',
        }
      }

      // Increment invoice number (company-scoped)
      const updated = await sqlQuery<any>(sql`
        UPDATE store_configs
        SET "invoiceNumber" = "invoiceNumber" + 1,
            "updatedAt" = NOW()
        WHERE "companyId" = ${ctx.companyId}
        AND id = (SELECT id FROM store_configs WHERE "companyId" = ${ctx.companyId} ORDER BY "createdAt" DESC LIMIT 1)
        RETURNING "invoicePrefix", "invoiceNumber"
      `)

      const invoiceNumber = `${updated[0].invoicePrefix}${updated[0].invoiceNumber.toString().padStart(6, '0')}`

      return {
        success: true,
        data: { invoiceNumber },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener siguiente número de factura',
        message: errorMessage,
      }
    }
  })
}
