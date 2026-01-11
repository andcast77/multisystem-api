import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { ActionType, EntityType } from '@prisma/client'

export interface LogActionInput {
  userId: string
  action: ActionType
  entityType: EntityType
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface ActionHistoryQuery {
  userId?: string
  action?: ActionType
  entityType?: EntityType
  entityId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * Log a user action to the action history
 */
export async function logAction(input: LogActionInput): Promise<void> {
  await prisma.actionHistory.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      details: input.details ? JSON.stringify(input.details) : null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  })
}

/**
 * Get action history with filters
 */
export async function getActionHistory(query: ActionHistoryQuery = {}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query

  const skip = (page - 1) * limit

  const where: Prisma.ActionHistoryWhereInput = {}

  if (userId) {
    where.userId = userId
  }

  if (action) {
    where.action = action
  }

  if (entityType) {
    where.entityType = entityType
  }

  if (entityId) {
    where.entityId = entityId
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = startDate
    }
    if (endDate) {
      where.createdAt.lte = endDate
    }
  }

  const [actions, total] = await Promise.all([
    prisma.actionHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.actionHistory.count({ where }),
  ])

  return {
    actions: actions.map((action) => ({
      ...action,
      details: action.details ? JSON.parse(action.details) : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get action history for a specific user
 */
export async function getUserActionHistory(
  userId: string,
  query: Omit<ActionHistoryQuery, 'userId'> = {}
) {
  return getActionHistory({ ...query, userId })
}

/**
 * Get actions for a specific entity
 */
export async function getEntityActionHistory(
  entityType: EntityType,
  entityId: string,
  query: Omit<ActionHistoryQuery, 'entityType' | 'entityId'> = {}
) {
  return getActionHistory({ ...query, entityType, entityId })
}

