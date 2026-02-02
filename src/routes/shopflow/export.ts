import { FastifyInstance } from 'fastify'
import { sqlUnsafe } from '../../db/neon.js'
import { getShopflowContext } from './auth-helper.js'

const ALLOWED_TABLES = [
  'users',
  'customers',
  'products',
  'categories',
  'suppliers',
  'sales',
  'saleItems',
  'stores',
  'storeConfig',
  'ticketConfig',
  'userPreferences',
  'actionHistory',
  'notifications',
  'notificationPreferences',
  'loyaltyConfig',
  'loyaltyPoints',
  'inventoryTransfers',
  'pushSubscriptions',
] as const

type TableKey = (typeof ALLOWED_TABLES)[number]

/** DB table name and filter for company-scoped export */
const TABLE_EXPORT: Record<
  TableKey,
  { dbTable: string; filter: 'companyId' | 'companyMembers' | 'saleItems' }
> = {
  users: { dbTable: 'users', filter: 'companyMembers' },
  customers: { dbTable: 'customers', filter: 'companyId' },
  products: { dbTable: 'products', filter: 'companyId' },
  categories: { dbTable: 'categories', filter: 'companyId' },
  suppliers: { dbTable: 'suppliers', filter: 'companyId' },
  sales: { dbTable: 'sales', filter: 'companyId' },
  saleItems: { dbTable: 'sale_items', filter: 'saleItems' },
  stores: { dbTable: 'stores', filter: 'companyId' },
  storeConfig: { dbTable: 'store_configs', filter: 'companyId' },
  ticketConfig: { dbTable: 'ticket_configs', filter: 'companyId' },
  userPreferences: { dbTable: 'user_preferences', filter: 'companyId' },
  actionHistory: { dbTable: 'action_history', filter: 'companyId' },
  notifications: { dbTable: 'notifications', filter: 'companyId' },
  notificationPreferences: { dbTable: 'notification_preferences', filter: 'companyMembers' },
  loyaltyConfig: { dbTable: 'loyalty_configs', filter: 'companyId' },
  loyaltyPoints: { dbTable: 'loyalty_points', filter: 'companyId' },
  inventoryTransfers: { dbTable: 'inventory_transfers', filter: 'companyId' },
  pushSubscriptions: { dbTable: 'pushSubscriptions', filter: 'companyMembers' },
}

function buildExportQuery(tableKey: TableKey, companyId: string): { query: string; values: string[] } {
  const { dbTable, filter } = TABLE_EXPORT[tableKey]
  const quotedTable = /[A-Z]/.test(dbTable) ? `"${dbTable}"` : dbTable
  switch (filter) {
    case 'companyId':
      return {
        query: `SELECT * FROM ${quotedTable} WHERE "companyId" = $1`,
        values: [companyId],
      }
    case 'companyMembers':
      return {
        query: `SELECT * FROM ${quotedTable} WHERE id IN (SELECT "userId" FROM company_members WHERE "companyId" = $1)`,
        values: [companyId],
      }
    case 'saleItems':
      return {
        query: `SELECT * FROM ${quotedTable} WHERE "saleId" IN (SELECT id FROM sales WHERE "companyId" = $1)`,
        values: [companyId],
      }
    default:
      return { query: `SELECT * FROM ${quotedTable}`, values: [] }
  }
}

function buildExportQueryForNotificationPrefs(companyId: string): { query: string; values: string[] } {
  return {
    query: `SELECT * FROM notification_preferences WHERE "userId" IN (SELECT "userId" FROM company_members WHERE "companyId" = $1)`,
    values: [companyId],
  }
}

function buildExportQueryForPushSubs(companyId: string): { query: string; values: string[] } {
  return {
    query: `SELECT * FROM "pushSubscriptions" WHERE "userId" IN (SELECT "userId" FROM company_members WHERE "companyId" = $1)`,
    values: [companyId],
  }
}

export async function shopflowExportRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/export/json - Export company-scoped data as JSON
  fastify.get('/api/shopflow/export/json', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return

      const data: Record<string, unknown[]> = {}

      for (const table of ALLOWED_TABLES) {
        try {
          let query: string
          let values: string[]
          if (table === 'notificationPreferences') {
            const q = buildExportQueryForNotificationPrefs(ctx.companyId)
            query = q.query
            values = q.values
          } else if (table === 'pushSubscriptions') {
            const q = buildExportQueryForPushSubs(ctx.companyId)
            query = q.query
            values = q.values
          } else {
            const q = buildExportQuery(table, ctx.companyId)
            query = q.query
            values = q.values
          }
          const rows = values.length
            ? await sqlUnsafe<any>(query, values)
            : await sqlUnsafe<any>(query)
          data[table] = rows
        } catch (err) {
          fastify.log.warn({ table, err }, `Table ${table} skipped (may not exist)`)
          data[table] = []
        }
      }

      return { success: true, data }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al exportar datos',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/export/csv?table=TABLE - Export one table as CSV (company-scoped)
  fastify.get<{ Querystring: { table: string } }>(
    '/api/shopflow/export/csv',
    async (request, reply) => {
      try {
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return

        const { table } = request.query
        if (!table || typeof table !== 'string') {
          reply.code(400)
          return { success: false, error: 'Query "table" es requerido' }
        }

        const safeTable = table.trim() as TableKey
        if (!ALLOWED_TABLES.includes(safeTable)) {
          reply.code(400)
          return {
            success: false,
            error: `Tabla no permitida. Permitidas: ${ALLOWED_TABLES.join(', ')}`,
          }
        }

        let sql: string
        let params: string[]
        if (safeTable === 'notificationPreferences') {
          const q = buildExportQueryForNotificationPrefs(ctx.companyId)
          sql = q.query
          params = q.values
        } else if (safeTable === 'pushSubscriptions') {
          const q = buildExportQueryForPushSubs(ctx.companyId)
          sql = q.query
          params = q.values
        } else {
          const q = buildExportQuery(safeTable, ctx.companyId)
          sql = q.query
          params = q.values
        }
        const rows = params.length
          ? await sqlUnsafe<any>(sql, params)
          : await sqlUnsafe<any>(sql)
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []

        return {
          success: true,
          data: { rows, headers },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al exportar tabla',
          message: errorMessage,
        }
      }
    }
  )
}
