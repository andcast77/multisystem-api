import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

export async function shopflowReportsRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/reports/stats - Sales statistics with date filters
  fastify.get<{
    Querystring: {
      startDate?: string
      endDate?: string
    }
  }>('/api/shopflow/reports/stats', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query

      let query = sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE status = 'COMPLETED'
      `

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

  // GET /api/shopflow/reports/daily - Daily sales data
  fastify.get<{
    Querystring: {
      days?: string
    }
  }>('/api/shopflow/reports/daily', async (request, reply) => {
    try {
      const days = parseInt(request.query.days || '30')
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
      startDate.setHours(0, 0, 0, 0)

      const sales = (await sql`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as sales,
          COALESCE(SUM(total), 0) as revenue
        FROM sales
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `) as Array<{ date: Date; sales: string; revenue: string }>

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

  // GET /api/shopflow/reports/top-products - Top selling products
  fastify.get<{
    Querystring: {
      limit?: string
      startDate?: string
      endDate?: string
      categoryId?: string
    }
  }>('/api/shopflow/reports/top-products', async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit || '10')
      const { startDate, endDate, categoryId } = request.query

      let query = sql`
        SELECT 
          si."productId",
          p.name as "productName",
          SUM(si.quantity) as quantity,
          SUM(si.subtotal) as revenue,
          COUNT(DISTINCT si."saleId") as "salesCount"
        FROM "saleItems" si
        INNER JOIN products p ON si."productId" = p.id
        INNER JOIN sales s ON si."saleId" = s.id
        WHERE s.status = 'COMPLETED'
      `

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

      const results = (await query) as Array<{
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

  // GET /api/shopflow/reports/payment-methods - Payment method statistics
  fastify.get<{
    Querystring: {
      startDate?: string
      endDate?: string
    }
  }>('/api/shopflow/reports/payment-methods', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query

      let query = sql`
        SELECT 
          "paymentMethod",
          COUNT(*) as count,
          COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE status = 'COMPLETED'
      `

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

      const results = (await query) as Array<{
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

  // GET /api/shopflow/reports/inventory - Inventory statistics
  fastify.get('/api/shopflow/reports/inventory', async (request, reply) => {
    try {
      const products = (await sql`
        SELECT 
          id,
          name,
          stock,
          price,
          cost,
          "minStock"
        FROM products
        WHERE active = true
        ORDER BY stock ASC
        LIMIT 10
      `) as Array<{
        id: string
        name: string
        stock: number
        price: number
        cost: number | null
        minStock: number | null
      }>

      const statsResult = await sqlQuery(sql`
        SELECT 
          COUNT(*) as "totalProducts",
          COUNT(CASE WHEN stock <= COALESCE("minStock", 0) THEN 1 END) as "lowStockProducts",
          COUNT(CASE WHEN stock = 0 THEN 1 END) as "outOfStockProducts",
          COALESCE(SUM(stock * COALESCE(cost, 0)), 0) as "totalValue",
          COALESCE(SUM(stock * price), 0) as "totalRetailValue"
        FROM products
        WHERE active = true
      `)
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

  // GET /api/shopflow/reports/today - Today's statistics
  fastify.get('/api/shopflow/reports/today', async (request, reply) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfDay = new Date(today)
      endOfDay.setHours(23, 59, 59, 999)

      const result = (await sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${today}
          AND "createdAt" <= ${endOfDay}
      `) as Array<{
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

  // GET /api/shopflow/reports/week - This week's statistics
  fastify.get('/api/shopflow/reports/week', async (request, reply) => {
    try {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Monday
      const startOfWeek = new Date(today.setDate(diff))
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const result = (await sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${startOfWeek}
          AND "createdAt" <= ${endOfWeek}
      `) as Array<{
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

  // GET /api/shopflow/reports/month - This month's statistics
  fastify.get('/api/shopflow/reports/month', async (request, reply) => {
    try {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      endOfMonth.setHours(23, 59, 59, 999)

      const result = (await sql`
        SELECT 
          COUNT(*) as "salesCount",
          COALESCE(SUM(total), 0) as "totalRevenue",
          COALESCE(SUM(tax), 0) as "totalTax",
          COALESCE(SUM(COALESCE(discount, 0)), 0) as "totalDiscount"
        FROM sales
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${startOfMonth}
          AND "createdAt" <= ${endOfMonth}
      `) as Array<{
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
      const { userId } = request.params
      const { startDate, endDate } = request.query

      // Get user info
      const users = (await sql`
        SELECT id, name, email
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `) as Array<{ id: string; name: string | null; email: string }>

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
        WHERE "userId" = ${userId}
          AND status = 'COMPLETED'
      `

      if (startDate) {
        query = sql`${query} AND "createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND "createdAt" <= ${new Date(endDate)}`
      }

      const result = (await query) as Array<{
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
          userName: user.name,
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
