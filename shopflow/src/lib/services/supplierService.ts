import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateSupplierInput, UpdateSupplierInput, SupplierQueryInput } from '@/lib/validations/supplier'

export async function getSuppliers(query: SupplierQueryInput = {}) {
  const { search, active } = query

  // Build where clause
  const where: {
    OR?: Array<{ [key: string]: { contains: string } }>
    active?: boolean
  } = {}

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { taxId: { contains: search } },
    ]
  }

  if (active !== undefined) {
    where.active = active
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return suppliers
}

export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
  })

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found', ErrorCodes.NOT_FOUND)
  }

  return supplier
}

export async function createSupplier(data: CreateSupplierInput) {
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
      taxId: data.taxId ?? null,
      notes: data.notes ?? null,
      active: data.active ?? true,
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  })

  return supplier
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  // Check if supplier exists (will throw if not found)
  await getSupplierById(id)

  const supplier = await prisma.supplier.update({
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
      ...(data.taxId !== undefined && { taxId: data.taxId ?? null }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  })

  return supplier
}

export async function deleteSupplier(id: string) {
  // Check if supplier exists (will throw if not found)
  await getSupplierById(id)

  // Check if supplier has products
  const productsCount = await prisma.product.count({
    where: { supplierId: id },
  })

  if (productsCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete supplier that has products. Please reassign or delete products first.',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  await prisma.supplier.delete({
    where: { id },
  })

  return { success: true }
}

