import { useQuery } from '@tanstack/react-query'
import type {
  SalesStats,
  DailySalesData,
  ProductSalesData,
  PaymentMethodStats,
  SalesByUserData,
} from '@/lib/services/reportService'

async function fetchSalesStats(period: 'today' | 'week' | 'month'): Promise<SalesStats> {
  const response = await fetch(`/api/reports/stats?period=${period}`)
  if (!response.ok) {
    throw new Error('Failed to fetch sales stats')
  }
  return response.json()
}

async function fetchDailySales(days: number = 30): Promise<DailySalesData[]> {
  const response = await fetch(`/api/reports/daily-sales?days=${days}`)
  if (!response.ok) {
    throw new Error('Failed to fetch daily sales')
  }
  return response.json()
}

async function fetchTopProducts(
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  categoryId?: string
): Promise<ProductSalesData[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  if (categoryId) params.append('categoryId', categoryId)

  const response = await fetch(`/api/reports/top-products?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch top products')
  }
  return response.json()
}

async function fetchPaymentMethodStats(
  startDate?: string,
  endDate?: string
): Promise<PaymentMethodStats[]> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await fetch(`/api/reports/payment-methods?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch payment method stats')
  }
  return response.json()
}

async function fetchInventoryStats(): Promise<{
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalValue: number
  totalRetailValue: number
  products: Array<{
    id: string
    name: string
    stock: number
    minStock: number
    price: number
    value: number
  }>
}> {
  const response = await fetch('/api/reports/inventory')
  if (!response.ok) {
    throw new Error('Failed to fetch inventory stats')
  }
  return response.json()
}

export function useSalesStats(period: 'today' | 'week' | 'month' = 'today') {
  return useQuery({
    queryKey: ['reports', 'stats', period],
    queryFn: () => fetchSalesStats(period),
  })
}

export function useDailySales(days: number = 30) {
  return useQuery({
    queryKey: ['reports', 'daily-sales', days],
    queryFn: () => fetchDailySales(days),
  })
}

export function useTopProducts(
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  categoryId?: string
) {
  return useQuery({
    queryKey: ['reports', 'top-products', limit, startDate, endDate, categoryId],
    queryFn: () => fetchTopProducts(limit, startDate, endDate, categoryId),
  })
}

export function usePaymentMethodStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['reports', 'payment-methods', startDate, endDate],
    queryFn: () => fetchPaymentMethodStats(startDate, endDate),
  })
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: fetchInventoryStats,
  })
}

async function fetchSalesByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesByUserData> {
  const params = new URLSearchParams({ userId })
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await fetch(`/api/reports/sales-by-user?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch sales by user')
  }
  return response.json()
}

export function useSalesByUser(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['reports', 'sales-by-user', userId, startDate, endDate],
    queryFn: () => fetchSalesByUser(userId, startDate, endDate),
    enabled: !!userId,
  })
}

