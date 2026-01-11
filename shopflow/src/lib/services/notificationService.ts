import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  Notification,
  NotificationPreference
} from '@prisma/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { sendPushNotificationToUser } from './pushNotificationService'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  data?: Record<string, unknown>
  actionUrl?: string
  expiresAt?: Date
}

export interface NotificationQuery {
  userId?: string
  type?: NotificationType
  status?: NotificationStatus
  priority?: NotificationPriority
  page?: number
  limit?: number
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      priority: input.priority || 'MEDIUM',
      title: input.title,
      message: input.message,
      data: input.data ? JSON.stringify(input.data) : null,
      actionUrl: input.actionUrl || null,
      expiresAt: input.expiresAt || null,
    },
  })

  return notification
}

/**
 * Send notification based on user preferences
 * Also sends push notifications if enabled
 */
export async function sendNotification(input: CreateNotificationInput): Promise<Notification | null> {
  // Check user preferences
  const preferences = await getUserNotificationPreferences(input.userId)

  // Check if in-app notifications are enabled for this type
  const shouldSendInApp = checkNotificationPreference(preferences, input.type, 'inApp')

  if (!shouldSendInApp) {
    return null
  }

  // Create in-app notification
  const notification = await createNotification(input)

  // Send push notification if enabled (don't await to avoid blocking)
  if (preferences.pushEnabled && checkNotificationPreference(preferences, input.type, 'push')) {
    sendPushNotificationToUser(input.userId, {
      title: input.title,
      message: input.message,
      type: input.type,
      priority: input.priority,
      actionUrl: input.actionUrl,
      data: input.data,
    }).catch((error) => {
      // Log error but don't fail the main notification
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send push notification:', error)
      }
    })
  }

  return notification
}

/**
 * Get notifications with filters
 */
export async function getNotifications(query: NotificationQuery = {}) {
  const {
    userId,
    type,
    status,
    priority,
    page = 1,
    limit = 20,
  } = query

  const skip = (page - 1) * limit

  const where: Prisma.NotificationWhereInput = {}

  if (userId) {
    where.userId = userId
  }

  if (type) {
    where.type = type
  }

  if (status) {
    where.status = status
  }

  if (priority) {
    where.priority = priority
  }

  // Don't show expired notifications
  where.OR = [
    { expiresAt: null },
    { expiresAt: { gt: new Date() } }
  ]

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ])

  return {
    notifications: notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
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
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  query: Omit<NotificationQuery, 'userId'> = {}
) {
  return getNotifications({ ...query, userId })
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    throw new ApiError(404, 'Notification not found', ErrorCodes.NOT_FOUND)
  }

  if (notification.userId !== userId) {
    throw new ApiError(403, 'Access denied', ErrorCodes.FORBIDDEN)
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  })
}

/**
 * Archive notification
 */
export async function archiveNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    throw new ApiError(404, 'Notification not found', ErrorCodes.NOT_FOUND)
  }

  if (notification.userId !== userId) {
    throw new ApiError(403, 'Access denied', ErrorCodes.FORBIDDEN)
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'ARCHIVED',
      archivedAt: new Date(),
    },
  })
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreference> {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  // Create default preferences if none exist
  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: { userId },
    })
  }

  return preferences
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...updates,
    },
  })
}

/**
 * Check if notification should be sent based on preferences
 */
function checkNotificationPreference(
  preferences: NotificationPreference,
  type: NotificationType,
  channel: 'email' | 'inApp' | 'push'
): boolean {
  // Check if channel is enabled
  const channelEnabled = preferences[`${channel}Enabled` as keyof NotificationPreference] as boolean
  if (!channelEnabled) {
    return false
  }

  // Check specific type preference
  const typeKey = getNotificationTypeKey(type)
  const typeEnabled = preferences[`${channel}${typeKey}` as keyof NotificationPreference] as boolean

  return typeEnabled
}

/**
 * Convert notification type to preference key
 */
function getNotificationTypeKey(type: NotificationType): string {
  const typeMap: Record<NotificationType, string> = {
    LOW_STOCK_ALERT: 'LowStock',
    IMPORTANT_SALE: 'ImportantSales',
    PENDING_TASK: 'PendingTasks',
    SYSTEM_MAINTENANCE: 'SecurityAlerts', // Using security alerts for system maintenance
    SECURITY_ALERT: 'SecurityAlerts',
    CUSTOM: 'SecurityAlerts', // Using security alerts for custom notifications
  }

  return typeMap[type]
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return result.count
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      status: 'UNREAD',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ],
    },
  })
}

// Re-export check functions for convenience
export { checkLowStockAlerts } from './lowStockAlertService'
export { checkImportantSaleAlerts } from './importantSaleAlertService'
export { checkPendingTasks } from './pendingTaskService'
