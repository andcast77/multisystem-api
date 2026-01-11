'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineQueue, type OfflineQueueItem, type QueueStatus } from '@/lib/services/offlineQueue'

export interface UseOfflineQueueReturn {
  items: OfflineQueueItem[]
  pendingCount: number
  failedCount: number
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  retryItem: (id: string) => Promise<void>
  removeItem: (id: string) => Promise<void>
  clearCompleted: () => Promise<number>
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [items, setItems] = useState<OfflineQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const allItems = await offlineQueue.getAll()
      setItems(allItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
      console.error('Error loading offline queue:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initialize and load queue
    offlineQueue.init().then(() => {
      refresh()
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to initialize queue')
      setIsLoading(false)
    })

    // Listen for queue updates from service worker
    const handleQueueUpdate = () => {
      refresh()
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'REQUEST_QUEUED' || event.data?.type === 'SYNC_COMPLETE') {
          refresh()
        }
      })
    }

    // Refresh periodically
    const interval = setInterval(refresh, 5000)

    return () => {
      clearInterval(interval)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleQueueUpdate)
      }
    }
  }, [refresh])

  const retryItem = useCallback(async (id: string) => {
    try {
      await offlineQueue.updateStatus(id, 'pending')
      await refresh()
      
      // Trigger sync if online
      if (navigator.onLine && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if ('sync' in registration) {
          const syncManager = (registration as unknown as {
            sync: { register: (tag: string) => Promise<void> }
          }).sync
          await syncManager.register('sync-offline-queue')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry item')
      throw err
    }
  }, [refresh])

  const removeItem = useCallback(async (id: string) => {
    try {
      await offlineQueue.remove(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
      throw err
    }
  }, [refresh])

  const clearCompleted = useCallback(async () => {
    try {
      const deleted = await offlineQueue.clearCompleted(7)
      await refresh()
      return deleted
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear completed items')
      throw err
    }
  }, [refresh])

  const pendingCount = items.filter((item) => item.status === 'pending').length
  const failedCount = items.filter((item) => item.status === 'failed').length

  return {
    items,
    pendingCount,
    failedCount,
    isLoading,
    error,
    refresh,
    retryItem,
    removeItem,
    clearCompleted,
  }
}
