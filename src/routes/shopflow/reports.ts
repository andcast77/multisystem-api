import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getShopflowContext, type ShopflowContext } from './auth-helper.js'

/** Resolve effective storeId for reports: USER = from context/fallback store, OWNER/ADMIN = from query or all. Returns null if USER without any store (caller should 403). */
async function resolveEffectiveStoreIdForReport(
  ctx: ShopflowContext,
  queryStoreId?: string
): Promise<string | null | undefined> {
  const isStoreAdmin = ctx.membershipRole === 'OWNER' || ctx.membershipRole === 'ADMIN' || ctx.isSuperuser
  if (isStoreAdmin) return queryStoreId ?? undefined
  const fromCtx = ctx.storeId ?? queryStoreId
  if (fromCtx) return fromCtx

  const rows = (await sqlQuery(sql`
    SELECT s.id
    FROM stores s
    INNER JOIN user_stores us ON us."storeId" = s.id AND us."userId" = ${ctx.userId}
    WHERE s."companyId" = ${ctx.companyId} AND s.active = true
    ORDER BY s."createdAt" ASC
    LIMIT 1
  `)) as Array<{ id: string }>

  return rows.length > 0 ? rows[0].id : null
}

export async function shopflowReportsRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/reports/stats - Sales statistics with date filters (store-scoped for USER)
  fastify.get<{
    Querystring: {
      storeId?: string
      startDate?: string
      endDate?: string
    }
  }>('/api/shopflow/reports/stats', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const { startDate, endDate } = request.query

      let query = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
      `
      if (effectiveStoreId !== undefined) {
        query = sql`${query} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }

      if (startDate) {
        query = sql`${query} AND "createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND "createdAt" <= ${new Date(endDate)}`
      }

      const result = await sqlQuery(query)
      const stats = result[0] as {
        salesCount: string
        totalRevenue: string
        totalTax: string
        totalDiscount: string
      }

      const salesCount = parseInt(stats.salesCount || '0')
      const totalRevenue = parseFloat(stats.totalRevenue || '0')
      const totalTax = parseFloat(stats.totalTax || '0')
      const totalDiscount = parseFloat(stats.totalDiscount || '0')
      const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

      return {
        success: true,
        data: {
          totalSales: salesCount,
          totalRevenue,
          totalTax,
          totalDiscount,
          averageSale,
          salesCount,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/daily - Daily sales data (store-scoped for USER)
  fastify.get<{
    Querystring: {
      storeId?: string
      days?: string
    }
  }>('/api/shopflow/reports/daily', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const days = parseInt(request.query.days || '30')
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
      startDate.setHours(0, 0, 0, 0)

      let dailyQuery = sql`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as sales,
          COALESCE(SUM(total), 0) as revenue
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
          AND "createdAt" >= ${startDate}
      `
      if (effectiveStoreId !== undefined) {
        dailyQuery = sql`${dailyQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      dailyQuery = sql`${dailyQuery}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `
      const sales = (await sqlQuery(dailyQuery)) as Array<{ date: Date; sales: string; revenue: string }>

      // Create a map for quick lookup
      const salesMap = new Map<string, { sales: number; revenue: number }>()
      sales.forEach((s) => {
        const dateStr = s.date.toISOString().split('T')[0]
        salesMap.set(dateStr, {
          sales: parseInt(s.sales),
          revenue: parseFloat(s.revenue),
        })
      })

      // Fill in missing dates with zeros
      const result = []
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const data = salesMap.get(dateStr) || { sales: 0, revenue: 0 }
        result.push({
          date: dateStr,
          sales: data.sales,
          revenue: data.revenue,
        })
      }

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener ventas diarias',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/top-products - Top selling products (store-scoped for USER)
  fastify.get<{
    Querystring: {
      storeId?: string
      limit?: string
      startDate?: string
      endDate?: string
      categoryId?: string
    }
  }>('/api/shopflow/reports/top-products', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const limit = parseInt(request.query.limit || '10')
      const { startDate, endDate, categoryId } = request.query

      let query = sql`
        SELECT 
          si."productId",
          p.name as "productName",
          SUM(si.quantity) as quantity,
          SUM(si.subtotal) as revenue,
          COUNT(DISTINCT si."saleId") as "salesCount"
        FROM sale_items si
        INNER JOIN products p ON si."productId" = p.id AND p."companyId" = ${ctx.companyId}
        INNER JOIN sales s ON si."saleId" = s.id AND s."companyId" = ${ctx.companyId}
        WHERE s.status = 'COMPLETED'
      `
      if (effectiveStoreId !== undefined) {
        query = sql`${query} AND s."storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }

      if (startDate) {
        query = sql`${query} AND s."createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND s."createdAt" <= ${new Date(endDate)}`
      }

      if (categoryId) {
        query = sql`${query} AND p."categoryId" = ${categoryId}`
      }

      query = sql`
        ${query}
        GROUP BY si."productId", p.name
        ORDER BY quantity DESC
        LIMIT ${limit}
      `

      const results = (await sqlQuery(query)) as Array<{
        productId: string
        productName: string
        quantity: string
        revenue: string
        salesCount: string
      }>

      const data = results.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        quantity: parseInt(r.quantity),
        revenue: parseFloat(r.revenue),
        salesCount: parseInt(r.salesCount),
      }))

      return {
        success: true,
        data,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener productos más vendidos',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/payment-methods - Payment method statistics (store-scoped for USER)
  fastify.get<{
    Querystring: {
      storeId?: string
      startDate?: string
      endDate?: string
    }
  }>('/api/shopflow/reports/payment-methods', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const { startDate, endDate } = request.query

      let query = sql`
        SELECT 
          "paymentMethod",
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
      `
      if (effectiveStoreId !== undefined) {
        query = sql`${query} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }

      if (startDate) {
        query = sql`${query} AND "createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND "createdAt" <= ${new Date(endDate)}`
      }

      query = sql`
        ${query}
        GROUP BY "paymentMethod"
      `

      const results = (await sqlQuery(query)) as Array<{
        paymentMethod: string
        count: string
        total: string
      }>

      const data = results.map((r) => ({
        paymentMethod: r.paymentMethod,
        count: parseInt(r.count),
        total: parseFloat(r.total),
      }))

      return {
        success: true,
        data,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas de métodos de pago',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/inventory - Inventory statistics (store-scoped for USER via product.storeId)
  fastify.get<{
    Querystring: { storeId?: string }
  }>('/api/shopflow/reports/inventory', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      let productsQuery = sql`
        SELECT 
          id,
          name,
          stock,
          price,
          cost,
          "minStock"
        FROM products
        WHERE "companyId" = ${ctx.companyId} AND active = true
      `
      if (effectiveStoreId !== undefined) {
        productsQuery = sql`${productsQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      productsQuery = sql`${productsQuery} ORDER BY stock ASC LIMIT 10`
      const products = (await sqlQuery(productsQuery)) as Array<{
        id: string
        name: string
        stock: number
        price: number
        cost: number | null
        minStock: number | null
      }>

      let statsQuery = sql`
        SELECT 
          COUNT(*) as "totalProducts",
          COUNT(CASE WHEN stock <= COALESCE("minStock", 0) THEN 1 END) as "lowStockProducts",
          COUNT(CASE WHEN stock = 0 THEN 1 END) as "outOfStockProducts",
          COALESCE(SUM(stock * COALESCE(cost, 0)), 0) as "totalValue",
          COALESCE(SUM(stock * price), 0) as "totalRetailValue"
        FROM products
        WHERE "companyId" = ${ctx.companyId} AND active = true
      `
      if (effectiveStoreId !== undefined) {
        statsQuery = sql`${statsQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      const statsResult = await sqlQuery(statsQuery)
      const stats = statsResult[0] as {
        totalProducts: string
        lowStockProducts: string
        outOfStockProducts: string
        totalValue: string
        totalRetailValue: string
      }

      return {
        success: true,
        data: {
          totalProducts: parseInt(stats.totalProducts),
          lowStockProducts: parseInt(stats.lowStockProducts),
          outOfStockProducts: parseInt(stats.outOfStockProducts),
          totalValue: parseFloat(stats.totalValue),
          totalRetailValue: parseFloat(stats.totalRetailValue),
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            stock: p.stock,
            minStock: p.minStock,
            price: p.price,
            value: p.stock * (p.cost || 0),
          })),
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas de inventario',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/today - Today's statistics (store-scoped for USER)
  fastify.get<{
    Querystring: { storeId?: string }
  }>('/api/shopflow/reports/today', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)

      let todayQuery = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
          AND "createdAt" >= ${today}
          AND "createdAt" <= ${endOfDay}
      `
      if (effectiveStoreId !== undefined) {
        todayQuery = sql`${todayQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      const result = (await sqlQuery(todayQuery)) as Array<{
        salesCount: string
        totalRevenue: string
        totalTax: string
        totalDiscount: string
      }>

      const stats = result[0]
      const salesCount = parseInt(stats.salesCount || '0')
      const totalRevenue = parseFloat(stats.totalRevenue || '0')
      const totalTax = parseFloat(stats.totalTax || '0')
      const totalDiscount = parseFloat(stats.totalDiscount || '0')
      const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

      return {
        success: true,
        data: {
          totalSales: salesCount,
          totalRevenue,
          totalTax,
          totalDiscount,
          averageSale,
          salesCount,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas del día',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/week - This week's statistics (store-scoped for USER)
  fastify.get<{ Querystring: { storeId?: string } }>('/api/shopflow/reports/week', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      const startOfWeek = new Date(today.setDate(diff))
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      let weekQuery = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
          AND "createdAt" >= ${startOfWeek}
          AND "createdAt" <= ${endOfWeek}
      `
      if (effectiveStoreId !== undefined) {
        weekQuery = sql`${weekQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      const result = (await sqlQuery(weekQuery)) as Array<{
        salesCount: string
        totalRevenue: string
        totalTax: string
        totalDiscount: string
      }>

      const stats = result[0]
      const salesCount = parseInt(stats.salesCount || '0')
      const totalRevenue = parseFloat(stats.totalRevenue || '0')
      const totalTax = parseFloat(stats.totalTax || '0')
      const totalDiscount = parseFloat(stats.totalDiscount || '0')
      const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

      return {
        success: true,
        data: {
          totalSales: salesCount,
          totalRevenue,
          totalTax,
          totalDiscount,
          averageSale,
          salesCount,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas de la semana',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/month - This month's statistics (store-scoped for USER)
  fastify.get<{ Querystring: { storeId?: string } }>('/api/shopflow/reports/month', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const effectiveStoreId = await resolveEffectiveStoreIdForReport(ctx, request.query.storeId)
      if (effectiveStoreId === null) {
        reply.code(403).send({
          success: false,
          error: 'Envía el parámetro storeId (query) o el header X-Store-Id con el id del local de venta para ver reportes (usuario no administrador)',
        })
        return
      }
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)

      let monthQuery = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND status = 'COMPLETED'
          AND "createdAt" >= ${startOfMonth}
          AND "createdAt" <= ${endOfMonth}
      `
      if (effectiveStoreId !== undefined) {
        monthQuery = sql`${monthQuery} AND "storeId" IS NOT DISTINCT FROM ${effectiveStoreId}`
      }
      const result = (await sqlQuery(monthQuery)) as Array<{
        salesCount: string
        totalRevenue: string
        totalTax: string
        totalDiscount: string
      }>

      const stats = result[0]
      const salesCount = parseInt(stats.salesCount || '0')
      const totalRevenue = parseFloat(stats.totalRevenue || '0')
      const totalTax = parseFloat(stats.totalTax || '0')
      const totalDiscount = parseFloat(stats.totalDiscount || '0')
      const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

      return {
        success: true,
        data: {
          totalSales: salesCount,
          totalRevenue,
          totalTax,
          totalDiscount,
          averageSale,
          salesCount,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas del mes',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/reports/by-user/:userId - Sales statistics by user
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      startDate?: string
      endDate?: string
    }
  }>('/api/shopflow/reports/by-user/:userId', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { userId } = request.params
      const { startDate, endDate } = request.query

      // Get user info
      const users = (await sqlQuery(sql`
        SELECT id, email
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `)) as Array<{ id: string; email: string }>

      if (users.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      const user = users[0]

      let query = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue"
        FROM sales
        WHERE "companyId" = ${ctx.companyId} AND "userId" = ${userId}
          AND status = 'COMPLETED'
      `

      if (startDate) {
        query = sql`${query} AND "createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND "createdAt" <= ${new Date(endDate)}`
      }

      const result = (await sqlQuery(query)) as Array<{
        salesCount: string
        totalRevenue: string
      }>

      const stats = result[0]
      const salesCount = parseInt(stats.salesCount || '0')
      const totalRevenue = parseFloat(stats.totalRevenue || '0')
      const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

      return {
        success: true,
        data: {
          userId: user.id,
          userName: (user as any).name ?? user.email,
          userEmail: user.email,
          salesCount,
          totalRevenue,
          averageSale,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener estadísticas por usuario',
        message: errorMessage,
      }
    }
  })
}
