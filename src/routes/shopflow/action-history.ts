import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

export async function shopflowActionHistoryRoutes(fastify: FastifyInstance) {
  // POST /api/shopflow/action-history - Log an action
  fastify.post('/api/shopflow/action-history', async (request: any, reply: any) => {
    try {
      const { userId, action, entityType, entityId, details, ipAddress, userAgent } = (request.body ?? {})

      if (!userId || !action || !entityType) {
        reply.code(400)
        return {
          success: false,
          error: 'userId, action y entityType son requeridos',
        }
      }

      const result = await sqlQuery(sql`
        INSERT INTO action_history (
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
  fastify.get('/api/shopflow/action-history', async (request: any, reply: any) => {
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
      } = (request.query ?? {})

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT 
          ah.id,
          ah."companyId",
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
        FROM action_history ah
        INNER JOIN users u ON ah."userId" = u.id
        WHERE 1 = 1
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

      // Total count
      let countQuery = sql`
        SELECT COUNT(*) as total
        FROM action_history ah
        INNER JOIN users u ON ah."userId" = u.id
        WHERE 1 = 1
      `
      if (userId) countQuery = sql`${countQuery} AND ah."userId" = ${userId}`
      if (action) countQuery = sql`${countQuery} AND ah.action = ${action}`
      if (entityType) countQuery = sql`${countQuery} AND ah."entityType" = ${entityType}`
      if (entityId) countQuery = sql`${countQuery} AND ah."entityId" = ${entityId}`
      if (startDate) countQuery = sql`${countQuery} AND ah."createdAt" >= ${new Date(startDate)}`
      if (endDate) countQuery = sql`${countQuery} AND ah."createdAt" <= ${new Date(endDate)}`

      const countResult = await sqlQuery(countQuery)
      const total = parseInt((countResult[0] as { total: string })?.total || '0')

      // Paginated results
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
  fastify.get('/api/shopflow/action-history/user/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as any
      const queryParams = { ...(request.query ?? {}), userId }
      const authHeader = request.headers?.authorization
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/shopflow/action-history',
        query: queryParams as any,
        headers: authHeader ? { authorization: authHeader } : {},
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
  fastify.get(
    '/api/shopflow/action-history/entity/:entityType/:entityId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { entityType, entityId } = request.params as any
        const queryParams = { ...(request.query ?? {}), entityType, entityId }
        const authHeader = request.headers?.authorization
        const response = await fastify.inject({
          method: 'GET',
          url: '/api/shopflow/action-history',
          query: queryParams as any,
          headers: authHeader ? { authorization: authHeader } : {},
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
    }
  )
}
