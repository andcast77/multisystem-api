import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireShopflowContext } from '../../lib/auth-context.js'

export async function shopflowPushSubscriptionsRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/users/:userId/push-subscriptions - List user's push subscriptions (own only)
  fastify.get<{ Params: { userId: string } }>(
    '/api/shopflow/users/:userId/push-subscriptions',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { userId } = request.params
        if (userId !== ctx.userId) {
          reply.code(403)
          return { success: false, error: 'Solo puedes ver tus propias suscripciones' }
        }
        const rows = await sqlQuery<any>(sql`
          SELECT id, "userId", endpoint, p256dh, auth, "createdAt"
          FROM "pushSubscriptions"
          WHERE "userId" = ${userId}
          ORDER BY "createdAt" DESC
        `)
        const data = rows.map((r: { endpoint: string; p256dh: string; auth: string }) => ({
          endpoint: r.endpoint,
          p256dh: r.p256dh,
          auth: r.auth,
        }))
        return { success: true, data }
      } catch (error) {
        fastify.log.error(error)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        reply.code(500)
        return {
          success: false,
          error: 'Error al obtener suscripciones push',
          message: errorMessage,
        }
      }
    }
  )

  // POST /api/shopflow/push-subscriptions - Register a push subscription (for authenticated user)
  fastify.post<{
    Body: {
      userId?: string
      endpoint: string
      p256dh: string
      auth: string
    }
  }>('/api/shopflow/push-subscriptions', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      const ctx = contextFromRequest(request, true)
      const { userId: bodyUserId, endpoint, p256dh, auth } = request.body
      if (!endpoint || !p256dh || !auth) {
        reply.code(400)
        return { success: false, error: 'endpoint, p256dh y auth son requeridos' }
      }
      const userId = bodyUserId && bodyUserId === ctx.userId ? bodyUserId : ctx.userId

      const existing = await sqlQuery<any>(sql`
        SELECT id, "userId" FROM "pushSubscriptions" WHERE endpoint = ${endpoint} LIMIT 1
      `)
      if (existing.length > 0) {
        await sqlQuery(sql`
          UPDATE "pushSubscriptions"
          SET "userId" = ${userId}, p256dh = ${p256dh}, auth = ${auth}
          WHERE endpoint = ${endpoint}
        `)
      } else {
        await sqlQuery(sql`
          INSERT INTO "pushSubscriptions" (id, "userId", endpoint, p256dh, auth, "createdAt")
          VALUES (gen_random_uuid(), ${userId}, ${endpoint}, ${p256dh}, ${auth}, NOW())
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

  // DELETE /api/shopflow/push-subscriptions?endpoint= - Remove subscription by endpoint (own only)
  fastify.delete<{ Querystring: { endpoint: string } }>(
    '/api/shopflow/push-subscriptions',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { endpoint } = request.query
        if (!endpoint) {
          reply.code(400)
          return { success: false, error: 'Query "endpoint" es requerido' }
        }

        const decoded = decodeURIComponent(endpoint)
        const existing = await sqlQuery<any>(sql`
          SELECT id, "userId" FROM "pushSubscriptions" WHERE endpoint = ${decoded} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Suscripción no encontrada' }
        }
        if ((existing[0] as { userId: string }).userId !== ctx.userId) {
          reply.code(403)
          return { success: false, error: 'Solo puedes eliminar tus propias suscripciones' }
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
