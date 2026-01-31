import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

const TRANSFER_STATUSES = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const

export async function shopflowInventoryTransfersRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/inventory-transfers - List with filters
  fastify.get<{
    Querystring: {
      fromStoreId?: string
      toStoreId?: string
      productId?: string
      status?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/inventory-transfers', async (request, reply) => {
    try {
      const { fromStoreId, toStoreId, productId, status, page = '1', limit = '20' } = request.query
      const pageNum = parseInt(page)
      const limitNum = Math.min(parseInt(limit) || 20, 100)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT id, "fromStoreId", "toStoreId", "productId", quantity, notes, status,
          "createdById", "completedAt", "createdAt", "updatedAt"
        FROM "inventoryTransfers"
        WHERE 1=1
      `
      if (fromStoreId) query = sql`${query} AND "fromStoreId" = ${fromStoreId}`
      if (toStoreId) query = sql`${query} AND "toStoreId" = ${toStoreId}`
      if (productId) query = sql`${query} AND "productId" = ${productId}`
      if (status && TRANSFER_STATUSES.includes(status as any)) {
        query = sql`${query} AND status = ${status}`
      }

      const countResult = await sqlQuery<{ total: string }>(sql`
        SELECT COUNT(*) as total FROM "inventoryTransfers" t
        WHERE 1=1
        ${fromStoreId ? sql`AND t."fromStoreId" = ${fromStoreId}` : sql``}
        ${toStoreId ? sql`AND t."toStoreId" = ${toStoreId}` : sql``}
        ${productId ? sql`AND t."productId" = ${productId}` : sql``}
        ${status && TRANSFER_STATUSES.includes(status as any) ? sql`AND t.status = ${status}` : sql``}
      `)
      const total = parseInt(countResult[0]?.total || '0')

      query = sql`
        ${query}
        ORDER BY "createdAt" DESC
        LIMIT ${limitNum} OFFSET ${skip}
      `
      const transfers = await sqlQuery<any>(query)

      return {
        success: true,
        data: {
          transfers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener transferencias',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/inventory-transfers - Create transfer
  fastify.post<{
    Body: {
      fromStoreId: string
      toStoreId: string
      productId: string
      quantity: number
      notes?: string | null
      createdById: string
    }
  }>('/api/shopflow/inventory-transfers', async (request, reply) => {
    try {
      const { fromStoreId, toStoreId, productId, quantity, notes, createdById } = request.body

      if (fromStoreId === toStoreId) {
        reply.code(400)
        return { success: false, error: 'Origen y destino no pueden ser la misma tienda' }
      }

      const product = await sqlQuery<any>(sql`
        SELECT id, stock, "storeId" FROM products WHERE id = ${productId} LIMIT 1
      `)
      if (product.length === 0) {
        reply.code(404)
        return { success: false, error: 'Producto no encontrado' }
      }
      if (product[0].stock < quantity) {
        reply.code(400)
        return { success: false, error: 'Stock insuficiente' }
      }

      const transfer = await sqlQuery<any>(sql`
        INSERT INTO "inventoryTransfers" (
          "fromStoreId", "toStoreId", "productId", quantity, notes, status, "createdById"
        )
        VALUES (${fromStoreId}, ${toStoreId}, ${productId}, ${quantity}, ${notes ?? null}, 'PENDING', ${createdById})
        RETURNING id, "fromStoreId", "toStoreId", "productId", quantity, notes, status,
          "createdById", "completedAt", "createdAt", "updatedAt"
      `)

      return { success: true, data: transfer[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear transferencia',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/inventory-transfers/:id/complete
  fastify.post<{ Params: { id: string } }>(
    '/api/shopflow/inventory-transfers/:id/complete',
    async (request, reply) => {
      try {
        const { id } = request.params

        const existing = await sqlQuery<any>(sql`
          SELECT id, status, "productId", quantity, "fromStoreId", "toStoreId"
          FROM "inventoryTransfers" WHERE id = ${id} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Transferencia no encontrada' }
        }
        if (existing[0].status !== 'PENDING' && existing[0].status !== 'IN_TRANSIT') {
          reply.code(400)
          return { success: false, error: 'Solo se pueden completar transferencias pendientes' }
        }

        const qty = existing[0].quantity
        const fromStoreId = existing[0].fromStoreId
        const toStoreId = existing[0].toStoreId
        const productId = existing[0].productId

        await sqlQuery(sql`
          UPDATE products SET stock = stock - ${qty}, "updatedAt" = NOW()
          WHERE id = ${productId} AND ("storeId" IS NOT DISTINCT FROM ${fromStoreId})
        `)
        await sqlQuery(sql`
          UPDATE products SET "storeId" = ${toStoreId}, "updatedAt" = NOW()
          WHERE id = ${productId}
        `)
        await sqlQuery(sql`
          UPDATE "inventoryTransfers"
          SET status = 'COMPLETED', "completedAt" = NOW(), "updatedAt" = NOW()
          WHERE id = ${id}
        `)

        const updated = await sqlQuery<any>(sql`
          SELECT id, "fromStoreId", "toStoreId", "productId", quantity, notes, status,
            "createdById", "completedAt", "createdAt", "updatedAt"
          FROM "inventoryTransfers" WHERE id = ${id} LIMIT 1
        `)
        return { success: true, data: updated[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al completar transferencia',
          message: errorMessage,
        }
      }
    }
  )

  // POST /api/shopflow/inventory-transfers/:id/cancel
  fastify.post<{ Params: { id: string } }>(
    '/api/shopflow/inventory-transfers/:id/cancel',
    async (request, reply) => {
      try {
        const { id } = request.params

        const existing = await sqlQuery<any>(sql`
          SELECT id, status FROM "inventoryTransfers" WHERE id = ${id} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Transferencia no encontrada' }
        }
        if (existing[0].status === 'COMPLETED') {
          reply.code(400)
          return { success: false, error: 'No se puede cancelar una transferencia completada' }
        }

        await sqlQuery(sql`
          UPDATE "inventoryTransfers"
          SET status = 'CANCELLED', "updatedAt" = NOW()
          WHERE id = ${id}
        `)

        const updated = await sqlQuery<any>(sql`
          SELECT id, "fromStoreId", "toStoreId", "productId", quantity, notes, status,
            "createdById", "completedAt", "createdAt", "updatedAt"
          FROM "inventoryTransfers" WHERE id = ${id} LIMIT 1
        `)
        return { success: true, data: updated[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al cancelar transferencia',
          message: errorMessage,
        }
      }
    }
  )
}
