/**
 * IndexedDB utilities for offline storage
 * Provides abstraction layer over IndexedDB API
 */

const DB_NAME = 'shopflow-offline-db'
const DB_VERSION = 1

export interface IDBStore {
  products: Product[]
  categories: Category[]
  customers: Customer[]
  suppliers: Supplier[]
  storeConfig: StoreConfig | null
  ticketConfig: TicketConfig | null
  syncMetadata: SyncMetadata
}

export interface SyncMetadata {
  lastSync: number | null
  lastProductSync: number | null
  lastCategorySync: number | null
  lastCustomerSync: number | null
  lastSupplierSync: number | null
  syncInProgress: boolean
}

export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  price: number
  cost: number
  stock: number
  minStock: number
  categoryId?: string
  supplierId?: string
  active: boolean
  updatedAt: string
  lastSyncedAt?: number // Timestamp of last successful sync
  localModifiedAt?: number // Timestamp of last local modification
}

export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  updatedAt: string
  lastSyncedAt?: number
  localModifiedAt?: number
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  active: boolean
  updatedAt: string
  lastSyncedAt?: number
  localModifiedAt?: number
}

export interface StoreConfig {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  currency: string
  taxRate: number
  lowStockAlert: number
  invoicePrefix: string
  invoiceNumber: number
  updatedAt: string
}

export interface TicketConfig {
  id: string
  ticketType: 'TICKET' | 'SHEET'
  header?: string
  description?: string
  logoUrl?: string
  footer?: string
  defaultPrinterName?: string
  thermalWidth?: number
  fontSize: number
  copies: number
  autoPrint: boolean
  updatedAt: string
}

let dbInstance: IDBDatabase | null = null

/**
 * Open IndexedDB database
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' })
        productStore.createIndex('sku', 'sku', { unique: true })
        productStore.createIndex('barcode', 'barcode', { unique: false })
        productStore.createIndex('categoryId', 'categoryId', { unique: false })
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('suppliers')) {
        db.createObjectStore('suppliers', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('storeConfig')) {
        db.createObjectStore('storeConfig', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('ticketConfig')) {
        db.createObjectStore('ticketConfig', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('syncMetadata')) {
        db.createObjectStore('syncMetadata', { keyPath: 'key' })
      }
    }
  })
}

/**
 * Generic function to get all items from a store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

/**
 * Generic function to get an item by key from a store
 */
export async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Generic function to put items in a store
 */
export async function putInStore<T>(storeName: string, items: T | T[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)

    const itemsArray = Array.isArray(items) ? items : [items]

    itemsArray.forEach((item) => {
      store.put(item)
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * Generic function to delete an item from a store
 */
export async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get sync metadata
 */
export async function getSyncMetadata(): Promise<SyncMetadata> {
  const defaultMetadata: SyncMetadata = {
    lastSync: null,
    lastProductSync: null,
    lastCategorySync: null,
    lastCustomerSync: null,
    lastSupplierSync: null,
    syncInProgress: false,
  }

  try {
    const metadata = await getFromStore<{ key: string; value: SyncMetadata }>(
      'syncMetadata',
      'main'
    )
    return metadata?.value || defaultMetadata
  } catch {
    return defaultMetadata
  }
}

/**
 * Update sync metadata
 */
export async function updateSyncMetadata(
  updates: Partial<SyncMetadata>
): Promise<void> {
  const current = await getSyncMetadata()
  const updated: SyncMetadata = {
    ...current,
    ...updates,
  }

  await putInStore('syncMetadata', {
    key: 'main',
    value: updated,
  })
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
