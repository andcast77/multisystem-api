import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getShopflowContext } from './auth-helper.js'

export async function shopflowUserPreferencesRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/user-preferences - Get user preferences (scoped by company)
  fastify.get<{ Params: { userId: string } }>(
    '/api/shopflow/user-preferences/:userId',
    async (request, reply) => {
      try {
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return
        const { userId } = request.params

        let preferences = await sqlQuery<any>(sql`
          SELECT 
            id, "userId", "companyId", language, "createdAt", "updatedAt"
          FROM user_preferences
          WHERE "userId" = ${userId} AND "companyId" IS NOT DISTINCT FROM ${ctx.companyId}
          LIMIT 1
        `)

        if (preferences.length === 0) {
          // Create default preferences for this user+company
          const defaultPrefs = await sqlQuery<any>(sql`
            INSERT INTO user_preferences ("userId", "companyId", language)
            VALUES (${userId}, ${ctx.companyId}, 'es')
            RETURNING 
              id, "userId", "companyId", language, "createdAt", "updatedAt"
          `)

          return {
            success: true,
            data: defaultPrefs[0],
          }
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
          error: 'Error al obtener preferencias de usuario',
          message: errorMessage,
        }
      }
    }
  )

  // PUT /api/shopflow/user-preferences/:userId - Update user preferences
  fastify.put<{
    Params: { userId: string }
    Body: {
      language?: string
      theme?: string | null
    }
  }>('/api/shopflow/user-preferences/:userId', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { userId } = request.params
      const { language } = request.body

      // Get or create preferences (company-scoped)
      let preferences = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM user_preferences WHERE "userId" = ${userId} AND "companyId" IS NOT DISTINCT FROM ${ctx.companyId} LIMIT 1
      `)

      if (preferences.length === 0) {
        // Create if doesn't exist for this user+company
        const newPrefs = await sqlQuery<any>(sql`
          INSERT INTO user_preferences ("userId", "companyId", language)
          VALUES (${userId}, ${ctx.companyId}, ${language ?? 'es'})
          RETURNING 
            id, "userId", "companyId", language, "createdAt", "updatedAt"
        `)

        return {
          success: true,
          data: newPrefs[0],
        }
      }

      // Build update query
      const updates: string[] = []
      const values: any[] = []

      if (language !== undefined) {
        updates.push(`language = $${values.length + 1}`)
        values.push(language)
      }

      if (updates.length === 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No hay campos para actualizar',
        }
      }

      updates.push(`"updatedAt" = NOW()`)
      values.push(ctx.companyId, preferences[0].id)

      const idParam = values.length
      const companyParam = values.length - 1
      const query = `
        UPDATE user_preferences 
        SET ${updates.join(', ')}
        WHERE id = $${idParam} AND "companyId" IS NOT DISTINCT FROM $${companyParam}
        RETURNING 
          id, "userId", "companyId", language, "createdAt", "updatedAt"
      `

      const updated = await sqlUnsafe<any>(query, values)

      return {
        success: true,
        data: updated[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar preferencias de usuario',
        message: errorMessage,
      }
    }
  })
}
