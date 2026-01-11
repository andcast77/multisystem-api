import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateCategoryInput, UpdateCategoryInput, CategoryQueryInput } from '@/lib/validations/category'

export async function getCategories(query: CategoryQueryInput = { includeChildren: false }) {
  const { search, parentId, includeChildren } = query

  // Build where clause
  const where: {
    OR?: Array<{ [key: string]: { contains: string } }>
    parentId?: string | null
  } = {}

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }

  if (parentId !== undefined) {
    where.parentId = parentId
  }

  const categories = await prisma.category.findMany({
    where,
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
      children: includeChildren
        ? {
            select: {
              id: true,
              name: true,
              description: true,
              parentId: true,
            },
          }
        : false,
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return categories
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      children: {
        select: {
          id: true,
          name: true,
          description: true,
          parentId: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  })

  if (!category) {
    throw new ApiError(404, 'Category not found', ErrorCodes.NOT_FOUND)
  }

  return category
}

export async function getRootCategories() {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null,
    },
    include: {
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return categories
}

type CategoryTreeItem = Awaited<ReturnType<typeof getRootCategories>>[0] & {
  children: CategoryTreeItem[]
}

export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  const rootCategories = await getRootCategories()

  // Recursively fetch children for each root category
  const buildTree = async (categoryId: string): Promise<CategoryTreeItem[]> => {
    const children = await prisma.category.findMany({
      where: { parentId: categoryId },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return Promise.all(
      children.map(async (child) => ({
        ...child,
        children: await buildTree(child.id),
      }))
    )
  }

  const tree = await Promise.all(
    rootCategories.map(async (root) => ({
      ...root,
      children: await buildTree(root.id),
    }))
  )

  return tree
}

export async function createCategory(data: CreateCategoryInput) {
  // Check if category name already exists at the same level
  const existingCategory = await prisma.category.findFirst({
    where: {
      name: data.name,
      parentId: data.parentId ?? null,
    },
  })

  if (existingCategory) {
    throw new ApiError(
      409,
      'Category with this name already exists at this level',
      ErrorCodes.DUPLICATE_ENTRY
    )
  }

  // Validate parent exists (if provided)
  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
    })
    if (!parent) {
      throw new ApiError(404, 'Parent category not found', ErrorCodes.NOT_FOUND)
    }
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      parentId: data.parentId ?? null,
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  })

  return category
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  // Check if category exists
  const existingCategory = await getCategoryById(id)

  // Prevent circular reference (category cannot be its own parent)
  if (data.parentId === id) {
    throw new ApiError(
      400,
      'Category cannot be its own parent',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Check if updating parent would create a circular reference
  if (data.parentId) {
    const potentialParent = await prisma.category.findUnique({
      where: { id: data.parentId },
      include: {
        children: {
          select: { id: true },
        },
      },
    })

    if (!potentialParent) {
      throw new ApiError(404, 'Parent category not found', ErrorCodes.NOT_FOUND)
    }

    // Check if the category to update is an ancestor of the potential parent
    const isAncestor = await checkIfAncestor(id, data.parentId)
    if (isAncestor) {
      throw new ApiError(
        400,
        'Cannot set parent: would create circular reference',
        ErrorCodes.VALIDATION_ERROR
      )
    }
  }

  // Check if name already exists at the same level (if name is being updated)
  if (data.name && data.name !== existingCategory.name) {
    const siblingCategory = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId ?? existingCategory.parentId ?? null,
        NOT: { id },
      },
    })

    if (siblingCategory) {
      throw new ApiError(
        409,
        'Category with this name already exists at this level',
        ErrorCodes.DUPLICATE_ENTRY
      )
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.parentId !== undefined && { parentId: data.parentId ?? null }),
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  })

  return category
}

export async function deleteCategory(id: string) {
  // Check if category exists (will throw if not found)
  await getCategoryById(id)

  // Check if category has products
  const productsCount = await prisma.product.count({
    where: { categoryId: id },
  })

  if (productsCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete category that has products. Please reassign or delete products first.',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Check if category has children
  const childrenCount = await prisma.category.count({
    where: { parentId: id },
  })

  if (childrenCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete category that has subcategories. Please delete or reassign subcategories first.',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  await prisma.category.delete({
    where: { id },
  })

  return { success: true }
}

// Helper function to check if a category is an ancestor of another
async function checkIfAncestor(categoryId: string, descendantId: string): Promise<boolean> {
  const descendant = await prisma.category.findUnique({
    where: { id: descendantId },
    select: { parentId: true },
  })

  if (!descendant || !descendant.parentId) {
    return false
  }

  if (descendant.parentId === categoryId) {
    return true
  }

  return checkIfAncestor(categoryId, descendant.parentId)
}

