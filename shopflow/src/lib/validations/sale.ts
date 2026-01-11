import { z } from 'zod'
import { PaymentMethod, SaleStatus } from '@prisma/client'

// Schema for a sale item
export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0'),
  price: z.number().positive('Price must be greater than 0'),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
})

export type SaleItemInput = z.infer<typeof saleItemSchema>

// Schema for creating a sale
export const createSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidAmount: z.number().nonnegative('Paid amount cannot be negative'),
  discount: z.number().nonnegative('Discount cannot be negative').default(0),
  taxRate: z.number().min(0).max(1).optional(), // Optional, stored as decimal (e.g., 0.1 = 10%), will use store config if not provided
  notes: z.string().optional().nullable(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>

// Schema for sale query/filters
export const saleQuerySchema = z.object({
  customerId: z.string().optional(),
  userId: z.string().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type SaleQueryInput = z.infer<typeof saleQuerySchema>

