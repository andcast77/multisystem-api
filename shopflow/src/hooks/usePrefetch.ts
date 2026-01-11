'use client'

import { useCallback } from 'react'
import { prefetchService } from '@/lib/services/prefetchService'

export function usePrefetch() {
  const recordInteraction = useCallback((
    type: 'product' | 'customer' | 'category',
    id: string
  ) => {
    prefetchService.recordInteraction(type, id)
  }, [])

  const getStats = useCallback(() => {
    return prefetchService.getStats()
  }, [])

  return {
    recordInteraction,
    getStats,
  }
}