/**
 * Background Sync Service
 * Manages background synchronization with smart prioritization
 */

import { syncService } from './syncService'
import { offlineQueue } from './offlineQueue'
import { connectivityChecker } from '@/lib/utils/connectivity'

export interface BackgroundSyncConfig {
  enabled: boolean
  syncInterval: number // minutes
  maxConcurrentSyncs: number
  prioritizeBy: 'time' | 'type' | 'size'
  conditions: {
    requireIdle: boolean
    requireGoodConnection: boolean
    requireBatteryAbove: number // percentage, 0 to disable
    maxSyncDuration: number // minutes
  }
}

export interface SyncPriority {
  type: 'products' | 'categories' | 'customers' | 'suppliers' | 'storeConfig' | 'ticketConfig'
  priority: number // 0 = highest, higher numbers = lower priority
  lastSyncTime: number
  dataSize: number // estimated
  dependencies: string[] // other types that should sync first
}

class BackgroundSyncService {
  private config: BackgroundSyncConfig = {
    enabled: true,
    syncInterval: 15, // 15 minutes
    maxConcurrentSyncs: 2,
    prioritizeBy: 'time',
    conditions: {
      requireIdle: true,
      requireGoodConnection: true,
      requireBatteryAbove: 20, // 20%
      maxSyncDuration: 5, // 5 minutes
    },
  }

  private syncInterval: number | null = null
  private isBackgroundSyncing = false
  private lastBackgroundSync = 0

  private priorities: SyncPriority[] = [
    {
      type: 'categories',
      priority: 0,
      lastSyncTime: 0,
      dataSize: 100, // small
      dependencies: [],
    },
    {
      type: 'storeConfig',
      priority: 1,
      lastSyncTime: 0,
      dataSize: 50, // very small
      dependencies: [],
    },
    {
      type: 'ticketConfig',
      priority: 2,
      lastSyncTime: 0,
      dataSize: 50, // very small
      dependencies: [],
    },
    {
      type: 'suppliers',
      priority: 3,
      lastSyncTime: 0,
      dataSize: 200, // medium
      dependencies: [],
    },
    {
      type: 'customers',
      priority: 4,
      lastSyncTime: 0,
      dataSize: 500, // large
      dependencies: [],
    },
    {
      type: 'products',
      priority: 5,
      lastSyncTime: 0,
      dataSize: 1000, // largest
      dependencies: ['categories', 'suppliers'],
    },
  ]

  /**
   * Start background sync service
   */
  start(): void {
    if (!this.config.enabled) return

    this.updatePriorities()
    this.startPeriodicSync()

    // Also listen for visibility changes to sync when user returns
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Stop background sync service
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Start periodic background sync
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = window.setInterval(() => {
      this.performBackgroundSync()
    }, this.config.syncInterval * 60 * 1000) // Convert minutes to milliseconds
  }

  /**
   * Handle visibility change events
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // User returned, check if we need to sync
      const timeSinceLastSync = Date.now() - this.lastBackgroundSync
      if (timeSinceLastSync > 5 * 60 * 1000) { // 5 minutes
        setTimeout(() => this.performBackgroundSync(), 2000) // Delay 2 seconds
      }
    }
  }

  /**
   * Perform background synchronization
   */
  private async performBackgroundSync(): Promise<void> {
    if (this.isBackgroundSyncing) {
      return
    }

    // Check conditions
    if (!this.shouldPerformBackgroundSync()) {
      return
    }

    this.isBackgroundSyncing = true
    const startTime = Date.now()

    try {
      // Get pending offline queue items
      const pendingItems = await offlineQueue.getPending()
      const hasPendingQueue = pendingItems.length > 0

      // If there are pending queue items, prioritize syncing those first
      if (hasPendingQueue && navigator.onLine) {
        try {
          await this.syncOfflineQueue()
          this.lastBackgroundSync = Date.now()
        } catch (error) {
          console.warn('Background queue sync failed:', error)
        }
      }

      // Then sync data types based on priority
      const syncOrder = this.getSyncOrder()
      const maxDuration = this.config.conditions.maxSyncDuration * 60 * 1000 // Convert to milliseconds

      for (const priority of syncOrder) {
        // Check if we've exceeded max duration
        if (Date.now() - startTime > maxDuration) {
          break
        }

        // Check if conditions still hold
        if (!this.shouldPerformBackgroundSync()) {
          break
        }

        try {
          await this.syncDataType(priority.type)
          priority.lastSyncTime = Date.now()
          this.lastBackgroundSync = Date.now()

          // Small delay between syncs to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.warn(`Background sync failed for ${priority.type}:`, error)
          // Continue with other types even if one fails
        }
      }

    } catch (error) {
      console.warn('Background sync failed:', error)
    } finally {
      this.isBackgroundSyncing = false
    }
  }

  /**
   * Check if background sync should be performed
   */
  private shouldPerformBackgroundSync(): boolean {
    // Check if online
    if (!navigator.onLine) {
      return false
    }

    // Check connection quality
    if (this.config.conditions.requireGoodConnection) {
      if (connectivityChecker.isSlowConnection() || connectivityChecker.isVerySlowConnection()) {
        return false
      }
    }

    // Check if user is idle (if required)
    if (this.config.conditions.requireIdle) {
      if (document.visibilityState === 'visible') {
        return false
      }
    }

    // Check battery level (if supported)
    if (this.config.conditions.requireBatteryAbove > 0 && 'getBattery' in navigator) {
      // Note: Battery API is deprecated but still works in some browsers
      // We'll skip this check for now to avoid complexity
    }

    // Check if main sync is already running
    if (syncService.isSyncInProgress()) {
      return false
    }

    return true
  }

  /**
   * Sync offline queue items
   */
  private async syncOfflineQueue(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if ('sync' in registration) {
        const syncManager = (registration as unknown as {
          sync: { register: (tag: string) => Promise<void> }
        }).sync
        await syncManager.register('sync-offline-queue')
      }
    }
  }

  /**
   * Sync specific data type
   */
  private async syncDataType(type: string): Promise<void> {
    await syncService.syncDataType(type as any)
  }

  /**
   * Get sync order based on configuration
   */
  private getSyncOrder(): SyncPriority[] {
    const sorted = [...this.priorities]

    switch (this.config.prioritizeBy) {
      case 'time':
        // Sort by time since last sync (oldest first)
        sorted.sort((a, b) => a.lastSyncTime - b.lastSyncTime)
        break

      case 'type':
        // Already sorted by type priority
        break

      case 'size':
        // Sort by data size (smallest first)
        sorted.sort((a, b) => a.dataSize - b.dataSize)
        break
    }

    // Ensure dependencies are met
    const ordered: SyncPriority[] = []
    const processed = new Set<string>()

    while (ordered.length < sorted.length) {
      for (const priority of sorted) {
        if (processed.has(priority.type)) continue

        // Check if all dependencies are met
        const dependenciesMet = priority.dependencies.every(dep => processed.has(dep))

        if (dependenciesMet) {
          ordered.push(priority)
          processed.add(priority.type)
        }
      }
    }

    return ordered
  }

  /**
   * Update priorities with current sync times
   */
  private async updatePriorities(): Promise<void> {
    try {
      const { offlineStorage } = await import('./offlineStorage')
      const metadata = await offlineStorage.getSyncMetadata()

      this.priorities.forEach(priority => {
        switch (priority.type) {
          case 'products':
            priority.lastSyncTime = metadata.lastProductSync || 0
            break
          case 'categories':
            priority.lastSyncTime = metadata.lastCategorySync || 0
            break
          case 'customers':
            priority.lastSyncTime = metadata.lastCustomerSync || 0
            break
          case 'suppliers':
            priority.lastSyncTime = metadata.lastSupplierSync || 0
            break
        }
      })
    } catch (error) {
      console.warn('Failed to update sync priorities:', error)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BackgroundSyncConfig>): void {
    this.config = { ...this.config, ...config }

    if (this.config.enabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  /**
   * Force immediate background sync
   */
  async forceSync(): Promise<void> {
    await this.performBackgroundSync()
  }

  /**
   * Get background sync status
   */
  getStatus() {
    return {
      isActive: !!this.syncInterval,
      isSyncing: this.isBackgroundSyncing,
      lastSync: this.lastBackgroundSync,
      config: this.config,
      priorities: this.priorities,
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService()