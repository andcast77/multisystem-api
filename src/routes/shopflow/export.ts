import { FastifyInstance } from 'fastify'
import { sqlQuery, sqlUnsafe } from '../../db/neon.js'

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

const QUOTED_TABLES = new Set([
  'saleItems', 'storeConfig', 'ticketConfig', 'userPreferences', 'actionHistory',
  'notificationPreferences', 'loyaltyConfig', 'loyaltyPoints', 'inventoryTransfers', 'pushSubscriptions',
])

export async function shopflowExportRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/export/json - Export all data as JSON
  fastify.get('/api/shopflow/export/json', async (request, reply) => {
    try {
      const data: Record<string, unknown[]> = {}

      for (const table of ALLOWED_TABLES) {
        try {
          const quoted = QUOTED_TABLES.has(table) ? `"${table}"` : table
          const rows = await sqlUnsafe<any>(`SELECT * FROM ${quoted}`)
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

  // GET /api/shopflow/export/csv?table=TABLE - Export one table as CSV (returns rows + headers)
  fastify.get<{ Querystring: { table: string } }>(
    '/api/shopflow/export/csv',
    async (request, reply) => {
      try {
        const { table } = request.query
        if (!table || typeof table !== 'string') {
          reply.code(400)
          return { success: false, error: 'Query "table" es requerido' }
        }

        const safeTable = table.trim()
        if (!ALLOWED_TABLES.includes(safeTable as (typeof ALLOWED_TABLES)[number])) {
          reply.code(400)
          return {
            success: false,
            error: `Tabla no permitida. Permitidas: ${ALLOWED_TABLES.join(', ')}`,
          }
        }

        const quoted = QUOTED_TABLES.has(safeTable as (typeof ALLOWED_TABLES)[number]) ? `"${safeTable}"` : safeTable

        const rows = await sqlUnsafe<any>(`SELECT * FROM ${quoted}`)
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
