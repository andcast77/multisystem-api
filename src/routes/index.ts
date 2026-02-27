import { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.js'
import { usersRoutes } from './users.js'
import { authRoutes } from './auth.js'
import { companyMembersRoutes } from './company-members.js'
import { companiesRoutes } from './companies.js'
import { attendanceRoutes } from './services/attendance.js'
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
import { workifyRoutes } from './workify/index.js'
import { techServicesRoutes } from './techservices/index.js'
import { setupSwagger } from '../swagger.js'

export async function registerRoutes(fastify: FastifyInstance) {
  await setupSwagger(fastify)


  await fastify.register(healthRoutes)
  await fastify.register(usersRoutes)
  await fastify.register(authRoutes)
  await fastify.register(companyMembersRoutes)
  await fastify.register(companiesRoutes)
  await fastify.register(attendanceRoutes)
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
  await fastify.register(workifyRoutes)
  await fastify.register(techServicesRoutes)
}
