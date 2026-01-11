import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import type { CreateUserInput, UpdateUserInput, UserQueryInput } from '@/lib/validations/user'

export async function getUsers(query: UserQueryInput = { page: 1, limit: 20 }) {
  const { search, role, active, page = 1, limit = 20 } = query

  const skip = (page - 1) * limit

  const where: {
    email?: { contains: string }
    role?: UserRole
    active?: boolean
  } = {}

  if (search) {
    where.email = { contains: search }
  }

  if (role) {
    where.role = role
  }

  if (active !== undefined) {
    where.active = active
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
  }

  return user
}

export async function createUser(data: CreateUserInput) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists', ErrorCodes.VALIDATION_ERROR)
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password)

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
      active: data.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

export async function updateUser(id: string, data: UpdateUserInput) {
  // Check if user exists
  await getUserById(id)

  // If email is being updated, check if it's already taken
  if (data.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser && existingUser.id !== id) {
      throw new ApiError(400, 'User with this email already exists', ErrorCodes.VALIDATION_ERROR)
    }
  }

  // Prepare update data
  const updateData: {
    email?: string
    password?: string
    name?: string
    role?: UserRole
    active?: boolean
  } = {}

  if (data.email) updateData.email = data.email
  if (data.name) updateData.name = data.name
  if (data.role) updateData.role = data.role
  if (data.active !== undefined) updateData.active = data.active

  // Hash password if provided
  if (data.password) {
    updateData.password = await hashPassword(data.password)
  }

  // Update user
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

export async function deleteUser(id: string) {
  // Check if user exists
  await getUserById(id)

  // Check if user has sales
  const salesCount = await prisma.sale.count({
    where: { userId: id },
  })

  if (salesCount > 0) {
    throw new ApiError(
      400,
      'Cannot delete user with existing sales. Deactivate the user instead.',
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Delete user
  await prisma.user.delete({
    where: { id },
  })

  return { success: true }
}
