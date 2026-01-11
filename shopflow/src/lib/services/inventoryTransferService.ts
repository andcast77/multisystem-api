import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { getProductById } from './productService'
import type { TransferStatus } from '@prisma/client'

export interface CreateTransferInput {
  fromStoreId: string
  toStoreId: string
  productId: string
  quantity: number
  notes?: string
  createdById: string
}

/**
 * Create inventory transfer between stores
 */
export async function createTransfer(data: CreateTransferInput) {
  // Validate stores are different
  if (data.fromStoreId === data.toStoreId) {
    throw new ApiError(400, 'Cannot transfer to the same store', ErrorCodes.VALIDATION_ERROR)
  }

  // Validate product exists and has enough stock
  const product = await getProductById(data.productId)

  // Check if product belongs to fromStore
  if (product.storeId && product.storeId !== data.fromStoreId) {
    throw new ApiError(400, 'Product does not belong to source store', ErrorCodes.VALIDATION_ERROR)
  }

  if (product.stock < data.quantity) {
    throw new ApiError(400, 'Insufficient stock', ErrorCodes.VALIDATION_ERROR)
  }

  // Create transfer
  const transfer = await prisma.inventoryTransfer.create({
    data: {
      fromStoreId: data.fromStoreId,
      toStoreId: data.toStoreId,
      productId: data.productId,
      quantity: data.quantity,
      notes: data.notes,
      createdById: data.createdById,
      status: 'PENDING',
    },
    include: {
      fromStore: true,
      toStore: true,
      product: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Reduce stock from source store
  await prisma.product.update({
    where: { id: data.productId },
    data: {
      stock: {
        decrement: data.quantity,
      },
    },
  })

  return transfer
}

/**
 * Complete a transfer (add stock to destination store)
 */
export async function completeTransfer(transferId: string) {
  const transfer = await prisma.inventoryTransfer.findUnique({
    where: { id: transferId },
    include: {
      product: true,
    },
  })

  if (!transfer) {
    throw new ApiError(404, 'Transfer not found', ErrorCodes.NOT_FOUND)
  }

  if (transfer.status !== 'PENDING' && transfer.status !== 'IN_TRANSIT') {
    throw new ApiError(400, 'Transfer already completed or cancelled', ErrorCodes.VALIDATION_ERROR)
  }

  // Find or create product in destination store
  const destinationProduct = await prisma.product.findFirst({
    where: {
      sku: transfer.product.sku,
      storeId: transfer.toStoreId,
    },
  })

  if (destinationProduct) {
    // Update existing product stock
    await prisma.product.update({
      where: { id: destinationProduct.id },
      data: {
        stock: {
          increment: transfer.quantity,
        },
      },
    })
  } else {
    // Create product in destination store
    await prisma.product.create({
      data: {
        name: transfer.product.name,
        description: transfer.product.description,
        sku: transfer.product.sku + `-${transfer.toStoreId}`, // Unique SKU per store
        barcode: transfer.product.barcode,
        price: transfer.product.price,
        cost: transfer.product.cost,
        stock: transfer.quantity,
        minStock: transfer.product.minStock,
        categoryId: transfer.product.categoryId,
        supplierId: transfer.product.supplierId,
        storeId: transfer.toStoreId,
        active: transfer.product.active,
      },
    })
  }

  // Update transfer status
  return prisma.inventoryTransfer.update({
    where: { id: transferId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      fromStore: true,
      toStore: true,
      product: true,
    },
  })
}

/**
 * Cancel a transfer (restore stock to source store)
 */
export async function cancelTransfer(transferId: string) {
  const transfer = await prisma.inventoryTransfer.findUnique({
    where: { id: transferId },
  })

  if (!transfer) {
    throw new ApiError(404, 'Transfer not found', ErrorCodes.NOT_FOUND)
  }

  if (transfer.status === 'COMPLETED') {
    throw new ApiError(400, 'Cannot cancel completed transfer', ErrorCodes.VALIDATION_ERROR)
  }

  if (transfer.status === 'CANCELLED') {
    throw new ApiError(400, 'Transfer already cancelled', ErrorCodes.VALIDATION_ERROR)
  }

  // Restore stock to source store
  await prisma.product.update({
    where: { id: transfer.productId },
    data: {
      stock: {
        increment: transfer.quantity,
      },
    },
  })

  // Update transfer status
  return prisma.inventoryTransfer.update({
    where: { id: transferId },
    data: {
      status: 'CANCELLED',
    },
  })
}

/**
 * Get transfers with filters
 */
export async function getTransfers(filters: {
  fromStoreId?: string
  toStoreId?: string
  productId?: string
  status?: TransferStatus
  page?: number
  limit?: number
} = {}) {
  const {
    fromStoreId,
    toStoreId,
    productId,
    status,
    page = 1,
    limit = 20,
  } = filters

  const skip = (page - 1) * limit

  const where: {
    fromStoreId?: string
    toStoreId?: string
    productId?: string
    status?: TransferStatus
  } = {}

  if (fromStoreId) where.fromStoreId = fromStoreId
  if (toStoreId) where.toStoreId = toStoreId
  if (productId) where.productId = productId
  if (status) where.status = status

  const [transfers, total] = await Promise.all([
    prisma.inventoryTransfer.findMany({
      where,
      include: {
        fromStore: true,
        toStore: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.inventoryTransfer.count({ where }),
  ])

  return {
    transfers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

