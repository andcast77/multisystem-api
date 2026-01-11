import { prisma } from '@/lib/prisma'
import { SaleStatus } from '@prisma/client'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from 'date-fns'

export interface SalesStats {
  totalSales: number
  totalRevenue: number
  totalTax: number
  totalDiscount: number
  averageSale: number
  salesCount: number
}

export interface DailySalesData {
  date: string
  sales: number
  revenue: number
}

export interface ProductSalesData {
  productId: string
  productName: string
  quantity: number
  revenue: number
  salesCount: number
}

export interface PaymentMethodStats {
  paymentMethod: string
  count: number
  total: number
}

export async function getSalesStats(
  startDate?: Date,
  endDate?: Date
): Promise<SalesStats> {
  const where: {
    status: SaleStatus
    createdAt?: { gte?: Date; lte?: Date }
  } = {
    status: SaleStatus.COMPLETED,
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = startDate
    }
    if (endDate) {
      where.createdAt.lte = endDate
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      total: true,
      tax: true,
      discount: true,
    },
  })

  const salesCount = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalTax = sales.reduce((sum, sale) => sum + sale.tax, 0)
  const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0)
  const totalSales = salesCount
  const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

  return {
    totalSales,
    totalRevenue,
    totalTax,
    totalDiscount,
    averageSale,
    salesCount,
  }
}

export async function getDailySales(
  days: number = 30
): Promise<DailySalesData[]> {
  const startDate = startOfDay(subDays(new Date(), days - 1))
  const endDate = endOfDay(new Date())

  const sales = await prisma.sale.findMany({
    where: {
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      total: true,
    },
  })

  // Group by date
  const salesByDate = new Map<string, { sales: number; revenue: number }>()

  sales.forEach((sale) => {
    const date = startOfDay(sale.createdAt).toISOString().split('T')[0]
    const existing = salesByDate.get(date) || { sales: 0, revenue: 0 }
    salesByDate.set(date, {
      sales: existing.sales + 1,
      revenue: existing.revenue + sale.total,
    })
  })

  // Fill in missing dates with zeros
  const result: DailySalesData[] = []
  for (let i = 0; i < days; i++) {
    const date = startOfDay(subDays(new Date(), days - 1 - i))
    const dateStr = date.toISOString().split('T')[0]
    const data = salesByDate.get(dateStr) || { sales: 0, revenue: 0 }
    result.push({
      date: dateStr,
      sales: data.sales,
      revenue: data.revenue,
    })
  }

  return result
}

export async function getTopProducts(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date,
  categoryId?: string
): Promise<ProductSalesData[]> {
  const where: {
    sale: {
      status: SaleStatus
      createdAt?: { gte?: Date; lte?: Date }
    }
    product?: {
      categoryId?: string
    }
  } = {
    sale: {
      status: SaleStatus.COMPLETED,
    },
  }

  if (startDate || endDate) {
    where.sale.createdAt = {}
    if (startDate) {
      where.sale.createdAt.gte = startDate
    }
    if (endDate) {
      where.sale.createdAt.lte = endDate
    }
  }

  if (categoryId) {
    where.product = {
      categoryId,
    }
  }

  const items = await prisma.saleItem.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Group by product
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number; salesCount: Set<string> }
  >()

  items.forEach((item) => {
    const existing = productMap.get(item.productId) || {
      name: item.product.name,
      quantity: 0,
      revenue: 0,
      salesCount: new Set<string>(),
    }
    productMap.set(item.productId, {
      name: item.product.name,
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + item.subtotal,
      salesCount: existing.salesCount.add(item.saleId),
    })
  })

  // Convert to array and sort
  const result: ProductSalesData[] = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      quantity: data.quantity,
      revenue: data.revenue,
      salesCount: data.salesCount.size,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)

  return result
}

export async function getPaymentMethodStats(
  startDate?: Date,
  endDate?: Date
): Promise<PaymentMethodStats[]> {
  const where: {
    status: SaleStatus
    createdAt?: { gte?: Date; lte?: Date }
  } = {
    status: SaleStatus.COMPLETED,
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = startDate
    }
    if (endDate) {
      where.createdAt.lte = endDate
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      paymentMethod: true,
      total: true,
    },
  })

  // Group by payment method
  const methodMap = new Map<string, { count: number; total: number }>()

  sales.forEach((sale) => {
    const method = sale.paymentMethod
    const existing = methodMap.get(method) || { count: 0, total: 0 }
    methodMap.set(method, {
      count: existing.count + 1,
      total: existing.total + sale.total,
    })
  })

  // Convert to array
  const result: PaymentMethodStats[] = Array.from(methodMap.entries()).map(
    ([paymentMethod, data]) => ({
      paymentMethod,
      count: data.count,
      total: data.total,
    })
  )

  return result
}

export async function getInventoryStats() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      stock: true,
      price: true,
      cost: true,
      minStock: true,
    },
  })

  const totalProducts = products.length
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock).length
  const outOfStockProducts = products.filter((p) => p.stock === 0).length
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0)
  const totalRetailValue = products.reduce(
    (sum, p) => sum + p.stock * p.price,
    0
  )

  return {
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    totalValue,
    totalRetailValue,
    products: products
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        price: p.price,
        value: p.stock * p.cost,
      })),
  }
}

export async function getTodayStats() {
  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  return getSalesStats(start, end)
}

export async function getWeekStats() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })

  return getSalesStats(start, end)
}

export async function getMonthStats() {
  const start = startOfMonth(new Date())
  const end = endOfMonth(new Date())

  return getSalesStats(start, end)
}

export interface SalesByUserData {
  userId: string
  userName: string
  userEmail: string
  salesCount: number
  totalRevenue: number
  averageSale: number
}

export async function getSalesByUser(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SalesByUserData> {
  const where: {
    userId: string
    status: SaleStatus
    createdAt?: { gte?: Date; lte?: Date }
  } = {
    userId,
    status: SaleStatus.COMPLETED,
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = startDate
    }
    if (endDate) {
      where.createdAt.lte = endDate
    }
  }

  const [sales, user] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: {
        total: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ])

  if (!user) {
    throw new Error(`User with id ${userId} not found`)
  }

  const salesCount = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const averageSale = salesCount > 0 ? totalRevenue / salesCount : 0

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    salesCount,
    totalRevenue,
    averageSale,
  }
}
