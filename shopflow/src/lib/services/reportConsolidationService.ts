import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export interface ConsolidatedSalesReport {
  period: {
    start: Date
    end: Date
  }
  stores: Array<{
    storeId: string
    storeName: string
    storeCode: string
    totalSales: number
    totalRevenue: number
    totalTax: number
    transactionCount: number
  }>
  totals: {
    totalSales: number
    totalRevenue: number
    totalTax: number
    transactionCount: number
  }
}

export interface ConsolidatedInventoryReport {
  stores: Array<{
    storeId: string
    storeName: string
    storeCode: string
    totalProducts: number
    totalStock: number
    totalValue: number
    lowStockItems: number
  }>
  totals: {
    totalProducts: number
    totalStock: number
    totalValue: number
    lowStockItems: number
  }
}

/**
 * Get consolidated sales report across all stores
 */
export async function getConsolidatedSalesReport(
  startDate?: Date,
  endDate?: Date,
  storeIds?: string[]
): Promise<ConsolidatedSalesReport> {
  const start = startDate || startOfMonth(new Date())
  const end = endDate || endOfMonth(new Date())

  const where: {
    createdAt: { gte: Date; lte: Date }
    storeId?: { in: string[] }
    status: 'COMPLETED'
  } = {
    createdAt: {
      gte: startOfDay(start),
      lte: endOfDay(end),
    },
    status: 'COMPLETED',
  }

  if (storeIds && storeIds.length > 0) {
    where.storeId = { in: storeIds }
  }

  // Get sales grouped by store
  const sales = await prisma.sale.findMany({
    where,
    include: {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  })

  // Group by store
  const storeMap = new Map<string, {
    storeId: string
    storeName: string
    storeCode: string
    sales: typeof sales
  }>()

  for (const sale of sales) {
    const storeKey = sale.storeId || 'no-store'
    const storeName = sale.store?.name || 'No Store'
    const storeCode = sale.store?.code || 'N/A'

    if (!storeMap.has(storeKey)) {
      storeMap.set(storeKey, {
        storeId: sale.storeId || '',
        storeName,
        storeCode,
        sales: [],
      })
    }

    storeMap.get(storeKey)!.sales.push(sale)
  }

  // Calculate totals per store
  const stores = Array.from(storeMap.values()).map(({ storeId, storeName, storeCode, sales: storeSales }) => {
    const totalRevenue = storeSales.reduce((sum, sale) => sum + sale.total, 0)
    const totalTax = storeSales.reduce((sum, sale) => sum + sale.tax, 0)
    const totalSales = storeSales.reduce((sum, sale) => sum + sale.subtotal, 0)

    return {
      storeId,
      storeName,
      storeCode,
      totalSales,
      totalRevenue,
      totalTax,
      transactionCount: storeSales.length,
    }
  })

  // Calculate grand totals
  const totals = {
    totalSales: stores.reduce((sum, s) => sum + s.totalSales, 0),
    totalRevenue: stores.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalTax: stores.reduce((sum, s) => sum + s.totalTax, 0),
    transactionCount: stores.reduce((sum, s) => sum + s.transactionCount, 0),
  }

  return {
    period: { start, end },
    stores,
    totals,
  }
}

/**
 * Get consolidated inventory report across all stores
 */
export async function getConsolidatedInventoryReport(
  storeIds?: string[]
): Promise<ConsolidatedInventoryReport> {
  const where: {
    storeId?: { in: string[] }
    active: boolean
  } = {
    active: true,
  }

  if (storeIds && storeIds.length > 0) {
    where.storeId = { in: storeIds }
  }

  // Get products grouped by store
  const products = await prisma.product.findMany({
    where,
    include: {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  })

  // Group by store
  const storeMap = new Map<string, {
    storeId: string
    storeName: string
    storeCode: string
    products: typeof products
  }>()

  for (const product of products) {
    const storeKey = product.storeId || 'no-store'
    const storeName = product.store?.name || 'No Store'
    const storeCode = product.store?.code || 'N/A'

    if (!storeMap.has(storeKey)) {
      storeMap.set(storeKey, {
        storeId: product.storeId || '',
        storeName,
        storeCode,
        products: [],
      })
    }

    storeMap.get(storeKey)!.products.push(product)
  }

  // Calculate totals per store
  const stores = Array.from(storeMap.values()).map(({ storeId, storeName, storeCode, products: storeProducts }) => {
    const totalStock = storeProducts.reduce((sum, p) => sum + p.stock, 0)
    const totalValue = storeProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0)
    const lowStockItems = storeProducts.filter(p => p.stock <= p.minStock).length

    return {
      storeId,
      storeName,
      storeCode,
      totalProducts: storeProducts.length,
      totalStock,
      totalValue,
      lowStockItems,
    }
  })

  // Calculate grand totals
  const totals = {
    totalProducts: stores.reduce((sum, s) => sum + s.totalProducts, 0),
    totalStock: stores.reduce((sum, s) => sum + s.totalStock, 0),
    totalValue: stores.reduce((sum, s) => sum + s.totalValue, 0),
    lowStockItems: stores.reduce((sum, s) => sum + s.lowStockItems, 0),
  }

  return {
    stores,
    totals,
  }
}

