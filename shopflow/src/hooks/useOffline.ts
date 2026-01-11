'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncService, type SyncResult, type SyncProgress } from '@/lib/services/syncService'
import { connectivityChecker, type ConnectivityStatus } from '@/lib/utils/connectivity'

export interface UseOfflineReturn {
  isOnline: boolean
  isOffline: boolean
  isServiceWorkerReady: boolean
  isSyncing: boolean
  syncProgress: SyncProgress | null
  syncError: string | null
  connectivityStatus: ConnectivityStatus
  isLikelyOnline: boolean
  isSlowConnection: boolean
  isVerySlowConnection: boolean
  syncOfflineQueue: () => Promise<boolean>
  syncAll: () => Promise<SyncResult>
  checkConnectivity: () => Promise<ConnectivityStatus>
  lastSyncTime: number | null
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(connectivityChecker.isLikelyOnline())
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [connectivityStatus, setConnectivityStatus] = useState<ConnectivityStatus>(
    connectivityChecker.getStatus()
  )

  const syncAll = useCallback(async (): Promise<SyncResult> => {
    // Service now handles queue internally, no need to check isSyncing here
    setIsSyncing(true)
    setSyncError(null)
    setSyncProgress(null)

    try {
      const result = await syncService.syncAll()
      setIsSyncing(false)
      setSyncProgress(null)
      setLastSyncTime(Date.now())

      if (result.errors.length > 0) {
        setSyncError(`Sync completed with ${result.errors.length} errors`)
      }

      return result
    } catch (error) {
      setIsSyncing(false)
      setSyncProgress(null)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setSyncError(errorMessage)
      throw error
    }
  }, [])

  useEffect(() => {
    // Start connectivity monitoring
    connectivityChecker.startChecking(30000) // Check every 30 seconds

    // Subscribe to connectivity status changes
    const unsubscribeConnectivity = connectivityChecker.onStatusChange((status) => {
      setConnectivityStatus(status)
      setIsOnline(status.isOnline)

      // Auto-sync when coming back online (only if not already syncing or queued)
      if (status.isOnline && !syncService.isSyncInProgress()) {
        // Get last sync time to avoid redundant syncs
        const lastSync = lastSyncTime
        const now = Date.now()
        const timeSinceLastSync = lastSync ? now - lastSync : Infinity
        
        // Only sync if:
        // 1. Never synced before, OR
        // 2. Last sync was more than 30 seconds ago (avoid rapid re-syncs)
        if (!lastSync || timeSinceLastSync > 30000) {
          // Small delay to avoid immediate sync on reconnection
          setTimeout(() => {
            // Double-check sync is still not in progress before syncing
            if (!syncService.isSyncInProgress()) {
              syncAll().catch((error) => {
                console.error('Auto-sync failed:', error)
              })
            }
          }, 2000)
        }
      }
    })

    // Listen for online/offline events (fallback)
    const handleBrowserOnline = () => {
      // Trigger immediate connectivity check
      connectivityChecker.checkConnectivity()
    }
    const handleBrowserOffline = () => {
      setIsOnline(false)
      setConnectivityStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true)
      })

      // Listen for sync messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          setIsSyncing(false)
          setSyncProgress(null)
          if (event.data.results.errors?.length > 0) {
            setSyncError('Some items failed to sync')
          } else {
            setSyncError(null)
            setLastSyncTime(Date.now())
          }
        }
      })
    }

    return () => {
      connectivityChecker.stopChecking()
      unsubscribeConnectivity()
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
    }
  }, [lastSyncTime, syncAll])

  // Listen to sync progress
  useEffect(() => {
    const unsubscribe = syncService.onProgress((progress) => {
      setSyncProgress(progress)
    })
    return unsubscribe
  }, [])

  const syncOfflineQueue = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        // Check if Background Sync API is available
        if ('sync' in registration) {
          const syncManager = (registration as unknown as {
            sync: { register: (tag: string) => Promise<void> }
          }).sync
          await syncManager.register('sync-offline-queue')
          return true
        }
      } catch (error) {
        console.error('Failed to register sync:', error)
        setSyncError(error instanceof Error ? error.message : 'Failed to sync')
        return false
      }
    }
    return false
  }, [])

  const checkConnectivity = useCallback(async (): Promise<ConnectivityStatus> => {
    return await connectivityChecker.checkConnectivity()
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    isServiceWorkerReady,
    isSyncing,
    syncProgress,
    syncError,
    connectivityStatus,
    isLikelyOnline: connectivityChecker.isLikelyOnline(),
    isSlowConnection: connectivityChecker.isSlowConnection(),
    isVerySlowConnection: connectivityChecker.isVerySlowConnection(),
    syncOfflineQueue,
    syncAll,
    checkConnectivity,
    lastSyncTime,
  }
}

