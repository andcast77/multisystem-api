import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'

export async function shopflowUserPreferencesRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/user-preferences - Get user preferences
  fastify.get<{ Params: { userId: string } }>(
    '/api/shopflow/user-preferences/:userId',
    async (request, reply) => {
      try {
        const { userId } = request.params

        let preferences = await sqlQuery<any>(sql`
          SELECT 
            id, "userId", language, theme, "createdAt", "updatedAt"
          FROM "userPreferences"
          WHERE "userId" = ${userId}
          LIMIT 1
        `)

        if (preferences.length === 0) {
          // Create default preferences
          const defaultPrefs = await sqlQuery<any>(sql`
            INSERT INTO "userPreferences" ("userId", language)
            VALUES (${userId}, 'es')
            RETURNING 
              id, "userId", language, theme, "createdAt", "updatedAt"
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
      const { userId } = request.params
      const { language, theme } = request.body

      // Get or create preferences
      let preferences = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM "userPreferences" WHERE "userId" = ${userId} LIMIT 1
      `)

      if (preferences.length === 0) {
        // Create if doesn't exist
        const newPrefs = await sqlQuery<any>(sql`
          INSERT INTO "userPreferences" ("userId", language, theme)
          VALUES (${userId}, ${language ?? 'es'}, ${theme})
          RETURNING 
            id, "userId", language, theme, "createdAt", "updatedAt"
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
      if (theme !== undefined) {
        updates.push(`theme = $${values.length + 1}`)
        values.push(theme)
      }

      if (updates.length === 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No hay campos para actualizar',
        }
      }

      updates.push(`"updatedAt" = NOW()`)
      values.push(preferences[0].id)

      const query = `
        UPDATE "userPreferences" 
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING 
          id, "userId", language, theme, "createdAt", "updatedAt"
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
