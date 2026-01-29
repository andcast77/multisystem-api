import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'

export type Sale = {
  id: string
  customerId: string | null
  userId: string
  invoiceNumber: string | null
  total: number
  subtotal: number
  tax: number
  discount: number | null
  status: string
  paymentMethod: string | null
  paidAmount: number
  change: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export type SaleItem = {
  id: string
  saleId: string
  productId: string
  quantity: number
  price: number
  discount: number
  subtotal: number
}

export async function shopflowSalesRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/sales - List sales with filters
  fastify.get<{
    Querystring: {
      customerId?: string
      userId?: string
      status?: string
      paymentMethod?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/sales', async (request, reply) => {
    try {
      const {
        customerId,
        userId,
        status,
        paymentMethod,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = request.query

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT 
          s.id,
          s."customerId",
          s."userId",
          s."invoiceNumber",
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.status,
          s."paymentMethod",
          s."paidAmount",
          s.change,
          s.notes,
          s."createdAt",
          s."updatedAt"
        FROM sales s
        WHERE 1=1
      `

      if (customerId) {
        query = sql`${query} AND s."customerId" = ${customerId}`
      }

      if (userId) {
        query = sql`${query} AND s."userId" = ${userId}`
      }

      if (status) {
        query = sql`${query} AND s.status = ${status}`
      }

      if (paymentMethod) {
        query = sql`${query} AND s."paymentMethod" = ${paymentMethod}`
      }

      if (startDate) {
        query = sql`${query} AND s."createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND s."createdAt" <= ${new Date(endDate)}`
      }

      // Get total count for pagination - build count query separately
      let countQuery = sql`
        SELECT COUNT(*) as total
        FROM sales s
        WHERE 1=1
      `
      
      if (customerId) {
        countQuery = sql`${countQuery} AND s."customerId" = ${customerId}`
      }
      if (userId) {
        countQuery = sql`${countQuery} AND s."userId" = ${userId}`
      }
      if (status) {
        countQuery = sql`${countQuery} AND s.status = ${status}`
      }
      if (paymentMethod) {
        countQuery = sql`${countQuery} AND s."paymentMethod" = ${paymentMethod}`
      }
      if (startDate) {
        countQuery = sql`${countQuery} AND s."createdAt" >= ${new Date(startDate)}`
      }
      if (endDate) {
        countQuery = sql`${countQuery} AND s."createdAt" <= ${new Date(endDate)}`
      }
      
      const countResult = await sqlQuery<{ total: string }>(countQuery)
      const total = parseInt(countResult[0]?.total || '0')

      // Get paginated results
      query = sql`
        ${query}
        ORDER BY s."createdAt" DESC
        LIMIT ${limitNum} OFFSET ${skip}
      `

      const sales = await sqlQuery<any>(query)

      // Get related data for each sale
      const salesWithRelations = await Promise.all(
        sales.map(async (sale: any) => {
          // Get customer
          const customer = sale.customerId
            ? await sqlQuery<any>(sql`
                SELECT id, name, email, phone
                FROM customers
                WHERE id = ${sale.customerId}
                LIMIT 1
              `)
            : []

          // Get user
          const user = await sqlQuery<any>(sql`
            SELECT id, name, email
            FROM users
            WHERE id = ${sale.userId}
            LIMIT 1
          `)

          // Get items
          const items = await sqlQuery<any>(sql`
            SELECT 
              si.id,
              si."saleId",
              si."productId",
              si.quantity,
              si.price,
              si.discount,
              si.subtotal,
              p.id as product_id,
              p.name as product_name,
              p.sku as product_sku
            FROM "saleItems" si
            JOIN products p ON p.id = si."productId"
            WHERE si."saleId" = ${sale.id}
          `)

          return {
            ...sale,
            customer: customer.length > 0 ? customer[0] : null,
            user: user.length > 0 ? user[0] : null,
            items: items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              subtotal: item.subtotal,
              product: {
                id: item.product_id,
                name: item.product_name,
                sku: item.product_sku,
              },
            })),
          }
        })
      )

      return {
        success: true,
        data: {
          sales: salesWithRelations,
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
        error: 'Error al obtener ventas',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/sales/:id - Get sale by ID
  fastify.get<{ Params: { id: string } }>('/api/shopflow/sales/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const sale = await sqlQuery<any>(sql`
        SELECT 
          s.id,
          s."customerId",
          s."userId",
          s."invoiceNumber",
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.status,
          s."paymentMethod",
          s."paidAmount",
          s.change,
          s.notes,
          s."createdAt",
          s."updatedAt"
        FROM sales s
        WHERE s.id = ${id}
        LIMIT 1
      `)

      if (sale.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Venta no encontrada',
        }
      }

      // Get customer
      const customer = sale[0].customerId
        ? await sqlQuery<any>(sql`
            SELECT id, name, email, phone
            FROM customers
            WHERE id = ${sale[0].customerId}
            LIMIT 1
          `)
        : []

      // Get user
      const user = await sqlQuery<any>(sql`
        SELECT id, name, email
        FROM users
        WHERE id = ${sale[0].userId}
        LIMIT 1
      `)

      // Get items
      const items = await sqlQuery<any>(sql`
        SELECT 
          si.id,
          si."saleId",
          si."productId",
          si.quantity,
          si.price,
          si.discount,
          si.subtotal,
          p.id as product_id,
          p.name as product_name,
          p.sku as product_sku,
          p.barcode as product_barcode,
          p.price as product_price
        FROM "saleItems" si
        JOIN products p ON p.id = si."productId"
        WHERE si."saleId" = ${id}
      `)

      return {
        success: true,
        data: {
          ...sale[0],
          customer: customer.length > 0 ? customer[0] : null,
          user: user.length > 0 ? user[0] : null,
          items: items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            subtotal: item.subtotal,
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.product_sku,
              barcode: item.product_barcode,
              price: item.product_price,
            },
          })),
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener venta',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/sales - Create sale
  fastify.post<{
    Body: {
      customerId?: string | null
      userId: string
      items: Array<{
        productId: string
        quantity: number
        price: number
        discount?: number
      }>
      paymentMethod: string
      paidAmount: number
      discount?: number
      taxRate?: number
      notes?: string | null
    }
  }>('/api/shopflow/sales', async (request, reply) => {
    try {
      const { customerId, userId, items, paymentMethod, paidAmount, discount = 0, taxRate, notes } =
        request.body

      // Validate all products exist and have enough stock
      for (const item of items) {
        const product = await sqlQuery<any>(sql`
          SELECT id, name, stock, active
          FROM products
          WHERE id = ${item.productId}
          LIMIT 1
        `)

        if (product.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: `Producto con ID ${item.productId} no encontrado`,
          }
        }

        if (!product[0].active) {
          reply.code(400)
          return {
            success: false,
            error: `El producto ${product[0].name} no está activo`,
          }
        }

        if (product[0].stock < item.quantity) {
          reply.code(400)
          return {
            success: false,
            error: `Stock insuficiente para el producto ${product[0].name}. Disponible: ${product[0].stock}, Solicitado: ${item.quantity}`,
          }
        }
      }

      // Validate customer exists if provided
      if (customerId) {
        const customer = await sqlQuery<any>(sql`
          SELECT id FROM customers WHERE id = ${customerId} LIMIT 1
        `)
        if (customer.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Cliente no encontrado',
          }
        }
      }

      // Get store config for tax rate and invoice number
      const storeConfig = await sqlQuery<any>(sql`
        SELECT "taxRate", "invoicePrefix", "invoiceNumber"
        FROM "storeConfig"
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      const configTaxRate = storeConfig.length > 0 ? parseFloat(storeConfig[0].taxRate) : 0
      const finalTaxRate = taxRate ?? configTaxRate

      // Calculate totals
      let subtotal = 0
      const saleItems = items.map((item) => {
        const itemSubtotal = item.price * item.quantity - (item.discount || 0)
        subtotal += itemSubtotal
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          subtotal: itemSubtotal,
        }
      })

      const subtotalAfterDiscount = subtotal - discount
      const tax = subtotalAfterDiscount * finalTaxRate
      const total = subtotalAfterDiscount + tax

      // Validate payment
      if (paidAmount < total) {
        reply.code(400)
        return {
          success: false,
          error: `El monto pagado (${paidAmount}) es menor que el total (${total})`,
        }
      }

      // Calculate change (only for cash payments)
      const change = paymentMethod === 'CASH' ? paidAmount - total : 0

      // Get next invoice number
      const invoiceConfig = await sqlQuery<any>(sql`
        UPDATE "storeConfig"
        SET "invoiceNumber" = "invoiceNumber" + 1,
            "updatedAt" = NOW()
        WHERE id = (SELECT id FROM "storeConfig" ORDER BY "createdAt" DESC LIMIT 1)
        RETURNING "invoicePrefix", "invoiceNumber"
      `)

      const invoiceNumber =
        invoiceConfig.length > 0
          ? `${invoiceConfig[0].invoicePrefix}${invoiceConfig[0].invoiceNumber.toString().padStart(6, '0')}`
          : null

      // Create sale in transaction
      const sale = await sqlQuery<any>(sql`
        INSERT INTO sales (
          "customerId", "userId", "invoiceNumber", total, subtotal, tax, discount,
          status, "paymentMethod", "paidAmount", change, notes
        )
        VALUES (
          ${customerId}, ${userId}, ${invoiceNumber}, ${total}, ${subtotal}, ${tax}, ${discount},
          'COMPLETED', ${paymentMethod}, ${paidAmount}, ${change}, ${notes}
        )
        RETURNING 
          id, "customerId", "userId", "invoiceNumber", total, subtotal, tax, discount,
          status, "paymentMethod", "paidAmount", change, notes, "createdAt", "updatedAt"
      `)

      // Create sale items and update product stock
      for (const item of saleItems) {
        await sqlQuery(sql`
          INSERT INTO "saleItems" ("saleId", "productId", quantity, price, discount, subtotal)
          VALUES (${sale[0].id}, ${item.productId}, ${item.quantity}, ${item.price}, ${item.discount}, ${item.subtotal})
        `)

        await sqlQuery(sql`
          UPDATE products
          SET stock = stock - ${item.quantity}
          WHERE id = ${item.productId}
        `)
      }

      // Get full sale with relations
      const fullSale = await sqlQuery<any>(sql`
        SELECT 
          s.id,
          s."customerId",
          s."userId",
          s."invoiceNumber",
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.status,
          s."paymentMethod",
          s."paidAmount",
          s.change,
          s.notes,
          s."createdAt",
          s."updatedAt"
        FROM sales s
        WHERE s.id = ${sale[0].id}
        LIMIT 1
      `)

      // Get customer and user
      const customer = sale[0].customerId
        ? await sqlQuery<any>(sql`SELECT id, name, email, phone FROM customers WHERE id = ${sale[0].customerId} LIMIT 1`)
        : []
      const user = await sqlQuery<any>(sql`SELECT id, name, email FROM users WHERE id = ${sale[0].userId} LIMIT 1`)

      // Get items
      const saleItemsData = await sqlQuery<any>(sql`
        SELECT 
          si.id, si."productId", si.quantity, si.price, si.discount, si.subtotal,
          p.id as product_id, p.name as product_name, p.sku as product_sku
        FROM "saleItems" si
        JOIN products p ON p.id = si."productId"
        WHERE si."saleId" = ${sale[0].id}
      `)

      return {
        success: true,
        data: {
          ...fullSale[0],
          customer: customer.length > 0 ? customer[0] : null,
          user: user.length > 0 ? user[0] : null,
          items: saleItemsData.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            subtotal: item.subtotal,
            product: {
              id: item.product_id,
              name: item.product_name,
              sku: item.product_sku,
            },
          })),
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear venta',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/sales/:id/cancel - Cancel sale
  fastify.post<{ Params: { id: string } }>('/api/shopflow/sales/:id/cancel', async (request, reply) => {
    try {
      const { id } = request.params

      const sale = await sqlQuery<any>(sql`
        SELECT id, status
        FROM sales
        WHERE id = ${id}
        LIMIT 1
      `)

      if (sale.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Venta no encontrada',
        }
      }

      if (sale[0].status === 'CANCELLED') {
        reply.code(400)
        return {
          success: false,
          error: 'La venta ya está cancelada',
        }
      }

      if (sale[0].status === 'REFUNDED') {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede cancelar una venta reembolsada',
        }
      }

      // Get sale items to restore stock
      const items = await sqlQuery<any>(sql`
        SELECT "productId", quantity
        FROM "saleItems"
        WHERE "saleId" = ${id}
      `)

      // Update sale status
      await sqlQuery(sql`
        UPDATE sales
        SET status = 'CANCELLED', "updatedAt" = NOW()
        WHERE id = ${id}
      `)

      // Restore product stock
      for (const item of items) {
        await sqlQuery(sql`
          UPDATE products
          SET stock = stock + ${item.quantity}
          WHERE id = ${item.productId}
        `)
      }

      // Get updated sale
      const updatedSale = await sqlQuery<any>(sql`
        SELECT 
          s.id,
          s."customerId",
          s."userId",
          s."invoiceNumber",
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.status,
          s."paymentMethod",
          s."paidAmount",
          s.change,
          s.notes,
          s."createdAt",
          s."updatedAt"
        FROM sales s
        WHERE s.id = ${id}
        LIMIT 1
      `)

      return {
        success: true,
        data: updatedSale[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al cancelar venta',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/sales/:id/refund - Refund sale
  fastify.post<{ Params: { id: string } }>('/api/shopflow/sales/:id/refund', async (request, reply) => {
    try {
      const { id } = request.params

      const sale = await sqlQuery<any>(sql`
        SELECT id, status
        FROM sales
        WHERE id = ${id}
        LIMIT 1
      `)

      if (sale.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Venta no encontrada',
        }
      }

      if (sale[0].status === 'REFUNDED') {
        reply.code(400)
        return {
          success: false,
          error: 'La venta ya está reembolsada',
        }
      }

      if (sale[0].status === 'CANCELLED') {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede reembolsar una venta cancelada',
        }
      }

      if (sale[0].status !== 'COMPLETED') {
        reply.code(400)
        return {
          success: false,
          error: `No se puede reembolsar una venta con estado ${sale[0].status}. Solo las ventas completadas pueden ser reembolsadas.`,
        }
      }

      // Get sale items to restore stock
      const items = await sqlQuery<any>(sql`
        SELECT "productId", quantity
        FROM "saleItems"
        WHERE "saleId" = ${id}
      `)

      // Update sale status
      await sqlQuery(sql`
        UPDATE sales
        SET status = 'REFUNDED', "updatedAt" = NOW()
        WHERE id = ${id}
      `)

      // Restore product stock
      for (const item of items) {
        await sqlQuery(sql`
          UPDATE products
          SET stock = stock + ${item.quantity}
          WHERE id = ${item.productId}
        `)
      }

      // Get updated sale
      const updatedSale = await sqlQuery<any>(sql`
        SELECT 
          s.id,
          s."customerId",
          s."userId",
          s."invoiceNumber",
          s.total,
          s.subtotal,
          s.tax,
          s.discount,
          s.status,
          s."paymentMethod",
          s."paidAmount",
          s.change,
          s.notes,
          s."createdAt",
          s."updatedAt"
        FROM sales s
        WHERE s.id = ${id}
        LIMIT 1
      `)

      return {
        success: true,
        data: updatedSale[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al reembolsar venta',
        message: errorMessage,
      }
    }
  })
}
