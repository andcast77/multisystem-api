import { prisma } from '@/lib/prisma'
import { authenticate, generateToken } from '@/lib/auth'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { LoginInput } from '@/lib/validations/auth'

export async function login(credentials: LoginInput) {
  // Validate input using authenticate function
  const user = await authenticate(credentials)
  if (!user) {
    throw new ApiError(401, 'Invalid credentials', ErrorCodes.UNAUTHORIZED)
  }

  // Get full user for token generation
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  if (!fullUser) {
    throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
  }

  // Generate token
  const token = generateToken(fullUser)

  return {
    user: {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
    },
    token,
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
  }

  return user
}

