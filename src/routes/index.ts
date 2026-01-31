import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { usersRoutes } from './users.js'
import { authRoutes } from './auth.js'
import { shopflowCustomersRoutes } from './shopflow/customers.js'
import { shopflowCategoriesRoutes } from './shopflow/categories.js'
import { shopflowSuppliersRoutes } from './shopflow/suppliers.js'
import { shopflowStoreConfigRoutes } from './shopflow/store-config.js'
import { shopflowSalesRoutes } from './shopflow/sales.js'
import { shopflowTicketConfigRoutes } from './shopflow/ticket-config.js'
import { shopflowUserPreferencesRoutes } from './shopflow/user-preferences.js'
import { shopflowLoyaltyRoutes } from './shopflow/loyalty.js'
import { shopflowReportsRoutes } from './shopflow/reports.js'
import { shopflowActionHistoryRoutes } from './shopflow/action-history.js'
import { shopflowNotificationsRoutes } from './shopflow/notifications.js'
import { shopflowProductsRoutes } from './shopflow/products.js'
import { shopflowStoresRoutes } from './shopflow/stores.js'
import { shopflowExportRoutes } from './shopflow/export.js'
import { shopflowInventoryTransfersRoutes } from './shopflow/inventory-transfers.js'
import { shopflowPushSubscriptionsRoutes } from './shopflow/push-subscriptions.js'

export async function registerRoutes(fastify: FastifyInstance) {
  // Ruta raíz - información de la API
  fastify.get('/', async () => {
    return {
      name: 'Multisystem API',
      version: '0.1.0',
      status: 'running',
      endpoints: {
        health: '/health',
        users: {
          list: 'GET /api/users',
          getById: 'GET /api/users/:id',
        },
        shopflow: {
          customers: {
            list: 'GET /api/shopflow/customers',
            getById: 'GET /api/shopflow/customers/:id',
            create: 'POST /api/shopflow/customers',
            update: 'PUT /api/shopflow/customers/:id',
            delete: 'DELETE /api/shopflow/customers/:id',
          },
          categories: {
            list: 'GET /api/shopflow/categories',
            getById: 'GET /api/shopflow/categories/:id',
            create: 'POST /api/shopflow/categories',
            update: 'PUT /api/shopflow/categories/:id',
            delete: 'DELETE /api/shopflow/categories/:id',
          },
          suppliers: {
            list: 'GET /api/shopflow/suppliers',
            getById: 'GET /api/shopflow/suppliers/:id',
            create: 'POST /api/shopflow/suppliers',
            update: 'PUT /api/shopflow/suppliers/:id',
            delete: 'DELETE /api/shopflow/suppliers/:id',
          },
          'store-config': {
            get: 'GET /api/shopflow/store-config',
            update: 'PUT /api/shopflow/store-config',
            nextInvoiceNumber: 'POST /api/shopflow/store-config/next-invoice-number',
          },
          sales: {
            list: 'GET /api/shopflow/sales',
            getById: 'GET /api/shopflow/sales/:id',
            create: 'POST /api/shopflow/sales',
            cancel: 'POST /api/shopflow/sales/:id/cancel',
            refund: 'POST /api/shopflow/sales/:id/refund',
          },
        },
      },
    }
  })

  await fastify.register(healthRoutes)
  await fastify.register(usersRoutes)
  await fastify.register(authRoutes)
  await fastify.register(shopflowCustomersRoutes)
  await fastify.register(shopflowCategoriesRoutes)
  await fastify.register(shopflowSuppliersRoutes)
  await fastify.register(shopflowStoreConfigRoutes)
  await fastify.register(shopflowSalesRoutes)
  await fastify.register(shopflowTicketConfigRoutes)
  await fastify.register(shopflowUserPreferencesRoutes)
  await fastify.register(shopflowLoyaltyRoutes)
  await fastify.register(shopflowReportsRoutes)
  await fastify.register(shopflowActionHistoryRoutes)
  await fastify.register(shopflowNotificationsRoutes)
  await fastify.register(shopflowProductsRoutes)
  await fastify.register(shopflowStoresRoutes)
  await fastify.register(shopflowExportRoutes)
  await fastify.register(shopflowInventoryTransfersRoutes)
  await fastify.register(shopflowPushSubscriptionsRoutes)
}
