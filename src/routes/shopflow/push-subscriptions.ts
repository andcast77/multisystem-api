import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

export async function shopflowPushSubscriptionsRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/users/:userId/push-subscriptions - List user's push subscriptions
  fastify.get<{ Params: { userId: string } }>(
    '/api/shopflow/users/:userId/push-subscriptions',
    async (request, reply) => {
      try {
        const { userId } = request.params
        const rows = await sqlQuery<any>(sql`
          SELECT id, "userId", endpoint, p256dh, auth, "createdAt"
          FROM "pushSubscriptions"
          WHERE "userId" = ${userId}
          ORDER BY "createdAt" DESC
        `)
        const data = rows.map((r) => ({
          endpoint: r.endpoint,
          p256dh: r.p256dh,
          auth: r.auth,
        }))
        return { success: true, data }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener suscripciones push',
          message: errorMessage,
        }
      }
    }
  )

  // POST /api/shopflow/push-subscriptions - Register a push subscription
  fastify.post<{
    Body: {
      userId: string
      endpoint: string
      p256dh: string
      auth: string
    }
  }>('/api/shopflow/push-subscriptions', async (request, reply) => {
    try {
      const { userId, endpoint, p256dh, auth } = request.body
      if (!userId || !endpoint || !p256dh || !auth) {
        reply.code(400)
        return { success: false, error: 'userId, endpoint, p256dh y auth son requeridos' }
      }

      const existing = await sqlQuery<any>(sql`
        SELECT id FROM "pushSubscriptions" WHERE endpoint = ${endpoint} LIMIT 1
      `)
      if (existing.length > 0) {
        await sqlQuery(sql`
          UPDATE "pushSubscriptions"
          SET "userId" = ${userId}, p256dh = ${p256dh}, auth = ${auth}
          WHERE endpoint = ${endpoint}
        `)
      } else {
        await sqlQuery(sql`
          INSERT INTO "pushSubscriptions" ("userId", endpoint, p256dh, auth)
          VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
        `)
      }

      const rows = await sqlQuery<any>(sql`
        SELECT id, "userId", endpoint, p256dh, auth, "createdAt"
        FROM "pushSubscriptions" WHERE endpoint = ${endpoint} LIMIT 1
      `)
      return { success: true, data: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al registrar suscripción push',
        message: errorMessage,
      }
    }
  })

  // DELETE /api/shopflow/push-subscriptions?endpoint= - Remove subscription by endpoint
  fastify.delete<{ Querystring: { endpoint: string } }>(
    '/api/shopflow/push-subscriptions',
    async (request, reply) => {
      try {
        const { endpoint } = request.query
        if (!endpoint) {
          reply.code(400)
          return { success: false, error: 'Query "endpoint" es requerido' }
        }

        const decoded = decodeURIComponent(endpoint)
        const existing = await sqlQuery<any>(sql`
          SELECT id FROM "pushSubscriptions" WHERE endpoint = ${decoded} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Suscripción no encontrada' }
        }

        await sqlQuery(sql`DELETE FROM "pushSubscriptions" WHERE endpoint = ${decoded}`)
        return { success: true, data: { deleted: true } }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al eliminar suscripción push',
          message: errorMessage,
        }
      }
    }
  )
}
