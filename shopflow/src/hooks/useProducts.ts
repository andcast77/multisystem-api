import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product } from '@prisma/client'
import type { CreateProductInput, UpdateProductInput, ProductQueryInput } from '@/lib/validations/product'
import { offlineStorage } from '@/lib/services/offlineStorage'
import type { Product as OfflineProduct } from '@/lib/utils/indexedDB'

// Helper function to safely convert updatedAt to ISO string
function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString()
  if (date instanceof Date) return date.toISOString()
  if (typeof date === 'string') return date
  return new Date().toISOString()
}

interface ProductsResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchProducts(query?: ProductQueryInput): Promise<ProductsResponse> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const params = new URLSearchParams()
      if (query?.search) params.append('search', query.search)
      if (query?.categoryId) params.append('categoryId', query.categoryId)
      if (query?.active !== undefined) params.append('active', String(query.active))
      if (query?.minPrice !== undefined) params.append('minPrice', String(query.minPrice))
      if (query?.maxPrice !== undefined) params.append('maxPrice', String(query.maxPrice))
      if (query?.lowStock) params.append('lowStock', 'true')
      if (query?.page) params.append('page', String(query.page))
      if (query?.limit) params.append('limit', String(query.limit))

      const response = await fetch(`/api/products?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        
        // Save to IndexedDB for offline use
        if (data.products && Array.isArray(data.products)) {
          const transformedProducts: OfflineProduct[] = data.products.map((product: Product) => ({
            id: product.id,
            name: product.name,
            description: product.description || undefined,
            sku: product.sku,
            barcode: product.barcode || undefined,
            price: Number(product.price),
            cost: Number(product.cost),
            stock: product.stock,
            minStock: product.minStock,
            categoryId: product.categoryId || undefined,
            supplierId: product.supplierId || undefined,
            active: product.active,
            updatedAt: toISOString(product.updatedAt),
          }))
          await offlineStorage.saveProducts(transformedProducts)
        }
        
        return data
      }
    } catch (error) {
      // Fall through to offline storage
      console.warn('Failed to fetch products from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineProducts = await offlineStorage.getProducts()
  
  // Apply filters if provided
  let filtered = offlineProducts
  if (query?.search) {
    const searchLower = query.search.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.barcode?.toLowerCase().includes(searchLower)
    )
  }
  if (query?.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === query.categoryId)
  }
  if (query?.active !== undefined) {
    filtered = filtered.filter((p) => p.active === query.active)
  }
  if (query?.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= query.minPrice!)
  }
  if (query?.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= query.maxPrice!)
  }
  if (query?.lowStock) {
    filtered = filtered.filter((p) => p.stock <= p.minStock)
  }

  // Apply pagination
  const page = query?.page || 1
  const limit = query?.limit || 100
  const start = (page - 1) * limit
  const end = start + limit
  const paginated = filtered.slice(start, end)

  // Transform back to Prisma Product format
  const products: Product[] = paginated.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || null,
    sku: p.sku,
    barcode: p.barcode || null,
    price: p.price,
    cost: p.cost,
    stock: p.stock,
    minStock: p.minStock,
    categoryId: p.categoryId || null,
    supplierId: p.supplierId || null,
    storeId: null,
    active: p.active,
    createdAt: new Date(),
    updatedAt: new Date(p.updatedAt),
  }))

  return {
    products,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  }
}

async function fetchProduct(id: string): Promise<Product> {
  // Try to fetch from API first if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const response = await fetch(`/api/products/${id}`)
      if (response.ok) {
        const product = await response.json()
        
        // Save to IndexedDB
        const transformedProduct: OfflineProduct = {
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          sku: product.sku,
          barcode: product.barcode || undefined,
          price: Number(product.price),
          cost: Number(product.cost),
          stock: product.stock,
          minStock: product.minStock,
          categoryId: product.categoryId || undefined,
          supplierId: product.supplierId || undefined,
          active: product.active,
          updatedAt: product.updatedAt.toISOString(),
        }
        await offlineStorage.saveProduct(transformedProduct)
        
        return product
      }
    } catch (error) {
      // Fall through to offline storage
      console.warn('Failed to fetch product from API, using offline storage:', error)
    }
  }

  // Fallback to offline storage
  const offlineProduct = await offlineStorage.getProduct(id)
  if (!offlineProduct) {
    throw new Error('Product not found')
  }

  // Transform back to Prisma Product format
  return {
    id: offlineProduct.id,
    name: offlineProduct.name,
    description: offlineProduct.description || null,
    sku: offlineProduct.sku,
    barcode: offlineProduct.barcode || null,
    price: offlineProduct.price,
    cost: offlineProduct.cost,
    stock: offlineProduct.stock,
    minStock: offlineProduct.minStock,
    categoryId: offlineProduct.categoryId || null,
    supplierId: offlineProduct.supplierId || null,
    storeId: null,
    active: offlineProduct.active,
    createdAt: new Date(),
    updatedAt: new Date(offlineProduct.updatedAt),
  }
}

async function createProduct(data: CreateProductInput): Promise<Product> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Create temporary product for immediate feedback
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempProduct: Product = {
      id: tempId,
      name: data.name,
      description: data.description || null,
      sku: data.sku,
      barcode: data.barcode || null,
      price: data.price,
      cost: data.cost || 0,
      stock: data.stock || 0,
      minStock: data.minStock || 0,
      categoryId: data.categoryId || null,
      supplierId: data.supplierId || null,
      storeId: null,
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Save to IndexedDB immediately for instant feedback
    try {
      const transformedProduct: OfflineProduct = {
        id: tempId,
        name: tempProduct.name,
        description: tempProduct.description || undefined,
        sku: tempProduct.sku,
        barcode: tempProduct.barcode || undefined,
        price: Number(tempProduct.price),
        cost: Number(tempProduct.cost),
        stock: tempProduct.stock,
        minStock: tempProduct.minStock,
        categoryId: tempProduct.categoryId || undefined,
        supplierId: tempProduct.supplierId || undefined,
        active: tempProduct.active,
        updatedAt: toISOString(tempProduct.updatedAt),
      }
      await offlineStorage.saveProduct(transformedProduct)
    } catch (error) {
      console.warn('Failed to save product to offline storage:', error)
    }

    // The request will be queued by the service worker
    // Return the temp product so UI can update immediately
    return tempProduct
  }

  // Online: try to create on server
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create product')
    }
    const product = await response.json()

    // Save to IndexedDB
    try {
      const transformedProduct: OfflineProduct = {
        id: product.id,
        name: product.name,
        description: product.description || undefined,
        sku: product.sku,
        barcode: product.barcode || undefined,
        price: Number(product.price),
        cost: Number(product.cost),
        stock: product.stock,
        minStock: product.minStock,
        categoryId: product.categoryId || undefined,
        supplierId: product.supplierId || undefined,
        active: product.active,
        updatedAt: product.updatedAt.toISOString(),
      }
      await offlineStorage.saveProduct(transformedProduct)
    } catch (error) {
      console.warn('Failed to save product to offline storage:', error)
    }

    return product
  } catch (error) {
    // If fetch fails, treat as offline
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - queue for later
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempProduct: Product = {
        id: tempId,
        name: data.name,
        description: data.description || null,
        sku: data.sku,
        barcode: data.barcode || null,
        price: data.price,
        cost: data.cost || 0,
        stock: data.stock || 0,
        minStock: data.minStock || 0,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
        storeId: null,
        active: data.active !== undefined ? data.active : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Save to IndexedDB
      try {
        const transformedProduct: OfflineProduct = {
          id: tempId,
          name: tempProduct.name,
          description: tempProduct.description || undefined,
          sku: tempProduct.sku,
          barcode: tempProduct.barcode || undefined,
          price: Number(tempProduct.price),
          cost: Number(tempProduct.cost),
          stock: tempProduct.stock,
          minStock: tempProduct.minStock,
          categoryId: tempProduct.categoryId || undefined,
          supplierId: tempProduct.supplierId || undefined,
          active: tempProduct.active,
          updatedAt: toISOString(tempProduct.updatedAt),
        }
        await offlineStorage.saveProduct(transformedProduct)
      } catch (err) {
        console.warn('Failed to save product to offline storage:', err)
      }

      return tempProduct
    }
    throw error
  }
}

async function updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Get existing product from IndexedDB for offline update
  let existingProduct: OfflineProduct | null = null
  try {
    existingProduct = await offlineStorage.getProduct(id)
  } catch (error) {
    console.warn('Failed to get product from offline storage:', error)
  }

  if (isOffline || !existingProduct) {
    // Offline: update IndexedDB immediately and queue request
    if (existingProduct) {
      const updatedProduct: OfflineProduct = {
        ...existingProduct,
        name: data.name ?? existingProduct.name,
        description: data.description !== undefined ? data.description : existingProduct.description,
        sku: data.sku ?? existingProduct.sku,
        barcode: data.barcode !== undefined ? data.barcode : existingProduct.barcode,
        price: data.price !== undefined ? Number(data.price) : existingProduct.price,
        cost: data.cost !== undefined ? Number(data.cost) : existingProduct.cost,
        stock: data.stock !== undefined ? data.stock : existingProduct.stock,
        minStock: data.minStock !== undefined ? data.minStock : existingProduct.minStock,
        categoryId: data.categoryId !== undefined ? data.categoryId : existingProduct.categoryId,
        supplierId: data.supplierId !== undefined ? data.supplierId : existingProduct.supplierId,
        active: data.active !== undefined ? data.active : existingProduct.active,
        updatedAt: new Date().toISOString(),
      }

      // Update in IndexedDB immediately
      try {
        await offlineStorage.saveProduct(updatedProduct)
      } catch (error) {
        console.warn('Failed to update product in offline storage:', error)
      }

      // Return updated product (request will be queued by service worker)
      return {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description || null,
        sku: updatedProduct.sku,
        barcode: updatedProduct.barcode || null,
        price: updatedProduct.price,
        cost: updatedProduct.cost,
        stock: updatedProduct.stock,
        minStock: updatedProduct.minStock,
        categoryId: updatedProduct.categoryId || null,
        supplierId: updatedProduct.supplierId || null,
        storeId: null,
        active: updatedProduct.active,
        createdAt: new Date(),
        updatedAt: new Date(updatedProduct.updatedAt),
      }
    }
  }

  // Online: try to update on server
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update product')
    }
    
    const product = await response.json()
    
    // Update in IndexedDB
    try {
      const transformedProduct: OfflineProduct = {
        id: product.id,
        name: product.name,
        description: product.description || undefined,
        sku: product.sku,
        barcode: product.barcode || undefined,
        price: Number(product.price),
        cost: Number(product.cost),
        stock: product.stock,
        minStock: product.minStock,
        categoryId: product.categoryId || undefined,
        supplierId: product.supplierId || undefined,
        active: product.active,
        updatedAt: product.updatedAt.toISOString(),
      }
      await offlineStorage.saveProduct(transformedProduct)
    } catch (error) {
      console.warn('Failed to update product in offline storage:', error)
    }
    
    return product
  } catch (error) {
    // If fetch fails and we have existing product, update offline
    if (error instanceof TypeError && error.message.includes('fetch') && existingProduct) {
      const updatedProduct: OfflineProduct = {
        ...existingProduct,
        name: data.name ?? existingProduct.name,
        description: data.description !== undefined ? data.description : existingProduct.description,
        sku: data.sku ?? existingProduct.sku,
        barcode: data.barcode !== undefined ? data.barcode : existingProduct.barcode,
        price: data.price !== undefined ? Number(data.price) : existingProduct.price,
        cost: data.cost !== undefined ? Number(data.cost) : existingProduct.cost,
        stock: data.stock !== undefined ? data.stock : existingProduct.stock,
        minStock: data.minStock !== undefined ? data.minStock : existingProduct.minStock,
        categoryId: data.categoryId !== undefined ? data.categoryId : existingProduct.categoryId,
        supplierId: data.supplierId !== undefined ? data.supplierId : existingProduct.supplierId,
        active: data.active !== undefined ? data.active : existingProduct.active,
        updatedAt: new Date().toISOString(),
      }

      await offlineStorage.saveProduct(updatedProduct)

      return {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description || null,
        sku: updatedProduct.sku,
        barcode: updatedProduct.barcode || null,
        price: updatedProduct.price,
        cost: updatedProduct.cost,
        stock: updatedProduct.stock,
        minStock: updatedProduct.minStock,
        categoryId: updatedProduct.categoryId || null,
        supplierId: updatedProduct.supplierId || null,
        storeId: null,
        active: updatedProduct.active,
        createdAt: new Date(),
        updatedAt: new Date(updatedProduct.updatedAt),
      }
    }
    throw error
  }
}

async function deleteProduct(id: string): Promise<void> {
  // Check if offline
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  if (isOffline) {
    // Offline: remove from IndexedDB immediately and queue request
    try {
      await offlineStorage.deleteProduct(id)
    } catch (error) {
      console.warn('Failed to delete product from offline storage:', error)
    }
    // Request will be queued by service worker
    return
  }

  // Online: try to delete on server
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete product')
    }
    
    // Remove from IndexedDB
    try {
      await offlineStorage.deleteProduct(id)
    } catch (error) {
      console.warn('Failed to delete product from offline storage:', error)
    }
  } catch (error) {
    // If fetch fails, delete from IndexedDB anyway (will sync later)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      try {
        await offlineStorage.deleteProduct(id)
      } catch (err) {
        console.warn('Failed to delete product from offline storage:', err)
      }
      // Request will be queued by service worker
      return
    }
    throw error
  }
}

export function useProducts(query?: ProductQueryInput) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () => fetchProducts(query),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      updateProduct(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['products', data.id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

