import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '@/lib/validations/customer'

export async function getCustomers(query: CustomerQueryInput = {}) {
  const { search, email, phone } = query

  // Build where clause
  const where: {
    OR?: Array<{ [key: string]: { contains: string } }>
    email?: string
    phone?: string
  } = {}

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ]
  }

  if (email) {
    where.email = email
  }

  if (phone) {
    where.phone = phone
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      _count: {
        select: {
          sales: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return customers
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10, // Last 10 sales
      },
      _count: {
        select: {
          sales: true,
        },
      },
    },
  })

  if (!customer) {
    throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
  }

  return customer
}

export async function searchCustomers(searchTerm: string, limit = 10) {
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    take: limit,
    orderBy: {
      name: 'asc',
    },
  })

  return customers
}

export async function createCustomer(data: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
    },
    include: {
      _count: {
        select: {
          sales: true,
        },
      },
    },
  })

  return customer
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  // Check if customer exists (will throw if not found)
  await getCustomerById(id)

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email ?? null }),
      ...(data.phone !== undefined && { phone: data.phone ?? null }),
      ...(data.address !== undefined && { address: data.address ?? null }),
      ...(data.city !== undefined && { city: data.city ?? null }),
      ...(data.state !== undefined && { state: data.state ?? null }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode ?? null }),
      ...(data.country !== undefined && { country: data.country ?? null }),
    },
    include: {
      _count: {
        select: {
          sales: true,
        },
      },
    },
  })

  return customer
}

export async function deleteCustomer(id: string) {
  // Check if customer exists (will throw if not found)
  await getCustomerById(id)

  // Check if customer has sales
  const salesCount = await prisma.sale.count({
    where: { customerId: id },
  })

  if (salesCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete customer that has sales. Sales are preserved for historical records.',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  await prisma.customer.delete({
    where: { id },
  })

  return { success: true }
}

