/**
 * Hook for accessing offline data
 * Provides data from IndexedDB when offline, falls back to API when online
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOffline } from './useOffline'
import { offlineStorage } from '@/lib/services/offlineStorage'
import type {
  Product,
  Category,
  Customer,
  Supplier,
  StoreConfig,
  TicketConfig,
} from '@/lib/utils/indexedDB'

export function useOfflineProducts() {
  const { isOffline } = useOffline()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        // Load from IndexedDB when offline
        const offlineProducts = await offlineStorage.getProducts()
        setProducts(offlineProducts)
      } else {
        // Try to load from API when online
        try {
          const response = await fetch('/api/products?limit=10000')
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const fetchedProducts = Array.isArray(data.products) ? data.products : data
          setProducts(fetchedProducts)

          // Also save to IndexedDB for offline use
          const transformedProducts = fetchedProducts.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            sku: product.sku,
            barcode: product.barcode,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            minStock: product.minStock,
            categoryId: product.categoryId,
            supplierId: product.supplierId,
            active: product.active ?? true,
            updatedAt: product.updatedAt || new Date().toISOString(),
          }))
          await offlineStorage.saveProducts(transformedProducts)
        } catch (apiError) {
          // Fallback to offline data if API fails
          const offlineProducts = await offlineStorage.getProducts()
          setProducts(offlineProducts)
          if (offlineProducts.length === 0) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return { products, isLoading, error, refetch: loadProducts }
}

export function useOfflineCategories() {
  const { isOffline } = useOffline()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        const offlineCategories = await offlineStorage.getCategories()
        setCategories(offlineCategories)
      } else {
        try {
          const response = await fetch('/api/categories')
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const fetchedCategories = Array.isArray(data.categories) ? data.categories : data
          setCategories(fetchedCategories)

          const transformedCategories = fetchedCategories.map((category: any) => ({
            id: category.id,
            name: category.name,
            description: category.description,
            parentId: category.parentId,
            updatedAt: category.updatedAt || new Date().toISOString(),
          }))
          await offlineStorage.saveCategories(transformedCategories)
        } catch (apiError) {
          const offlineCategories = await offlineStorage.getCategories()
          setCategories(offlineCategories)
          if (offlineCategories.length === 0) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  return { categories, isLoading, error, refetch: loadCategories }
}

export function useOfflineCustomers() {
  const { isOffline } = useOffline()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        const offlineCustomers = await offlineStorage.getCustomers()
        setCustomers(offlineCustomers)
      } else {
        try {
          const response = await fetch('/api/customers?limit=10000')
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const fetchedCustomers = Array.isArray(data.customers) ? data.customers : data
          setCustomers(fetchedCustomers)

          const transformedCustomers = fetchedCustomers.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            postalCode: customer.postalCode,
            country: customer.country,
            updatedAt: customer.updatedAt || new Date().toISOString(),
          }))
          await offlineStorage.saveCustomers(transformedCustomers)
        } catch (apiError) {
          const offlineCustomers = await offlineStorage.getCustomers()
          setCustomers(offlineCustomers)
          if (offlineCustomers.length === 0) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return { customers, isLoading, error, refetch: loadCustomers }
}

export function useOfflineSuppliers() {
  const { isOffline } = useOffline()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        const offlineSuppliers = await offlineStorage.getSuppliers()
        setSuppliers(offlineSuppliers)
      } else {
        try {
          const response = await fetch('/api/suppliers')
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const fetchedSuppliers = Array.isArray(data.suppliers) ? data.suppliers : data
          setSuppliers(fetchedSuppliers)

          const transformedSuppliers = fetchedSuppliers.map((supplier: any) => ({
            id: supplier.id,
            name: supplier.name,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            city: supplier.city,
            state: supplier.state,
            postalCode: supplier.postalCode,
            country: supplier.country,
            active: supplier.active ?? true,
            updatedAt: supplier.updatedAt || new Date().toISOString(),
          }))
          await offlineStorage.saveSuppliers(transformedSuppliers)
        } catch (apiError) {
          const offlineSuppliers = await offlineStorage.getSuppliers()
          setSuppliers(offlineSuppliers)
          if (offlineSuppliers.length === 0) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  return { suppliers, isLoading, error, refetch: loadSuppliers }
}

export function useOfflineStoreConfig() {
  const { isOffline } = useOffline()
  const [config, setConfig] = useState<StoreConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        const offlineConfig = await offlineStorage.getStoreConfig()
        setConfig(offlineConfig)
      } else {
        try {
          const response = await fetch('/api/store-config')
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const transformedConfig: StoreConfig = {
            id: data.id || '1',
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            currency: data.currency || 'USD',
            taxRate: data.taxRate || 0,
            lowStockAlert: data.lowStockAlert || 10,
            invoicePrefix: data.invoicePrefix || 'INV-',
            invoiceNumber: data.invoiceNumber || 1,
            updatedAt: data.updatedAt || new Date().toISOString(),
          }
          setConfig(transformedConfig)
          await offlineStorage.saveStoreConfig(transformedConfig)
        } catch (apiError) {
          const offlineConfig = await offlineStorage.getStoreConfig()
          setConfig(offlineConfig)
          if (!offlineConfig) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store config')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return { config, isLoading, error, refetch: loadConfig }
}

export function useOfflineTicketConfig() {
  const { isOffline } = useOffline()
  const [config, setConfig] = useState<TicketConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isOffline) {
        const offlineConfig = await offlineStorage.getTicketConfig()
        setConfig(offlineConfig)
      } else {
        try {
          const response = await fetch('/api/ticket-config')
          if (!response.ok) {
            if (response.status === 404) {
              setConfig(null)
              return
            }
            throw new Error(`Failed to fetch: ${response.statusText}`)
          }
          const data = await response.json()
          const transformedConfig: TicketConfig = {
            id: data.id || '1',
            ticketType: data.ticketType || 'TICKET',
            header: data.header,
            description: data.description,
            logoUrl: data.logoUrl,
            footer: data.footer,
            defaultPrinterName: data.defaultPrinterName,
            thermalWidth: data.thermalWidth,
            fontSize: data.fontSize || 12,
            copies: data.copies || 1,
            autoPrint: data.autoPrint ?? true,
            updatedAt: data.updatedAt || new Date().toISOString(),
          }
          setConfig(transformedConfig)
          await offlineStorage.saveTicketConfig(transformedConfig)
        } catch (apiError) {
          const offlineConfig = await offlineStorage.getTicketConfig()
          setConfig(offlineConfig)
          // Don't throw if config doesn't exist (404)
          if (apiError instanceof Error && !apiError.message.includes('404')) {
            throw apiError
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket config')
    } finally {
      setIsLoading(false)
    }
  }, [isOffline])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return { config, isLoading, error, refetch: loadConfig }
}
