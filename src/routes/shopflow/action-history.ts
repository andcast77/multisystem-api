import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

export async function shopflowActionHistoryRoutes(fastify: FastifyInstance) {
  // POST /api/shopflow/action-history - Log an action
  fastify.post<{
    Body: {
      userId: string
      action: string
      entityType: string
      entityId?: string
      details?: Record<string, unknown>
      ipAddress?: string
      userAgent?: string
    }
  }>('/api/shopflow/action-history', async (request, reply) => {
    try {
      const { userId, action, entityType, entityId, details, ipAddress, userAgent } = request.body

      if (!userId || !action || !entityType) {
        reply.code(400)
        return {
          success: false,
          error: 'userId, action y entityType son requeridos',
        }
      }

      const result = await sqlQuery(sql`
        INSERT INTO "actionHistory" (
          id,
          "userId",
          action,
          "entityType",
          "entityId",
          details,
          "ipAddress",
          "userAgent"
        )
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${action},
          ${entityType},
          ${entityId || null},
          ${details ? JSON.stringify(details) : null},
          ${ipAddress || null},
          ${userAgent || null}
        )
        RETURNING id
      `)

      return {
        success: true,
        data: { id: result[0]?.id },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al registrar acción',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/action-history - Get action history with filters
  fastify.get<{
    Querystring: {
      userId?: string
      action?: string
      entityType?: string
      entityId?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/action-history', async (request, reply) => {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page = '1',
        limit = '50',
      } = request.query

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT 
          ah.id,
          ah."userId",
          ah.action,
          ah."entityType",
          ah."entityId",
          ah.details,
          ah."ipAddress",
          ah."userAgent",
          ah."createdAt",
          u.id as "user.id",
          u.email as "user.name",
          u.email as "user.email",
          u.role as "user.role"
        FROM "actionHistory" ah
        INNER JOIN users u ON ah."userId" = u.id
        WHERE 1=1
      `

      if (userId) {
        query = sql`${query} AND ah."userId" = ${userId}`
      }

      if (action) {
        query = sql`${query} AND ah.action = ${action}`
      }

      if (entityType) {
        query = sql`${query} AND ah."entityType" = ${entityType}`
      }

      if (entityId) {
        query = sql`${query} AND ah."entityId" = ${entityId}`
      }

      if (startDate) {
        query = sql`${query} AND ah."createdAt" >= ${new Date(startDate)}`
      }

      if (endDate) {
        query = sql`${query} AND ah."createdAt" <= ${new Date(endDate)}`
      }

      // Get total count
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM "actionHistory" ah
        WHERE 1=1
          ${userId ? sql`AND ah."userId" = ${userId}` : sql``}
          ${action ? sql`AND ah.action = ${action}` : sql``}
          ${entityType ? sql`AND ah."entityType" = ${entityType}` : sql``}
          ${entityId ? sql`AND ah."entityId" = ${entityId}` : sql``}
          ${startDate ? sql`AND ah."createdAt" >= ${new Date(startDate)}` : sql``}
          ${endDate ? sql`AND ah."createdAt" <= ${new Date(endDate)}` : sql``}
      `

      const countResult = await sqlQuery(countQuery)
      const total = parseInt((countResult[0] as { total: string })?.total || '0')

      // Get paginated results
      query = sql`
        ${query}
        ORDER BY ah."createdAt" DESC
        LIMIT ${limitNum} OFFSET ${skip}
      `

      const results = await sqlQuery(query)

      const actions = results.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        details: row.details ? JSON.parse(row.details) : null,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        user: {
          id: row['user.id'],
          name: row['user.name'],
          email: row['user.email'],
          role: row['user.role'],
        },
      }))

      return {
        success: true,
        data: {
          actions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener historial de acciones',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/action-history/user/:userId - Get action history for a specific user
  fastify.get<{
    Params: { userId: string }
    Querystring: {
      action?: string
      entityType?: string
      entityId?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/action-history/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params
      const queryParams = { ...request.query, userId }
      // Redirect to main endpoint with userId in query
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/shopflow/action-history',
        query: queryParams as any,
      })
      return JSON.parse(response.body)
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener historial de acciones del usuario',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/action-history/entity/:entityType/:entityId - Get actions for a specific entity
  fastify.get<{
    Params: { entityType: string; entityId: string }
    Querystring: {
      userId?: string
      action?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/action-history/entity/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params
      const queryParams = { ...request.query, entityType, entityId }
      // Redirect to main endpoint with entityType and entityId in query
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/shopflow/action-history',
        query: queryParams as any,
      })
      return JSON.parse(response.body)
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener historial de acciones de la entidad',
        message: errorMessage,
      }
    }
  })
}
