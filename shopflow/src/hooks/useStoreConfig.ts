import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StoreConfig } from '@prisma/client'
import type { UpdateStoreConfigInput } from '@/lib/validations/storeConfig'

async function fetchStoreConfig(): Promise<StoreConfig> {
  const response = await fetch('/api/store-config')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch store config')
  }
  return response.json()
}

async function updateStoreConfig(data: UpdateStoreConfigInput): Promise<StoreConfig> {
  const response = await fetch('/api/store-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update store config')
  }
  return response.json()
}

export function useStoreConfig() {
  return useQuery({
    queryKey: ['store-config'],
    queryFn: fetchStoreConfig,
  })
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStoreConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] })
    },
  })
}

