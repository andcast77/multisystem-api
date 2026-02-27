import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireShopflowContext } from '../../lib/auth-context.js'

export async function shopflowTicketConfigRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/ticket-config - Get ticket configuration
  fastify.get<{ Querystring: { storeId?: string } }>(
    '/api/shopflow/ticket-config',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { storeId } = request.query

        let config = await sqlQuery<any>(sql`
          SELECT 
            id, "companyId", "storeId", "ticketType", header, description, "logoUrl", footer,
            "defaultPrinterName", "thermalWidth", "fontSize", copies, "autoPrint",
            "createdAt", "updatedAt"
          FROM ticket_configs
          WHERE "companyId" = ${ctx.companyId} AND "storeId" IS NOT DISTINCT FROM ${storeId || null}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `)

        if (config.length === 0) {
          // Create default config for this company
          const defaultConfig = await sqlQuery<any>(sql`
            INSERT INTO ticket_configs (
              "companyId", "storeId", "ticketType", "thermalWidth", "fontSize", copies, "autoPrint"
            )
            VALUES (
              ${ctx.companyId}, ${storeId || null}, 'TICKET', 80, 12, 1, true
            )
            RETURNING 
              id, "companyId", "storeId", "ticketType", header, description, "logoUrl", footer,
              "defaultPrinterName", "thermalWidth", "fontSize", copies, "autoPrint",
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
          error: 'Error al obtener configuración de tickets',
          message: errorMessage,
        }
      }
    }
  )

  // PUT /api/shopflow/ticket-config - Update ticket configuration
  fastify.put<{
    Querystring: { storeId?: string }
    Body: {
      storeId?: string | null
      ticketType?: string
      header?: string | null
      description?: string | null
      logoUrl?: string | null
      footer?: string | null
      defaultPrinterName?: string | null
      thermalWidth?: number
      fontSize?: number
      copies?: number
      autoPrint?: boolean
    }
  }>('/api/shopflow/ticket-config', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const { storeId } = request.query
      const body = request.body

      // Get current config (company-scoped)
      const current = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM ticket_configs
        WHERE "companyId" = ${ctx.companyId} AND "storeId" IS NOT DISTINCT FROM ${storeId || null}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (current.length === 0) {
        // Create if doesn't exist for this company
        const newConfig = await sqlQuery<any>(sql`
          INSERT INTO ticket_configs (
            "companyId", "storeId", "ticketType", header, description, "logoUrl", footer,
            "defaultPrinterName", "thermalWidth", "fontSize", copies, "autoPrint"
          )
          VALUES (
            ${ctx.companyId}, ${body.storeId ?? storeId ?? null}, ${body.ticketType ?? 'TICKET'}, 
            ${body.header ?? null}, ${body.description ?? null}, ${body.logoUrl ?? null}, ${body.footer ?? null},
            ${body.defaultPrinterName ?? null}, ${body.thermalWidth ?? 80}, 
            ${body.fontSize ?? 12}, ${body.copies ?? 1}, ${body.autoPrint ?? true}
          )
          RETURNING 
            id, "companyId", "storeId", "ticketType", header, description, "logoUrl", footer,
            "defaultPrinterName", "thermalWidth", "fontSize", copies, "autoPrint",
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

      if (body.storeId !== undefined) {
        updates.push(`"storeId" = $${values.length + 1}`)
        values.push(body.storeId)
      }
      if (body.ticketType !== undefined) {
        updates.push(`"ticketType" = $${values.length + 1}`)
        values.push(body.ticketType)
      }
      if (body.header !== undefined) {
        updates.push(`header = $${values.length + 1}`)
        values.push(body.header)
      }
      if (body.description !== undefined) {
        updates.push(`description = $${values.length + 1}`)
        values.push(body.description)
      }
      if (body.logoUrl !== undefined) {
        updates.push(`"logoUrl" = $${values.length + 1}`)
        values.push(body.logoUrl)
      }
      if (body.footer !== undefined) {
        updates.push(`footer = $${values.length + 1}`)
        values.push(body.footer)
      }
      if (body.defaultPrinterName !== undefined) {
        updates.push(`"defaultPrinterName" = $${values.length + 1}`)
        values.push(body.defaultPrinterName)
      }
      if (body.thermalWidth !== undefined) {
        updates.push(`"thermalWidth" = $${values.length + 1}`)
        values.push(body.thermalWidth)
      }
      if (body.fontSize !== undefined) {
        updates.push(`"fontSize" = $${values.length + 1}`)
        values.push(body.fontSize)
      }
      if (body.copies !== undefined) {
        updates.push(`copies = $${values.length + 1}`)
        values.push(body.copies)
      }
      if (body.autoPrint !== undefined) {
        updates.push(`"autoPrint" = $${values.length + 1}`)
        values.push(body.autoPrint)
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
        UPDATE ticket_configs 
        SET ${updates.join(', ')}
        WHERE id = $${idParam} AND "companyId" = $${companyParam}
        RETURNING 
          id, "companyId", "storeId", "ticketType", header, description, "logoUrl", footer,
          "defaultPrinterName", "thermalWidth", "fontSize", copies, "autoPrint",
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
        error: 'Error al actualizar configuración de tickets',
        message: errorMessage,
      }
    }
  })
}
