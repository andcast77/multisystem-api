import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateSaleInput, SaleQueryInput } from '@/lib/validations/sale'
import { getStoreConfig, getNextInvoiceNumber } from './storeConfigService'
import { getProductById } from './productService'
import { awardPointsForPurchase } from './loyaltyService'
import { SaleStatus, PaymentMethod } from '@prisma/client'

export async function getSales(query: SaleQueryInput = { page: 1, limit: 20 }) {
  const {
    customerId,
    userId,
    status,
    paymentMethod,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query

  const skip = (page - 1) * limit

  // Build where clause
  const where: {
    customerId?: string
    userId?: string
    status?: SaleStatus
    paymentMethod?: PaymentMethod
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (customerId) {
    where.customerId = customerId
  }

  if (userId) {
    where.userId = userId
  }

  if (status) {
    where.status = status
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate)
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.sale.count({ where }),
  ])

  return {
    sales,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              price: true,
            },
          },
        },
      },
    },
  })

  if (!sale) {
    throw new ApiError(404, 'Sale not found', ErrorCodes.NOT_FOUND)
  }

  return sale
}

export async function createSale(userId: string, data: CreateSaleInput) {
  // Validate all products exist and have enough stock
  const productChecks = await Promise.all(
    data.items.map(async (item) => {
      const product = await getProductById(item.productId)
      if (!product.active) {
        throw new ApiError(400, `Product ${product.name} is not active`, ErrorCodes.VALIDATION_ERROR)
      }
      if (product.stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          ErrorCodes.VALIDATION_ERROR
        )
      }
      return { product, item }
    })
  )

  // Validate customer exists (if provided)
  if (data.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    })
    if (!customer) {
      throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
    }
  }

  // Get store config for tax rate and invoice number
  const storeConfig = await getStoreConfig()
  const taxRate = data.taxRate ?? storeConfig.taxRate

  // Calculate totals
  let subtotal = 0
  const saleItems = productChecks.map(({ product, item }) => {
    const itemSubtotal = (item.price * item.quantity) - (item.discount || 0)
    subtotal += itemSubtotal
    return {
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      subtotal: itemSubtotal,
      product,
    }
  })

  // Apply global discount
  const discount = data.discount || 0
  const subtotalAfterDiscount = subtotal - discount

  // Calculate tax (taxRate is stored as decimal, e.g., 0.1 = 10%)
  const tax = subtotalAfterDiscount * taxRate

  // Calculate total
  const total = subtotalAfterDiscount + tax

  // Validate payment
  if (data.paidAmount < total) {
    throw new ApiError(
      400,
      `Paid amount (${data.paidAmount}) is less than total (${total})`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Calculate change (only for cash payments)
  const change = data.paymentMethod === PaymentMethod.CASH ? data.paidAmount - total : 0

  // Generate invoice number
  const invoiceNumber = await getNextInvoiceNumber()

  // Create sale in transaction
  const sale = await prisma.$transaction(async (tx) => {
    // Create sale
    const newSale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerId: data.customerId ?? null,
        userId,
        status: SaleStatus.COMPLETED,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: data.paymentMethod,
        paidAmount: data.paidAmount,
        change,
        notes: data.notes ?? null,
        items: {
          create: saleItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    // Update product stock
    await Promise.all(
      productChecks.map(({ product, item }) =>
        tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      )
    )

    return newSale
  })

  // Award loyalty points if customer exists and sale was successful
  if (sale.customerId) {
    try {
      await awardPointsForPurchase(sale.customerId, sale.total, sale.id)
    } catch (error) {
      // Log error but don't fail the sale if points awarding fails
      console.error('Failed to award loyalty points:', error)
    }
  }

  return sale
}

export async function cancelSale(id: string) {
  const sale = await getSaleById(id)

  if (sale.status === SaleStatus.CANCELLED) {
    throw new ApiError(400, 'Sale is already cancelled', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status === SaleStatus.REFUNDED) {
    throw new ApiError(400, 'Cannot cancel a refunded sale', ErrorCodes.VALIDATION_ERROR)
  }

  // Cancel sale and restore stock in transaction
  const cancelledSale = await prisma.$transaction(async (tx) => {
    // Update sale status
    const updatedSale = await tx.sale.update({
      where: { id },
      data: {
        status: SaleStatus.CANCELLED,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    // Restore product stock
    await Promise.all(
      sale.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      )
    )

    return updatedSale
  })

  return cancelledSale
}

export async function refundSale(id: string) {
  const sale = await getSaleById(id)

  if (sale.status === SaleStatus.REFUNDED) {
    throw new ApiError(400, 'Sale is already refunded', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status === SaleStatus.CANCELLED) {
    throw new ApiError(400, 'Cannot refund a cancelled sale', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status !== SaleStatus.COMPLETED) {
    throw new ApiError(
      400,
      `Cannot refund a sale with status ${sale.status}. Only completed sales can be refunded.`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Refund sale and restore stock in transaction
  const refundedSale = await prisma.$transaction(async (tx) => {
    // Update sale status
    const updatedSale = await tx.sale.update({
      where: { id },
      data: {
        status: SaleStatus.REFUNDED,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    // Restore product stock
    await Promise.all(
      sale.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })
      )
    )

    return updatedSale
  })

  return refundedSale
}

