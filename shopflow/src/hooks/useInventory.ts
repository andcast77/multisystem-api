import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product } from '@prisma/client'

async function fetchLowStockProducts(): Promise<Product[]> {
  const response = await fetch('/api/products/low-stock')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch low stock products')
  }
  return response.json()
}

async function adjustInventory(
  productId: string,
  quantity: number,
  type: 'ADJUST' | 'ADD' | 'REMOVE'
): Promise<Product> {
  const response = await fetch(`/api/products/${productId}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, type }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to adjust inventory')
  }
  return response.json()
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: fetchLowStockProducts,
  })
}

export function useAdjustInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      type,
    }: {
      productId: string
      quantity: number
      type: 'ADJUST' | 'ADD' | 'REMOVE'
    }) => adjustInventory(productId, quantity, type),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', data.id] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
