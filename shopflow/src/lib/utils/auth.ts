import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth-token'
import { getUserById } from '@/lib/auth'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { UserWithRole } from '@/types'

/**
 * Authenticates a user from a Next.js request
 * Extracts token from cookies and verifies it
 * Returns the authenticated user
 */
export async function authenticateRequest(request: NextRequest): Promise<UserWithRole> {
  const token = request.cookies.get('token')?.value

  if (!token) {
    throw new ApiError(401, 'Unauthorized', ErrorCodes.UNAUTHORIZED)
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    throw new ApiError(401, 'Invalid token', ErrorCodes.UNAUTHORIZED)
  }

  const user = await getUserById(decoded.id)
  if (!user) {
    throw new ApiError(401, 'User not found', ErrorCodes.UNAUTHORIZED)
  }

  if (!user.active) {
    throw new ApiError(401, 'User account is inactive', ErrorCodes.UNAUTHORIZED)
  }

  return user
}

