import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CustomerPointsBalance } from '@/lib/services/loyaltyService'

async function fetchCustomerPointsBalance(customerId: string): Promise<CustomerPointsBalance> {
  const response = await fetch(`/api/loyalty/balance/${customerId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch customer points balance')
  }
  return response.json()
}

async function fetchCustomerPointsHistory(
  customerId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  transactions: Array<{
    id: string
    type: string
    points: number
    balance: number
    description: string | null
    createdAt: Date
    sale: { id: string; invoiceNumber: string | null; total: number } | null
  }>
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  const response = await fetch(`/api/loyalty/history/${customerId}?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Failed to fetch customer points history')
  }
  return response.json()
}

async function fetchLoyaltyConfig(): Promise<{
  pointsPerDollar: number
  redemptionRate: number
  pointsExpireMonths?: number
  minPurchaseForPoints: number
  maxPointsPerPurchase?: number
}> {
  const response = await fetch('/api/loyalty/config')
  if (!response.ok) {
    throw new Error('Failed to fetch loyalty configuration')
  }
  return response.json()
}

async function redeemPointsForDiscount(
  customerId: string,
  pointsToRedeem: number,
  description?: string
): Promise<{ discountAmount: number; pointsUsed: number }> {
  const response = await fetch('/api/loyalty/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerId, pointsToRedeem, description }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to redeem points')
  }

  return response.json()
}

async function updateLoyaltyConfig(data: {
  pointsPerDollar?: number
  redemptionRate?: number
  pointsExpireMonths?: number
  minPurchaseForPoints?: number
  maxPointsPerPurchase?: number
}): Promise<{
  pointsPerDollar: number
  redemptionRate: number
  pointsExpireMonths?: number
  minPurchaseForPoints: number
  maxPointsPerPurchase?: number
}> {
  const response = await fetch('/api/loyalty/config', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update loyalty configuration')
  }

  return response.json()
}

export function useCustomerPoints(customerId: string | null) {
  return useQuery({
    queryKey: ['loyalty', 'balance', customerId],
    queryFn: () => fetchCustomerPointsBalance(customerId!),
    enabled: !!customerId,
  })
}

export function useCustomerPointsHistory(
  customerId: string | null,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['loyalty', 'history', customerId, limit, offset],
    queryFn: () => fetchCustomerPointsHistory(customerId!, limit, offset),
    enabled: !!customerId,
  })
}

export function useLoyaltyConfig() {
  return useQuery({
    queryKey: ['loyalty', 'config'],
    queryFn: fetchLoyaltyConfig,
  })
}

export function useRedeemPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      pointsToRedeem,
      description,
    }: {
      customerId: string
      pointsToRedeem: number
      description?: string
    }) => redeemPointsForDiscount(customerId, pointsToRedeem, description),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'balance', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'history', variables.customerId] })
    },
  })
}

export function useUpdateLoyaltyConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLoyaltyConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'config'] })
    },
  })
}

