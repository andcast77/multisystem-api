import { prisma } from '@/lib/prisma'
import type { NotificationType, NotificationPriority } from '@prisma/client'
import webpush from 'web-push'

// Initialize web-push with VAPID keys from environment
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@shopflow.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushNotificationPayload {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  actionUrl?: string
  data?: Record<string, unknown>
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Send push notification to a user's subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionInput,
  payload: PushNotificationPayload
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured. Push notifications are disabled.')
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    message: payload.message,
    type: payload.type,
    priority: payload.priority || 'MEDIUM',
    actionUrl: payload.actionUrl,
    data: payload.data,
    timestamp: new Date().toISOString(),
  })

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      notificationPayload
    )
  } catch (error) {
    // If subscription is invalid, remove it from database
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or not found
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        })
        throw new Error('Subscription expired')
      }
    }
    throw error
  }
}

/**
 * Send push notification to all user's subscriptions
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<number> {
  // Check if user has push notifications enabled
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (!preferences || !preferences.pushEnabled) {
    return 0
  }

  // Check if this notification type is enabled
  const typeEnabled = {
    LOW_STOCK_ALERT: preferences.pushLowStock,
    IMPORTANT_SALE: preferences.pushImportantSales,
    PENDING_TASK: preferences.pushPendingTasks,
    SECURITY_ALERT: preferences.pushSecurityAlerts,
    SYSTEM_MAINTENANCE: preferences.pushSecurityAlerts,
    CUSTOM: preferences.pushEnabled,
  }[payload.type]

  if (!typeEnabled) {
    return 0
  }

  // Get all active subscriptions for user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    return 0
  }

  let sentCount = 0
  const errors: Error[] = []

  // Send to all subscriptions
  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload
      )
      sentCount++
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  // Log errors in development
  if (errors.length > 0 && process.env.NODE_ENV === 'development') {
    console.error('Failed to send some push notifications:', errors)
  }

  return sentCount
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<number> {
  let totalSent = 0

  for (const userId of userIds) {
    try {
      const sent = await sendPushNotificationToUser(userId, payload)
      totalSent += sent
    } catch (error) {
      // Continue with other users even if one fails
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to send push to user ${userId}:`, error)
      }
    }
  }

  return totalSent
}

