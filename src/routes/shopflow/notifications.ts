import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'

export async function shopflowNotificationsRoutes(fastify: FastifyInstance) {
  // POST /api/shopflow/notifications - Create notification
  fastify.post<{
    Body: {
      userId: string
      type: string
      priority?: string
      title: string
      message: string
      data?: Record<string, unknown>
      actionUrl?: string
      expiresAt?: string
    }
  }>('/api/shopflow/notifications', async (request, reply) => {
    try {
      const { userId, type, priority, title, message, data, actionUrl, expiresAt } = request.body

      if (!userId || !type || !title || !message) {
        reply.code(400)
        return {
          success: false,
          error: 'userId, type, title y message son requeridos',
        }
      }

      const result = await sql`
        INSERT INTO notifications (
          id,
          "userId",
          type,
          priority,
          title,
          message,
          data,
          "actionUrl",
          "expiresAt",
          status
        )
        VALUES (
          gen_random_uuid(),
          ${userId},
          ${type},
          ${priority || 'MEDIUM'},
          ${title},
          ${message},
          ${data ? JSON.stringify(data) : null},
          ${actionUrl || null},
          ${expiresAt ? new Date(expiresAt) : null},
          'UNREAD'
        )
        RETURNING 
          id,
          "userId",
          type,
          priority,
          title,
          message,
          data,
          "actionUrl",
          status,
          "expiresAt",
          "readAt",
          "createdAt",
          "updatedAt"
      `

      const notification = result[0] as any
      return {
        success: true,
        data: {
          ...notification,
          data: notification.data ? JSON.parse(notification.data) : null,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear notificación',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/notifications - Get notifications with filters
  fastify.get<{
    Querystring: {
      userId?: string
      type?: string
      status?: string
      priority?: string
      page?: string
      limit?: string
    }
  }>('/api/shopflow/notifications', async (request, reply) => {
    try {
      const {
        userId,
        type,
        status,
        priority,
        page = '1',
        limit = '20',
      } = request.query

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const skip = (pageNum - 1) * limitNum

      let query = sql`
        SELECT 
          id,
          "userId",
          type,
          priority,
          title,
          message,
          data,
          "actionUrl",
          status,
          "expiresAt",
          "readAt",
          "createdAt",
          "updatedAt"
        FROM notifications
        WHERE 1=1
      `

      if (userId) {
        query = sql`${query} AND "userId" = ${userId}`
      }

      if (type) {
        query = sql`${query} AND type = ${type}`
      }

      if (status) {
        query = sql`${query} AND status = ${status}`
      }

      if (priority) {
        query = sql`${query} AND priority = ${priority}`
      }

      // Don't show expired notifications
      query = sql`
        ${query}
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      `

      // Get total count
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM notifications
        WHERE 1=1
          ${userId ? sql`AND "userId" = ${userId}` : sql``}
          ${type ? sql`AND type = ${type}` : sql``}
          ${status ? sql`AND status = ${status}` : sql``}
          ${priority ? sql`AND priority = ${priority}` : sql``}
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      `

      const countResult = await countQuery
      const total = parseInt((countResult[0] as { total: string }).total || '0')

      // Get paginated results
      query = sql`
        ${query}
        ORDER BY "createdAt" DESC
        LIMIT ${limitNum} OFFSET ${skip}
      `

      const results = await query

      const notifications = results.map((row: any) => ({
        ...row,
        data: row.data ? JSON.parse(row.data) : null,
      }))

      return {
        success: true,
        data: {
          notifications,
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
        error: 'Error al obtener notificaciones',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/notifications/:id/read - Mark notification as read
  fastify.put<{
    Params: { id: string }
    Body: {
      userId: string
    }
  }>('/api/shopflow/notifications/:id/read', async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      if (!userId) {
        reply.code(400)
        return {
          success: false,
          error: 'userId es requerido',
        }
      }

      // Check if notification exists and belongs to user
      const existing = await sql`
        SELECT id, "userId"
        FROM notifications
        WHERE id = ${id}
        LIMIT 1
      `

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Notificación no encontrada',
        }
      }

      if ((existing[0] as { userId: string }).userId !== userId) {
        reply.code(403)
        return {
          success: false,
          error: 'Acceso denegado',
        }
      }

      await sql`
        UPDATE notifications
        SET status = 'READ', "readAt" = NOW()
        WHERE id = ${id}
      `

      return {
        success: true,
        data: { success: true },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al marcar notificación como leída',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/notifications/:id/unread - Mark notification as unread
  fastify.put<{
    Params: { id: string }
    Body: {
      userId: string
    }
  }>('/api/shopflow/notifications/:id/unread', async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      if (!userId) {
        reply.code(400)
        return {
          success: false,
          error: 'userId es requerido',
        }
      }

      // Check if notification exists and belongs to user
      const existing = await sql`
        SELECT id, "userId"
        FROM notifications
        WHERE id = ${id}
        LIMIT 1
      `

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Notificación no encontrada',
        }
      }

      if ((existing[0] as { userId: string }).userId !== userId) {
        reply.code(403)
        return {
          success: false,
          error: 'Acceso denegado',
        }
      }

      await sql`
        UPDATE notifications
        SET status = 'UNREAD', "readAt" = NULL
        WHERE id = ${id}
      `

      return {
        success: true,
        data: { success: true },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al marcar notificación como no leída',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/notifications/read-all - Mark all notifications as read for a user
  fastify.put<{
    Body: {
      userId: string
    }
  }>('/api/shopflow/notifications/read-all', async (request, reply) => {
    try {
      const { userId } = request.body

      if (!userId) {
        reply.code(400)
        return {
          success: false,
          error: 'userId es requerido',
        }
      }

      const result = await sql`
        UPDATE notifications
        SET status = 'READ', "readAt" = NOW()
        WHERE "userId" = ${userId}
          AND status = 'UNREAD'
        RETURNING id
      `

      return {
        success: true,
        data: { count: result.length },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al marcar todas las notificaciones como leídas',
        message: errorMessage,
      }
    }
  })

  // DELETE /api/shopflow/notifications/:id - Delete notification
  fastify.delete<{
    Params: { id: string }
    Body: {
      userId: string
    }
  }>('/api/shopflow/notifications/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      if (!userId) {
        reply.code(400)
        return {
          success: false,
          error: 'userId es requerido',
        }
      }

      // Check if notification exists and belongs to user
      const existing = await sql`
        SELECT id, "userId"
        FROM notifications
        WHERE id = ${id}
        LIMIT 1
      `

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Notificación no encontrada',
        }
      }

      if ((existing[0] as { userId: string }).userId !== userId) {
        reply.code(403)
        return {
          success: false,
          error: 'Acceso denegado',
        }
      }

      await sql`DELETE FROM notifications WHERE id = ${id}`

      return {
        success: true,
        data: { success: true },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al eliminar notificación',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/notifications/unread-count - Get unread notification count
  fastify.get<{
    Querystring: {
      userId: string
    }
  }>('/api/shopflow/notifications/unread-count', async (request, reply) => {
    try {
      const { userId } = request.query

      if (!userId) {
        reply.code(400)
        return {
          success: false,
          error: 'userId es requerido',
        }
      }

      const result = await sql`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE "userId" = ${userId}
          AND status = 'UNREAD'
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
      `

      const count = parseInt((result[0] as { count: string }).count || '0')

      return {
        success: true,
        data: { count },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener contador de no leídas',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/notifications/preferences/:userId - Get user notification preferences
  fastify.get<{
    Params: { userId: string }
  }>('/api/shopflow/notifications/preferences/:userId', async (request, reply) => {
    try {
      const { userId } = request.params

      let preferences = await sql`
        SELECT *
        FROM "notificationPreferences"
        WHERE "userId" = ${userId}
        LIMIT 1
      `

      // Create default preferences if none exist
      if (preferences.length === 0) {
        const result = await sql`
          INSERT INTO "notificationPreferences" (
            id,
            "userId",
            "emailEnabled",
            "inAppEnabled",
            "pushEnabled"
          )
          VALUES (
            gen_random_uuid(),
            ${userId},
            true,
            true,
            false
          )
          RETURNING *
        `
        preferences = result
      }

      return {
        success: true,
        data: preferences[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener preferencias de notificaciones',
        message: errorMessage,
      }
    }
  })
}
