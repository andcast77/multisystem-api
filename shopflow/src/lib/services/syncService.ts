/**
 * Sync Service
 * Handles synchronization of offline data with server when connection is restored
 * Includes incremental sync, conflict resolution, and batch processing
 */

import { offlineStorage } from './offlineStorage'
import { conflictResolver, type Conflict } from './conflictResolver'
import type {
  Product,
  Category,
  Customer,
  Supplier,
  StoreConfig,
  TicketConfig,
} from '@/lib/utils/indexedDB'

export interface SyncResult {
  success: boolean
  synced: {
    products: number
    categories: number
    customers: number
    suppliers: number
    storeConfig: boolean
    ticketConfig: boolean
  }
  errors: Array<{ type: string; error: string }>
  conflicts: Array<Conflict>
  resolved: {
    products: number
    categories: number
    customers: number
    suppliers: number
  }
  incremental: {
    products: number
    categories: number
    customers: number
    suppliers: number
  }
}

export interface PushResult {
  success: boolean
  pushed: {
    products: number
    categories: number
    customers: number
    suppliers: number
  }
  errors: Array<{ type: string; error: string }>
}

export interface SyncProgress {
  stage: 'products' | 'categories' | 'customers' | 'suppliers' | 'config' | 'complete'
  progress: number
  total: number
  current?: string
}

class SyncService {
  private isSyncing = false
  private syncListeners: Array<(progress: SyncProgress) => void> = []
  private syncQueue: Array<{ resolve: (result: SyncResult) => void; reject: (error: Error) => void }> = []
  private currentSyncPromise: Promise<SyncResult> | null = null

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing
  }

  /**
   * Add progress listener
   */
  onProgress(listener: (progress: SyncProgress) => void): () => void {
    this.syncListeners.push(listener)
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener)
    }
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(progress: SyncProgress): void {
    this.syncListeners.forEach((listener) => listener(progress))
  }

  /**
   * Push local changes to server
   */
  async syncPush(): Promise<PushResult> {
    const result: PushResult = {
      success: true,
      pushed: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
      },
      errors: [],
    }

    try {
      // Push products
      try {
        const localProducts = await offlineStorage.getProducts()
        const modifiedProducts = localProducts.filter((p) => p.localModifiedAt)
        
        if (modifiedProducts.length > 0) {
          this.notifyProgress({ stage: 'products', progress: 0, total: modifiedProducts.length })
          
          // Send in batches
          const BATCH_SIZE = 50
          for (let i = 0; i < modifiedProducts.length; i += BATCH_SIZE) {
            const batch = modifiedProducts.slice(i, i + BATCH_SIZE)
            
            const response = await fetch('/api/sync/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ products: batch }),
            })

            // If endpoint doesn't exist (404), skip push but don't fail
            if (response.status === 404) {
              console.warn('Sync push endpoint /api/sync/products not found, skipping push')
              // Skip push for all batches if endpoint doesn't exist
              break
            }

            if (!response.ok) {
              throw new Error(`Failed to push products: ${response.statusText}`)
            }

            const now = Date.now()
            // Mark as synced
            const syncedProducts = batch.map((p) => ({
              ...p,
              lastSyncedAt: now,
              localModifiedAt: undefined,
            }))
            
            await offlineStorage.saveProducts(syncedProducts)
            result.pushed.products += batch.length
            
            this.notifyProgress({
              stage: 'products',
              progress: Math.min(i + BATCH_SIZE, modifiedProducts.length),
              total: modifiedProducts.length,
            })
          }
        }
      } catch (error) {
        // Don't fail if error is about endpoint not existing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
          result.success = false
          result.errors.push({
            type: 'products',
            error: errorMessage,
          })
        } else {
          console.warn('Push products skipped: endpoint not available')
        }
      }

      // Push categories
      try {
        const localCategories = await offlineStorage.getCategories()
        const modifiedCategories = localCategories.filter((c) => c.localModifiedAt)
        
        if (modifiedCategories.length > 0) {
          const response = await fetch('/api/sync/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: modifiedCategories }),
          })

          if (!response.ok) {
            throw new Error(`Failed to push categories: ${response.statusText}`)
          }

          const now = Date.now()
          const syncedCategories = modifiedCategories.map((c) => ({
            ...c,
            lastSyncedAt: now,
            localModifiedAt: undefined,
          }))
          
          await offlineStorage.saveCategories(syncedCategories)
          result.pushed.categories = modifiedCategories.length
        }
      } catch (error) {
        // Don't fail if error is about endpoint not existing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
          result.success = false
          result.errors.push({
            type: 'categories',
            error: errorMessage,
          })
        } else {
          console.warn('Push categories skipped: endpoint not available')
        }
      }

      // Push customers
      try {
        const localCustomers = await offlineStorage.getCustomers()
        const modifiedCustomers = localCustomers.filter((c) => c.localModifiedAt)
        
        if (modifiedCustomers.length > 0) {
          const response = await fetch('/api/sync/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customers: modifiedCustomers }),
          })

          // If endpoint doesn't exist (404), skip push but don't fail
          if (response.status === 404) {
            console.warn('Sync push endpoint /api/sync/customers not found, skipping push')
            // Continue without error
            return result
          }

          if (!response.ok) {
            throw new Error(`Failed to push customers: ${response.statusText}`)
          }

          const now = Date.now()
          const syncedCustomers = modifiedCustomers.map((c) => ({
            ...c,
            lastSyncedAt: now,
            localModifiedAt: undefined,
          }))
          
          await offlineStorage.saveCustomers(syncedCustomers)
          result.pushed.customers = modifiedCustomers.length
        }
      } catch (error) {
        result.success = false
        result.errors.push({
          type: 'customers',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      // Push suppliers
      try {
        const localSuppliers = await offlineStorage.getSuppliers()
        const modifiedSuppliers = localSuppliers.filter((s) => s.localModifiedAt)
        
        if (modifiedSuppliers.length > 0) {
          const response = await fetch('/api/sync/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suppliers: modifiedSuppliers }),
          })

          // If endpoint doesn't exist (404), skip push but don't fail
          if (response.status === 404) {
            console.warn('Sync push endpoint /api/sync/suppliers not found, skipping push')
            // Continue without error
            return result
          }

          if (!response.ok) {
            throw new Error(`Failed to push suppliers: ${response.statusText}`)
          }

          const now = Date.now()
          const syncedSuppliers = modifiedSuppliers.map((s) => ({
            ...s,
            lastSyncedAt: now,
            localModifiedAt: undefined,
          }))
          
          await offlineStorage.saveSuppliers(syncedSuppliers)
          result.pushed.suppliers = modifiedSuppliers.length
        }
      } catch (error) {
        // Don't fail if error is about endpoint not existing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
          result.success = false
          result.errors.push({
            type: 'suppliers',
            error: errorMessage,
          })
        } else {
          console.warn('Push suppliers skipped: endpoint not available')
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'general',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return result
  }

  /**
   * Pull changes from server (existing sync methods)
   */
  private async syncPull(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
        storeConfig: false,
        ticketConfig: false,
      },
      errors: [],
      conflicts: [],
      resolved: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
      },
      incremental: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
      },
    }

    // Sync products (incremental)
    try {
      this.notifyProgress({ stage: 'products', progress: 0, total: 1 })
      const { products, conflicts } = await this.syncProducts(true)
      result.synced.products = products.length
      result.conflicts.push(...conflicts)
      result.incremental.products = products.length
      if (conflicts.length > 0) {
        const resolved = conflicts.filter((c) => !conflictResolver.requiresManualResolution(c)).length
        result.resolved.products = resolved
      }
      this.notifyProgress({ stage: 'products', progress: 1, total: 1 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'products',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Sync categories (incremental)
    try {
      this.notifyProgress({ stage: 'categories', progress: 0, total: 1 })
      const { categories, conflicts } = await this.syncCategories(true)
      result.synced.categories = categories.length
      result.conflicts.push(...conflicts)
      result.incremental.categories = categories.length
      if (conflicts.length > 0) {
        result.resolved.categories = conflicts.filter((c) => !conflictResolver.requiresManualResolution(c)).length
      }
      this.notifyProgress({ stage: 'categories', progress: 1, total: 1 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'categories',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Sync customers (incremental)
    try {
      this.notifyProgress({ stage: 'customers', progress: 0, total: 1 })
      const { customers, conflicts } = await this.syncCustomers(true)
      result.synced.customers = customers.length
      result.conflicts.push(...conflicts)
      result.incremental.customers = customers.length
      if (conflicts.length > 0) {
        result.resolved.customers = conflicts.filter((c) => !conflictResolver.requiresManualResolution(c)).length
      }
      this.notifyProgress({ stage: 'customers', progress: 1, total: 1 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'customers',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Sync suppliers (incremental)
    try {
      this.notifyProgress({ stage: 'suppliers', progress: 0, total: 1 })
      const { suppliers, conflicts } = await this.syncSuppliers(true)
      result.synced.suppliers = suppliers.length
      result.conflicts.push(...conflicts)
      result.incremental.suppliers = suppliers.length
      if (conflicts.length > 0) {
        result.resolved.suppliers = conflicts.filter((c) => !conflictResolver.requiresManualResolution(c)).length
      }
      this.notifyProgress({ stage: 'suppliers', progress: 1, total: 1 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'suppliers',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Sync store config
    try {
      this.notifyProgress({ stage: 'config', progress: 0, total: 2 })
      const storeConfig = await this.syncStoreConfig()
      result.synced.storeConfig = !!storeConfig
      this.notifyProgress({ stage: 'config', progress: 1, total: 2 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'storeConfig',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Sync ticket config
    try {
      const ticketConfig = await this.syncTicketConfig()
      result.synced.ticketConfig = !!ticketConfig
      this.notifyProgress({ stage: 'config', progress: 2, total: 2 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'ticketConfig',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return result
  }

  /**
   * Process the sync queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return
    }

    const nextItem = this.syncQueue.shift()
    if (!nextItem) {
      return
    }

    try {
      const result = await this.executeSync()
      nextItem.resolve(result)
    } catch (error) {
      nextItem.reject(error instanceof Error ? error : new Error('Unknown sync error'))
    }

    // Process next item in queue
    this.processQueue()
  }

  /**
   * Execute the actual sync operation (push then pull)
   */
  private async executeSync(): Promise<SyncResult> {
    this.isSyncing = true
    const result: SyncResult = {
      success: true,
      synced: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
        storeConfig: false,
        ticketConfig: false,
      },
      errors: [],
      conflicts: [],
      resolved: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
      },
      incremental: {
        products: 0,
        categories: 0,
        customers: 0,
        suppliers: 0,
      },
    }

    try {
      await offlineStorage.updateSyncMetadata({ syncInProgress: true })

      // Step 1: Push local changes first (optional - skip if endpoints don't exist)
      try {
        const pushResult = await this.syncPush()
        // Only add errors if push actually failed (not just skipped)
        // Errors from 404s are already handled in syncPush and logged as warnings
        if (!pushResult.success && pushResult.errors.length > 0) {
          // Filter out 404 errors (endpoints not implemented yet)
          const realErrors = pushResult.errors.filter(e => !e.error.includes('404') && !e.error.includes('not found'))
          if (realErrors.length > 0) {
            result.errors.push(...realErrors)
          }
        }
      } catch (error) {
        // Only fail if it's not a 404 (endpoint doesn't exist)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
          result.errors.push({
            type: 'push',
            error: errorMessage,
          })
        } else {
          console.warn('Sync push endpoints not available, continuing with pull only')
        }
      }

      // Step 2: Pull changes from server
      const pullResult = await this.syncPull()
      result.synced = pullResult.synced
      result.conflicts.push(...pullResult.conflicts)
      result.resolved = pullResult.resolved
      result.incremental = pullResult.incremental
      result.errors.push(...pullResult.errors)
      if (!pullResult.success) {
        result.success = false
      }

      // Update sync metadata
      await offlineStorage.updateSyncMetadata({
        lastSync: Date.now(),
        syncInProgress: false,
      })

      this.notifyProgress({ stage: 'complete', progress: 1, total: 1 })
    } catch (error) {
      result.success = false
      result.errors.push({
        type: 'general',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      await offlineStorage.updateSyncMetadata({ syncInProgress: false })
    } finally {
      this.isSyncing = false
    }

    return result
  }

  /**
   * Sync all data with server (bidirectional: push then pull)
   */
  async syncAll(): Promise<SyncResult> {
    // If there's already a sync in progress, return the same promise (deduplication)
    if (this.currentSyncPromise) {
      return this.currentSyncPromise
    }

    // If sync is already running, queue this request
    if (this.isSyncing) {
      return new Promise<SyncResult>((resolve, reject) => {
        this.syncQueue.push({ resolve, reject })
      })
    }

    // Create new sync promise
    this.currentSyncPromise = this.executeSync()
      .then((result) => {
        this.currentSyncPromise = null
        // Process queue after sync completes
        this.processQueue()
        return result
      })
      .catch((error) => {
        this.currentSyncPromise = null
        // Process queue even on error
        this.processQueue()
        throw error
      })

    return this.currentSyncPromise
  }

  /**
   * Sync products from server with incremental sync and conflict resolution
   */
  private async syncProducts(incremental: boolean = true): Promise<{ products: Product[]; conflicts: Conflict[] }> {
    try {
      const metadata = await offlineStorage.getSyncMetadata()
      // Note: Endpoint doesn't support 'since' parameter yet, so we sync all products
      // Limit is max 100 per the API schema, so we'll fetch in pages
      const limit = 100
      let page = 1
      let allServerProducts: any[] = []
      let hasMore = true
      
      // Fetch all products in pages
      while (hasMore) {
        const url = `/api/products?limit=${limit}&page=${page}`
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.statusText}`)
        }
        
        const data = await response.json()
        // Handle paginated response structure: { products: [...], pagination: {...} }
        const products = Array.isArray(data.products) 
          ? data.products 
          : (Array.isArray(data.data?.products) ? data.data.products : (Array.isArray(data) ? data : []))
        allServerProducts.push(...products)
        
        // Check if there are more pages based on pagination info
        const pagination = data.pagination || data.data?.pagination
        if (pagination) {
          hasMore = page < pagination.totalPages
        } else {
          // Fallback: check if we got a full page
          hasMore = products.length === limit
        }
        page++
        
        // Safety limit to prevent infinite loops
        if (page > 1000) {
          console.warn('Reached maximum page limit for products sync')
          break
        }
      }
      
      const serverProducts = allServerProducts

      // Get local products for conflict detection
      const localProducts = await offlineStorage.getProducts()
      const localMap = new Map(localProducts.map((p) => [p.id, p]))

      const conflicts: Conflict[] = []
      const transformedProducts: Product[] = []
      const now = Date.now()

      // Process in batches for better performance
      const BATCH_SIZE = 50
      for (let i = 0; i < serverProducts.length; i += BATCH_SIZE) {
        const batch = serverProducts.slice(i, i + BATCH_SIZE)
        
        for (const serverProduct of batch) {
          const localProduct = localMap.get(serverProduct.id)
          
          // Transform server product
          const transformed: Product = {
            id: serverProduct.id,
            name: serverProduct.name,
            description: serverProduct.description,
            sku: serverProduct.sku,
            barcode: serverProduct.barcode,
            price: serverProduct.price,
            cost: serverProduct.cost,
            stock: serverProduct.stock,
            minStock: serverProduct.minStock,
            categoryId: serverProduct.categoryId,
            supplierId: serverProduct.supplierId,
            active: serverProduct.active ?? true,
            updatedAt: serverProduct.updatedAt || new Date().toISOString(),
            lastSyncedAt: now,
          }

          // Check for conflicts
          if (localProduct && conflictResolver.detectConflict(localProduct, serverProduct)) {
            const conflict: Conflict<Product> = {
              id: serverProduct.id,
              type: 'product',
              local: localProduct,
              server: transformed,
              localModifiedAt: localProduct.localModifiedAt || 0,
              serverModifiedAt: new Date(serverProduct.updatedAt).getTime(),
              strategy: conflictResolver.getDefaultStrategy('product', {
                id: serverProduct.id,
                type: 'product',
                local: localProduct,
                server: transformed,
                localModifiedAt: localProduct.localModifiedAt || 0,
                serverModifiedAt: new Date(serverProduct.updatedAt).getTime(),
                strategy: 'last-write-wins',
              }),
            }
            conflicts.push(conflict)

            // Auto-resolve if strategy is not manual
            if (!conflictResolver.requiresManualResolution(conflict)) {
              const resolution = conflictResolver.resolveConflict(conflict)
              
              // For stock conflicts resolved with merge, ensure we preserve the resolved stock
              const resolvedProduct = {
                ...resolution.resolved,
                lastSyncedAt: now,
                localModifiedAt: undefined, // Clear local modification after sync
              } as Product
              
              // Store last synced stock for future conflict resolution
              if (conflict.type === 'product' && resolution.merged) {
                (resolvedProduct as any).lastSyncedStock = resolvedProduct.stock
              }
              
              transformedProducts.push(resolvedProduct)
            } else {
              // Keep local for manual resolution
              transformedProducts.push({
                ...localProduct,
                lastSyncedAt: now,
              })
            }
          } else {
            // No conflict, use server version
            // Store last synced stock for future conflict resolution
            const productWithStock = {
              ...transformed,
              lastSyncedStock: transformed.stock,
            }
            transformedProducts.push(productWithStock as Product)
          }
        }

        // Update progress
        this.notifyProgress({
          stage: 'products',
          progress: Math.min(i + BATCH_SIZE, serverProducts.length),
          total: serverProducts.length,
        })
      }

      // Save all products
      await offlineStorage.saveProducts(transformedProducts)
      
      return { products: transformedProducts, conflicts }
    } catch (error) {
      // If network error, return cached products
      const cachedProducts = await offlineStorage.getProducts()
      if (cachedProducts.length > 0) {
        return { products: cachedProducts, conflicts: [] }
      }
      throw error
    }
  }

  /**
   * Sync categories from server with incremental sync and conflict resolution
   */
  private async syncCategories(incremental: boolean = true): Promise<{ categories: Category[]; conflicts: Conflict[] }> {
    try {
      const metadata = await offlineStorage.getSyncMetadata()
      const lastSync = incremental ? metadata.lastCategorySync : null
      
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
      }

      const data = await response.json()
      const serverCategories: any[] = Array.isArray(data.categories) ? data.categories : data

      const localCategories = await offlineStorage.getCategories()
      const localMap = new Map(localCategories.map((c) => [c.id, c]))

      const conflicts: Conflict[] = []
      const transformedCategories: Category[] = []
      const now = Date.now()

      for (const serverCategory of serverCategories) {
        const localCategory = localMap.get(serverCategory.id)
        
        const transformed: Category = {
          id: serverCategory.id,
          name: serverCategory.name,
          description: serverCategory.description,
          parentId: serverCategory.parentId,
          updatedAt: serverCategory.updatedAt || new Date().toISOString(),
          lastSyncedAt: now,
        }

        if (localCategory && conflictResolver.detectConflict(localCategory, serverCategory)) {
          const conflict: Conflict<Category> = {
            id: serverCategory.id,
            type: 'category',
            local: localCategory,
            server: transformed,
            localModifiedAt: localCategory.localModifiedAt || 0,
            serverModifiedAt: new Date(serverCategory.updatedAt).getTime(),
            strategy: 'last-write-wins',
          }
          conflicts.push(conflict)

          if (!conflictResolver.requiresManualResolution(conflict)) {
            const resolution = conflictResolver.resolveConflict(conflict)
            transformedCategories.push({
              ...resolution.resolved,
              lastSyncedAt: now,
              localModifiedAt: undefined,
            })
          } else {
            transformedCategories.push({
              ...localCategory,
              lastSyncedAt: now,
            })
          }
        } else {
          transformedCategories.push(transformed)
        }
      }

      await offlineStorage.saveCategories(transformedCategories)
      return { categories: transformedCategories, conflicts }
    } catch (error) {
      const cachedCategories = await offlineStorage.getCategories()
      if (cachedCategories.length > 0) {
        return { categories: cachedCategories, conflicts: [] }
      }
      throw error
    }
  }

  /**
   * Sync customers from server with incremental sync and conflict resolution
   */
  private async syncCustomers(incremental: boolean = true): Promise<{ customers: Customer[]; conflicts: Conflict[] }> {
    try {
      // Note: Endpoint doesn't support 'since' parameter yet, so we sync all customers
      // Fetch all customers (assuming endpoint supports pagination or returns all)
      const response = await fetch('/api/customers')
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`)
      }

      const data = await response.json()
      const serverCustomers: any[] = Array.isArray(data.customers) 
        ? data.customers 
        : (Array.isArray(data.data?.customers) ? data.data.customers : (Array.isArray(data) ? data : []))

      const localCustomers = await offlineStorage.getCustomers()
      const localMap = new Map(localCustomers.map((c) => [c.id, c]))

      const conflicts: Conflict[] = []
      const transformedCustomers: Customer[] = []
      const now = Date.now()

      for (const serverCustomer of serverCustomers) {
        const localCustomer = localMap.get(serverCustomer.id)
        
        const transformed: Customer = {
          id: serverCustomer.id,
          name: serverCustomer.name,
          email: serverCustomer.email,
          phone: serverCustomer.phone,
          address: serverCustomer.address,
          city: serverCustomer.city,
          state: serverCustomer.state,
          postalCode: serverCustomer.postalCode,
          country: serverCustomer.country,
          updatedAt: serverCustomer.updatedAt || new Date().toISOString(),
          lastSyncedAt: now,
        }

        if (localCustomer && conflictResolver.detectConflict(localCustomer, serverCustomer)) {
          const conflict: Conflict<Customer> = {
            id: serverCustomer.id,
            type: 'customer',
            local: localCustomer,
            server: transformed,
            localModifiedAt: localCustomer.localModifiedAt || 0,
            serverModifiedAt: new Date(serverCustomer.updatedAt).getTime(),
            strategy: 'last-write-wins',
          }
          conflicts.push(conflict)

          if (!conflictResolver.requiresManualResolution(conflict)) {
            const resolution = conflictResolver.resolveConflict(conflict)
            transformedCustomers.push({
              ...resolution.resolved,
              lastSyncedAt: now,
              localModifiedAt: undefined,
            })
          } else {
            transformedCustomers.push({
              ...localCustomer,
              lastSyncedAt: now,
            })
          }
        } else {
          transformedCustomers.push(transformed)
        }
      }

      await offlineStorage.saveCustomers(transformedCustomers)
      return { customers: transformedCustomers, conflicts }
    } catch (error) {
      const cachedCustomers = await offlineStorage.getCustomers()
      if (cachedCustomers.length > 0) {
        return { customers: cachedCustomers, conflicts: [] }
      }
      throw error
    }
  }

  /**
   * Sync suppliers from server with incremental sync and conflict resolution
   */
  private async syncSuppliers(incremental: boolean = true): Promise<{ suppliers: Supplier[]; conflicts: Conflict[] }> {
    try {
      const metadata = await offlineStorage.getSyncMetadata()
      const lastSync = incremental ? metadata.lastSupplierSync : null
      
      const response = await fetch('/api/suppliers')
      if (!response.ok) {
        throw new Error(`Failed to fetch suppliers: ${response.statusText}`)
      }

      const data = await response.json()
      const serverSuppliers: any[] = Array.isArray(data.suppliers) ? data.suppliers : data

      const localSuppliers = await offlineStorage.getSuppliers()
      const localMap = new Map(localSuppliers.map((s) => [s.id, s]))

      const conflicts: Conflict[] = []
      const transformedSuppliers: Supplier[] = []
      const now = Date.now()

      for (const serverSupplier of serverSuppliers) {
        const localSupplier = localMap.get(serverSupplier.id)
        
        const transformed: Supplier = {
          id: serverSupplier.id,
          name: serverSupplier.name,
          email: serverSupplier.email,
          phone: serverSupplier.phone,
          address: serverSupplier.address,
          city: serverSupplier.city,
          state: serverSupplier.state,
          postalCode: serverSupplier.postalCode,
          country: serverSupplier.country,
          active: serverSupplier.active ?? true,
          updatedAt: serverSupplier.updatedAt || new Date().toISOString(),
          lastSyncedAt: now,
        }

        if (localSupplier && conflictResolver.detectConflict(localSupplier, serverSupplier)) {
          const conflict: Conflict<Supplier> = {
            id: serverSupplier.id,
            type: 'supplier',
            local: localSupplier,
            server: transformed,
            localModifiedAt: localSupplier.localModifiedAt || 0,
            serverModifiedAt: new Date(serverSupplier.updatedAt).getTime(),
            strategy: 'last-write-wins',
          }
          conflicts.push(conflict)

          if (!conflictResolver.requiresManualResolution(conflict)) {
            const resolution = conflictResolver.resolveConflict(conflict)
            transformedSuppliers.push({
              ...resolution.resolved,
              lastSyncedAt: now,
              localModifiedAt: undefined,
            })
          } else {
            transformedSuppliers.push({
              ...localSupplier,
              lastSyncedAt: now,
            })
          }
        } else {
          transformedSuppliers.push(transformed)
        }
      }

      await offlineStorage.saveSuppliers(transformedSuppliers)
      return { suppliers: transformedSuppliers, conflicts }
    } catch (error) {
      const cachedSuppliers = await offlineStorage.getSuppliers()
      if (cachedSuppliers.length > 0) {
        return { suppliers: cachedSuppliers, conflicts: [] }
      }
      throw error
    }
  }

  /**
   * Sync store config from server
   */
  private async syncStoreConfig(): Promise<StoreConfig | null> {
    try {
      const response = await fetch('/api/store-config')
      if (!response.ok) {
        throw new Error(`Failed to fetch store config: ${response.statusText}`)
      }

      const config: any = await response.json()

      const transformedConfig: StoreConfig = {
        id: config.id || '1',
        name: config.name,
        address: config.address,
        phone: config.phone,
        email: config.email,
        currency: config.currency || 'USD',
        taxRate: config.taxRate || 0,
        lowStockAlert: config.lowStockAlert || 10,
        invoicePrefix: config.invoicePrefix || 'INV-',
        invoiceNumber: config.invoiceNumber || 1,
        updatedAt: config.updatedAt || new Date().toISOString(),
      }

      await offlineStorage.saveStoreConfig(transformedConfig)
      return transformedConfig
    } catch (error) {
      const cachedConfig = await offlineStorage.getStoreConfig()
      if (cachedConfig) {
        return cachedConfig
      }
      throw error
    }
  }

  /**
   * Sync ticket config from server
   */
  private async syncTicketConfig(): Promise<TicketConfig | null> {
    try {
      const response = await fetch('/api/ticket-config')
      if (!response.ok) {
        // Ticket config might not exist, return null
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch ticket config: ${response.statusText}`)
      }

      const config: any = await response.json()

      const transformedConfig: TicketConfig = {
        id: config.id || '1',
        ticketType: config.ticketType || 'TICKET',
        header: config.header,
        description: config.description,
        logoUrl: config.logoUrl,
        footer: config.footer,
        defaultPrinterName: config.defaultPrinterName,
        thermalWidth: config.thermalWidth,
        fontSize: config.fontSize || 12,
        copies: config.copies || 1,
        autoPrint: config.autoPrint ?? true,
        updatedAt: config.updatedAt || new Date().toISOString(),
      }

      await offlineStorage.saveTicketConfig(transformedConfig)
      return transformedConfig
    } catch (error) {
      const cachedConfig = await offlineStorage.getTicketConfig()
      if (cachedConfig) {
        return cachedConfig
      }
      // If 404, return null (config doesn't exist)
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Sync specific data type
   */
  async syncDataType(type: 'products' | 'categories' | 'customers' | 'suppliers' | 'storeConfig' | 'ticketConfig'): Promise<void> {
    switch (type) {
      case 'products':
        await this.syncProducts(true)
        break
      case 'categories':
        await this.syncCategories(true)
        break
      case 'customers':
        await this.syncCustomers(true)
        break
      case 'suppliers':
        await this.syncSuppliers(true)
        break
      case 'storeConfig':
        await this.syncStoreConfig()
        break
      case 'ticketConfig':
        await this.syncTicketConfig()
        break
    }
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict<T extends { id: string; updatedAt: string }>(
    conflict: Conflict<T>,
    resolution: 'local' | 'server' | 'merge'
  ): Promise<void> {
    const now = Date.now()
    let resolved: T

    switch (resolution) {
      case 'local':
        resolved = conflict.local
        break
      case 'server':
        resolved = conflict.server
        break
      case 'merge':
        const mergeResult = conflictResolver.resolveConflict(conflict, 'merge')
        resolved = mergeResult.resolved
        break
      default:
        resolved = conflict.local
    }

    // Update with resolved data
    const updated = {
      ...resolved,
      lastSyncedAt: now,
      localModifiedAt: undefined,
    }

    // Save to appropriate store
    switch (conflict.type) {
      case 'product':
        await offlineStorage.saveProduct(updated as Product)
        break
      case 'category':
        await offlineStorage.saveCategory(updated as Category)
        break
      case 'customer':
        await offlineStorage.saveCustomer(updated as Customer)
        break
      case 'supplier':
        await offlineStorage.saveSupplier(updated as Supplier)
        break
    }
  }
}

// Export singleton instance
export const syncService = new SyncService()
