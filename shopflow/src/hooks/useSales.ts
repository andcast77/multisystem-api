import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Sale } from '@prisma/client'
import type { CreateSaleInput } from '@/lib/validations/sale'

interface SalesResponse {
  sales: Sale[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchSales(params?: {
  page?: number
  limit?: number
  customerId?: string
  status?: string
}): Promise<SalesResponse> {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', String(params.page))
  if (params?.limit) queryParams.append('limit', String(params.limit))
  if (params?.customerId) queryParams.append('customerId', params.customerId)
  if (params?.status) queryParams.append('status', params.status)

  const response = await fetch(`/api/sales?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch sales')
  }
  return response.json()
}

async function createSale(data: CreateSaleInput): Promise<Sale> {
  const response = await fetch('/api/sales', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create sale')
  }

  return response.json()
}

async function fetchSale(id: string): Promise<Sale> {
  const response = await fetch(`/api/sales/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch sale')
  }
  return response.json()
}

async function cancelSale(id: string): Promise<Sale> {
  const response = await fetch(`/api/sales/${id}/cancel`, {
    method: 'PUT',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to cancel sale')
  }

  return response.json()
}

export function useSales(params?: {
  page?: number
  limit?: number
  customerId?: string
  status?: string
}) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => fetchSales(params),
  })
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => fetchSale(id),
    enabled: !!id,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useCancelSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

async function refundSale(id: string): Promise<Sale> {
  const response = await fetch(`/api/sales/${id}/refund`, {
    method: 'PUT',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to refund sale')
  }

  return response.json()
}

export function useRefundSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refundSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

