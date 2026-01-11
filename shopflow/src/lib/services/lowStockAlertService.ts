import { prisma } from '@/lib/prisma'
import { sendNotification } from './notificationService'
import { NotificationType, NotificationPriority } from '@prisma/client'

/**
 * Check for low stock products and send alerts
 */
export async function checkLowStockAlerts(): Promise<number> {
  // Get all products with stock below minimum threshold
  const lowStockProducts = await prisma.product.findMany({
    where: {
      active: true,
      stock: {
        lte: prisma.product.fields.minStock,
      },
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  })

  if (lowStockProducts.length === 0) {
    return 0
  }

  // Get all users who should receive notifications
  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: {
        in: ['ADMIN', 'SUPERVISOR'], // Only admins and supervisors get low stock alerts
      },
    },
    include: {
      notificationPreferences: true,
    },
  })

  let notificationsSent = 0

  for (const user of users) {
    // Check if user wants low stock notifications
    const preferences = user.notificationPreferences
    if (!preferences?.inAppLowStock) {
      continue
    }

    // Create notification for this user
    const productList = lowStockProducts
      .map(p => `${p.name} (${p.stock}/${p.minStock})`)
      .join(', ')

    await sendNotification({
      userId: user.id,
      type: NotificationType.LOW_STOCK_ALERT,
      priority: NotificationPriority.HIGH,
      title: 'Productos con stock bajo',
      message: `${lowStockProducts.length} producto(s) tienen stock por debajo del mínimo: ${productList}`,
      data: {
        products: lowStockProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          minStock: p.minStock,
          category: p.category?.name,
        })),
      },
      actionUrl: '/products?filter=low-stock',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    })

    notificationsSent++
  }

  return notificationsSent
}

/**
 * Send alert for a specific product that went low on stock
 */
export async function sendLowStockAlertForProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!product || product.stock > product.minStock) {
    return // Product is not low on stock
  }

  // Get all users who should receive notifications
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
    if (!preferences?.inAppLowStock) {
      continue
    }

    await sendNotification({
      userId: user.id,
      type: NotificationType.LOW_STOCK_ALERT,
      priority: NotificationPriority.MEDIUM,
      title: 'Producto con stock bajo',
      message: `El producto "${product.name}" (SKU: ${product.sku}) tiene stock bajo: ${product.stock}/${product.minStock}`,
      data: {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          minStock: product.minStock,
          category: product.category?.name,
        },
      },
      actionUrl: `/products/${product.id}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    })
  }
}
