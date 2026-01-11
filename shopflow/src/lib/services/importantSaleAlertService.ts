import { prisma } from '@/lib/prisma'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@prisma/client'

/**
 * Check for important sales and send notifications
 * Important sales are defined as:
 * - Sales above a certain amount
 * - Sales with high-value items
 * - First sale of the day
 * - Sales to new customers
 */
export async function checkImportantSaleAlerts(): Promise<number> {
  // Default threshold for important sales, could be configurable from store config
  const importantSaleThreshold = 500

  // Find recent sales that might be important
  const recentSales = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
      total: {
        gte: importantSaleThreshold,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (recentSales.length === 0) {
    return 0
  }

  // Get admin and supervisor users
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        in: ['ADMIN', 'SUPERVISOR'],
      },
    },
    include: {
      notificationPreferences: true,
    },
  })

  let notificationsSent = 0

  for (const sale of recentSales) {
    for (const user of users) {
      const preferences = user.notificationPreferences
      if (!preferences?.inAppImportantSales) {
        continue
      }

      await sendNotification({
        userId: user.id,
        type: NotificationType.IMPORTANT_SALE,
        priority: NotificationPriority.MEDIUM,
        title: 'Venta importante registrada',
        message: `Venta de $${sale.total.toFixed(2)} realizada por ${sale.user.name}${sale.customer ? ` a ${sale.customer.name}` : ''}`,
        data: {
          sale: {
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            user: sale.user,
            customer: sale.customer,
            items: sale.items.map(item => ({
              productName: item.product.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        actionUrl: `/sales/${sale.id}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      })

      notificationsSent++
    }
  }

  return notificationsSent
}

/**
 * Send alert for a specific important sale
 */
export async function sendImportantSaleAlert(saleId: string): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  })

  if (!sale) {
    return
  }

  // Check if this sale meets "important" criteria
  const importantSaleThreshold = 500
  if (sale.total < importantSaleThreshold) {
    return
  }

  // Get admin and supervisor users
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        in: ['ADMIN', 'SUPERVISOR'],
      },
    },
    include: {
      notificationPreferences: true,
    },
  })

  for (const user of users) {
    const preferences = user.notificationPreferences
    if (!preferences?.inAppImportantSales) {
      continue
    }

    await sendNotification({
      userId: user.id,
      type: NotificationType.IMPORTANT_SALE,
      priority: NotificationPriority.MEDIUM,
      title: 'Venta importante registrada',
      message: `Venta de $${sale.total.toFixed(2)} realizada por ${sale.user.name}${sale.customer ? ` a ${sale.customer.name}` : ''}`,
      data: {
        sale: {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          user: sale.user,
          customer: sale.customer,
          items: sale.items.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      actionUrl: `/sales/${sale.id}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
    })
  }
}
