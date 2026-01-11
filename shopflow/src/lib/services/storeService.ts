import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'

export interface CreateStoreInput {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
}

export interface UpdateStoreInput {
  name?: string
  code?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  active?: boolean
}

/**
 * Get all stores
 */
export async function getStores(includeInactive = false) {
  return prisma.store.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  })
}

/**
 * Get store by ID
 */
export async function getStoreById(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  })

  if (!store) {
    throw new ApiError(404, 'Store not found', ErrorCodes.NOT_FOUND)
  }

  return store
}

/**
 * Get store by code
 */
export async function getStoreByCode(code: string) {
  const store = await prisma.store.findUnique({
    where: { code },
  })

  if (!store) {
    throw new ApiError(404, 'Store not found', ErrorCodes.NOT_FOUND)
  }

  return store
}

/**
 * Create a new store
 */
export async function createStore(data: CreateStoreInput) {
  // Check if code already exists
  const existing = await prisma.store.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new ApiError(409, 'Store code already exists', ErrorCodes.CONFLICT)
  }

  return prisma.store.create({
    data: {
      name: data.name,
      code: data.code,
      address: data.address,
      phone: data.phone,
      email: data.email,
      taxId: data.taxId,
    },
  })
}

/**
 * Update store
 */
export async function updateStore(storeId: string, data: UpdateStoreInput) {
  const store = await getStoreById(storeId)

  // Check if code is being changed and if it conflicts
  if (data.code && data.code !== store.code) {
    const existing = await prisma.store.findUnique({
      where: { code: data.code },
    })

    if (existing) {
      throw new ApiError(409, 'Store code already exists', ErrorCodes.CONFLICT)
    }
  }

  return prisma.store.update({
    where: { id: storeId },
    data: {
      name: data.name,
      code: data.code,
      address: data.address,
      phone: data.phone,
      email: data.email,
      taxId: data.taxId,
      active: data.active,
    },
  })
}

/**
 * Delete store (soft delete by setting active to false)
 */
export async function deleteStore(storeId: string) {
  // Validate store exists
  await getStoreById(storeId)

  // Check if store has products or sales
  const [productCount, saleCount] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.sale.count({ where: { storeId } }),
  ])

  if (productCount > 0 || saleCount > 0) {
    // Soft delete
    return prisma.store.update({
      where: { id: storeId },
      data: { active: false },
    })
  }

  // Hard delete if no dependencies
  return prisma.store.delete({
    where: { id: storeId },
  })
}

