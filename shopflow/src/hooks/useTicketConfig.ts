import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TicketConfig } from '@prisma/client'
import type { UpdateTicketConfigInput } from '@/lib/validations/ticketConfig'

async function fetchTicketConfig(storeId?: string): Promise<TicketConfig> {
  const url = storeId
    ? `/api/ticket-config?storeId=${storeId}`
    : '/api/ticket-config'
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch ticket config')
  }
  const data = await response.json()
  return data.config
}

async function updateTicketConfig(
  data: UpdateTicketConfigInput,
  storeId?: string
): Promise<TicketConfig> {
  const url = storeId
    ? `/api/ticket-config?storeId=${storeId}`
    : '/api/ticket-config'
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update ticket config')
  }
  const result = await response.json()
  return result.config
}

export function useTicketConfig(storeId?: string) {
  return useQuery({
    queryKey: ['ticket-config', storeId],
    queryFn: () => fetchTicketConfig(storeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateTicketConfig(storeId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateTicketConfigInput) =>
      updateTicketConfig(data, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-config', storeId] })
    },
  })
}
