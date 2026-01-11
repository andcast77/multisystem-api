/**
 * Offline Queue Service
 * Manages offline operations queue with prioritization and retry logic
 */

export type QueuePriority = 'high' | 'normal' | 'low'
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface OfflineQueueItem {
  id: string
  url: string
  method: string
  headers: Record<string, string>
  body?: unknown
  timestamp: number
  priority: QueuePriority
  status: QueueStatus
  retries: number
  lastError?: string
  entityType?: string // 'product', 'customer', 'sale', etc.
  entityId?: string
}

const DB_NAME = 'offline-queue'
const DB_VERSION = 2
const STORE_NAME = 'requests'

class OfflineQueueService {
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB for offline queue
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('entityType', 'entityType', { unique: false })
        }
      }
    })
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * Add item to offline queue
   */
  async add(item: Omit<OfflineQueueItem, 'id' | 'status' | 'retries'>): Promise<string> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const queueItem: OfflineQueueItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        retries: 0,
      }

      const request = store.add(queueItem)

      request.onsuccess = () => {
        resolve(queueItem.id)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all pending items, sorted by priority and timestamp
   */
  async getPending(): Promise<OfflineQueueItem[]> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        const items = request.result as OfflineQueueItem[]
        // Sort by priority (high first), then by timestamp
        items.sort((a, b) => {
          const priorityOrder: Record<QueuePriority, number> = {
            high: 0,
            normal: 1,
            low: 2,
          }
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
          if (priorityDiff !== 0) return priorityDiff
          return a.timestamp - b.timestamp
        })
        resolve(items)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all items (for UI display)
   */
  async getAll(): Promise<OfflineQueueItem[]> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result as OfflineQueueItem[])
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get item by ID
   */
  async get(id: string): Promise<OfflineQueueItem | null> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve((request.result as OfflineQueueItem) || null)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update item status
   */
  async updateStatus(id: string, status: QueueStatus, error?: string): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const item = getRequest.result as OfflineQueueItem
        if (!item) {
          reject(new Error('Item not found'))
          return
        }

        item.status = status
        if (error) {
          item.lastError = error
        }
        if (status === 'failed') {
          item.retries = (item.retries || 0) + 1
        }

        const updateRequest = store.put(item)
        updateRequest.onsuccess = () => resolve()
        updateRequest.onerror = () => reject(updateRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Remove item from queue
   */
  async remove(id: string): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear completed items older than specified days
   */
  async clearCompleted(olderThanDays: number = 7): Promise<number> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('status')
      const request = index.getAll('completed')

      request.onsuccess = () => {
        const items = request.result as OfflineQueueItem[]
        const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
        const toDelete = items.filter((item) => item.timestamp < cutoffTime)

        let deleted = 0
        toDelete.forEach((item) => {
          store.delete(item.id)
          deleted++
        })

        transaction.oncomplete = () => resolve(deleted)
        transaction.onerror = () => reject(transaction.error)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get count of items by status
   */
  async getCountByStatus(): Promise<Record<QueueStatus, number>> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const items = request.result as OfflineQueueItem[]
        const counts: Record<QueueStatus, number> = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        }

        items.forEach((item) => {
          counts[item.status] = (counts[item.status] || 0) + 1
        })

        resolve(counts)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Determine priority based on URL and method
   */
  static getPriority(url: string, method: string): QueuePriority {
    // Sales are always high priority
    if (url.includes('/api/sales')) {
      return 'high'
    }

    // DELETE operations are high priority (cleanup)
    if (method === 'DELETE') {
      return 'high'
    }

    // POST operations (creates) are normal priority
    if (method === 'POST') {
      return 'normal'
    }

    // PUT/PATCH operations (updates) are normal priority
    if (method === 'PUT' || method === 'PATCH') {
      return 'normal'
    }

    return 'low'
  }

  /**
   * Extract entity type from URL
   */
  static getEntityType(url: string): string | undefined {
    const match = url.match(/\/api\/(\w+)/)
    return match ? match[1] : undefined
  }

  /**
   * Extract entity ID from URL
   */
  static getEntityId(url: string): string | undefined {
    const match = url.match(/\/api\/\w+\/([^\/\?]+)/)
    return match ? match[1] : undefined
  }
}

export const offlineQueue = new OfflineQueueService()
