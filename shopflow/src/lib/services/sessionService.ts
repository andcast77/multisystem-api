import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { logUserAction, extractRequestMetadata } from '@/lib/utils/actionLogger'
import { ActionType, EntityType } from '@prisma/client'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Check if a user is allowed to have concurrent sessions based on their role
 */
export function canHaveConcurrentSessions(userRole: UserRole): boolean {
  // Only ADMIN users can have concurrent sessions by default
  return userRole === UserRole.ADMIN
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string, sessionToken: string, request?: Request): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, allowConcurrentSessions: true, currentSessionToken: true }
  })

  if (!user) {
    throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
  }

  const { ipAddress, userAgent } = request ? extractRequestMetadata(request) : {}

  // Check concurrent session policy
  const canHaveConcurrent = user.allowConcurrentSessions || canHaveConcurrentSessions(user.role)

  if (!canHaveConcurrent && user.currentSessionToken) {
    // Block new session if concurrent sessions are not allowed and there's an active session
    throw new ApiError(
      409,
      'Concurrent session not allowed. Please logout from other devices first.',
      ErrorCodes.CONFLICT
    )
  }

  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  // Create new session record
  await prisma.userSession.create({
    data: {
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    }
  })

  // Update user's current session token (for backward compatibility)
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentSessionToken: sessionToken,
      sessionExpiresAt: expiresAt,
    }
  })

  // Log session creation
  await logUserAction(userId, ActionType.LOGIN, EntityType.USER, {
    details: { sessionToken: sessionToken.substring(0, 8) + '...' },
    ipAddress,
    userAgent,
  })
}

/**
 * Validate a session token
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
  const session = await prisma.userSession.findUnique({
    where: { sessionToken },
    select: { expiresAt: true, isActive: true }
  })

  if (!session || !session.isActive) {
    return false
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    // Mark session as inactive
    await prisma.userSession.update({
      where: { sessionToken },
      data: { isActive: false }
    })
    return false
  }

  return true
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: string) {
  return prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      sessionToken: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

/**
 * Terminate a specific session
 */
export async function terminateSession(sessionToken: string, userId: string): Promise<void> {
  const session = await prisma.userSession.findUnique({
    where: { sessionToken },
    include: { user: true }
  })

  if (!session) {
    throw new ApiError(404, 'Session not found', ErrorCodes.NOT_FOUND)
  }

  if (session.userId !== userId) {
    throw new ApiError(403, 'Access denied', ErrorCodes.FORBIDDEN)
  }

  await prisma.userSession.update({
    where: { sessionToken },
    data: { isActive: false }
  })

  // If this was the current session, clear it from user
  if (session.user.currentSessionToken === sessionToken) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentSessionToken: null,
        sessionExpiresAt: null,
      }
    })
  }

  // Log logout action
  await logUserAction(userId, ActionType.LOGOUT, EntityType.USER, {
    details: { sessionToken: sessionToken.substring(0, 8) + '...' },
  })
}

/**
 * Terminate all sessions for a user except the current one
 */
export async function terminateOtherSessions(userId: string, currentSessionToken: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentSessionToken: true }
  })

  if (!user) {
    throw new ApiError(404, 'User not found', ErrorCodes.NOT_FOUND)
  }

  // Terminate all sessions except current one
  await prisma.userSession.updateMany({
    where: {
      userId,
      sessionToken: { not: currentSessionToken },
      isActive: true,
    },
    data: { isActive: false }
  })

  // Log action
  await logUserAction(userId, ActionType.UPDATE, EntityType.USER, {
    details: { action: 'terminate_other_sessions' },
  })
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: {
      isActive: true,
      expiresAt: {
        lt: new Date()
      }
    },
    data: { isActive: false }
  })

  // Also clean up user currentSessionToken if expired
  await prisma.user.updateMany({
    where: {
      currentSessionToken: { not: null },
      sessionExpiresAt: { lt: new Date() }
    },
    data: {
      currentSessionToken: null,
      sessionExpiresAt: null,
    }
  })

  return result.count
}

/**
 * Update user's concurrent session policy
 */
export async function updateConcurrentSessionPolicy(userId: string, allowConcurrent: boolean): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { allowConcurrentSessions: allowConcurrent }
  })

  await logUserAction(userId, ActionType.CONFIGURE, EntityType.USER, {
    details: { allowConcurrentSessions: allowConcurrent },
  })
}
