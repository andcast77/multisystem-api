// Simplified product service that uses remote APIs
import { shopflowApi } from '@/lib/api/client'
import type { CreateProductInput, UpdateProductInput, ProductQueryInput } from '@/lib/validations/product'

export async function getProducts(query: ProductQueryInput = { page: 1, limit: 20 }) {
  const {
    search,
    categoryId,
    active,
    minPrice,
    maxPrice,
    lowStock,
    page = 1,
    limit = 20,
  } = query

  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (search) params.append('search', search)
  if (categoryId) params.append('categoryId', categoryId)
  if (active !== undefined) params.append('active', active.toString())
  if (minPrice !== undefined) params.append('minPrice', minPrice.toString())
  if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString())
  if (lowStock !== undefined) params.append('lowStock', lowStock.toString())

  return await shopflowApi.get(`/api/products?${params}`)
}

export async function getProductById(id: string) {
  return await shopflowApi.get(`/api/products/${id}`)
}

export async function getProductBySku(sku: string) {
  return await shopflowApi.get(`/api/products?sku=${sku}`)
}

export async function getProductByBarcode(barcode: string) {
  return await shopflowApi.get(`/api/products?barcode=${barcode}`)
}

export async function createProduct(data: CreateProductInput) {
  return await shopflowApi.post('/api/products', data)
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  return await shopflowApi.put(`/api/products/${id}`, data)
}

export async function deleteProduct(id: string) {
  return await shopflowApi.delete(`/api/products/${id}`)
}

export async function getLowStockProducts(minStockThreshold?: number) {
  const params = minStockThreshold ? `?minStockThreshold=${minStockThreshold}` : ''
  return await shopflowApi.get(`/api/products/low-stock${params}`)
}

export async function updateProductInventory(id: string, data: { stock: number; minStock?: number }) {
  return await shopflowApi.put(`/api/products/${id}/inventory`, data)
}
