import { prisma } from '@/lib/prisma'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@prisma/client'

/**
 * Check for pending tasks and send reminders
 * Pending tasks include:
 * - Products with stock below minimum (already handled by low stock alerts)
 * - Pending sales that need attention
 * - Incomplete inventory adjustments
 * - Overdue customer follow-ups
 */
export async function checkPendingTasks(): Promise<number> {
  const notificationsSent = await Promise.all([
    checkPendingSales(),
    checkUnprocessedInventory(),
    checkOverdueTasks(),
  ])

  return notificationsSent.reduce((total, count) => total + count, 0)
}

/**
 * Check for pending sales that might need attention
 */
async function checkPendingSales(): Promise<number> {
  // Find sales that have been pending for more than 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  const pendingSales = await prisma.sale.findMany({
    where: {
      status: 'PENDING',
      createdAt: {
        lt: thirtyMinutesAgo,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (pendingSales.length === 0) {
    return 0
  }

  // Get supervisors and admins
  const supervisors = await prisma.user.findMany({
    where: {
      active: true,
      role: 'SUPERVISOR',
    },
    include: {
      notificationPreferences: true,
    },
  })

  let notificationsSent = 0

  for (const supervisor of supervisors) {
    const preferences = supervisor.notificationPreferences
    if (!preferences?.inAppPendingTasks) {
      continue
    }

    await sendNotification({
      userId: supervisor.id,
      type: NotificationType.PENDING_TASK,
      priority: NotificationPriority.MEDIUM,
      title: 'Ventas pendientes requieren atención',
      message: `${pendingSales.length} venta(s) han estado pendientes por más de 30 minutos`,
      data: {
        pendingSales: pendingSales.map(sale => ({
          id: sale.id,
          user: sale.user.name,
          total: sale.total,
          createdAt: sale.createdAt,
        })),
      },
      actionUrl: '/sales?status=pending',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // Expires in 4 hours
    })

    notificationsSent++
  }

  return notificationsSent
}

/**
 * Check for unprocessed inventory adjustments
 */
async function checkUnprocessedInventory(): Promise<number> {
  // For now, we'll check for products that have been inactive for a while
  // In a full implementation, this would check for pending inventory adjustments
  const inactiveProducts = await prisma.product.count({
    where: {
      active: false,
      updatedAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Updated more than a week ago
      },
    },
  })

  if (inactiveProducts === 0) {
    return 0
  }

  // Get admins
  const admins = await prisma.user.findMany({
    where: {
      active: true,
      role: 'ADMIN',
    },
    include: {
      notificationPreferences: true,
    },
  })

  let notificationsSent = 0

  for (const admin of admins) {
    const preferences = admin.notificationPreferences
    if (!preferences?.inAppPendingTasks) {
      continue
    }

    await sendNotification({
      userId: admin.id,
      type: NotificationType.PENDING_TASK,
      priority: NotificationPriority.LOW,
      title: 'Productos inactivos requieren revisión',
      message: `${inactiveProducts} producto(s) han estado inactivos por más de una semana`,
      data: {
        inactiveProductsCount: inactiveProducts,
      },
      actionUrl: '/products?status=inactive',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    })

    notificationsSent++
  }

  return notificationsSent
}

/**
 * Check for overdue tasks (placeholder for future features)
 */
async function checkOverdueTasks(): Promise<number> {
  // This is a placeholder for future features like:
  // - Customer follow-ups
  // - Scheduled maintenance
  // - Pending supplier orders
  // - Expiring product warranties

  // For now, return 0
  return 0
}

/**
 * Send reminder for a specific pending task
 */
export async function sendPendingTaskReminder(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      notificationPreferences: true,
    },
  })

  if (!user?.notificationPreferences?.inAppPendingTasks) {
    return
  }

  await sendNotification({
    userId,
    type: NotificationType.PENDING_TASK,
    priority: NotificationPriority.MEDIUM,
    title,
    message,
    data,
    actionUrl,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
  })
}
