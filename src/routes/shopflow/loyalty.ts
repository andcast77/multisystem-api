import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'

export async function shopflowLoyaltyRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/loyalty/config - Get loyalty configuration
  fastify.get('/api/shopflow/loyalty/config', async (request, reply) => {
    try {
      const config = await sqlQuery(sql`
        SELECT 
          "pointsPerDollar", "redemptionRate", "pointsExpireMonths",
          "minPurchaseForPoints", "maxPointsPerPurchase", active
        FROM "loyaltyConfig"
        WHERE active = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (config.length === 0) {
        // Return default config
        return {
          success: true,
          data: {
            pointsPerDollar: 1.0,
            redemptionRate: 0.01,
            pointsExpireMonths: undefined,
            minPurchaseForPoints: 0,
            maxPointsPerPurchase: undefined,
          },
        }
      }

      return {
        success: true,
        data: {
          pointsPerDollar: parseFloat(config[0].pointsPerDollar),
          redemptionRate: parseFloat(config[0].redemptionRate),
          pointsExpireMonths: config[0].pointsExpireMonths || undefined,
          minPurchaseForPoints: parseInt(config[0].minPurchaseForPoints),
          maxPointsPerPurchase: config[0].maxPointsPerPurchase
            ? parseInt(config[0].maxPointsPerPurchase)
            : undefined,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener configuración de lealtad',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/loyalty/config - Update loyalty configuration
  fastify.put<{
    Body: {
      pointsPerDollar?: number
      redemptionRate?: number
      pointsExpireMonths?: number | null
      minPurchaseForPoints?: number
      maxPointsPerPurchase?: number | null
    }
  }>('/api/shopflow/loyalty/config', async (request, reply) => {
    try {
      const { pointsPerDollar, redemptionRate, pointsExpireMonths, minPurchaseForPoints, maxPointsPerPurchase } =
        request.body

      // Get current config
      const current = await sqlQuery(sql`
        SELECT 
          "pointsPerDollar", "redemptionRate", "pointsExpireMonths",
          "minPurchaseForPoints", "maxPointsPerPurchase"
        FROM "loyaltyConfig"
        WHERE active = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      const currentConfig = current.length > 0 ? current[0] : {
        pointsPerDollar: 1.0,
        redemptionRate: 0.01,
        pointsExpireMonths: null,
        minPurchaseForPoints: 0,
        maxPointsPerPurchase: null,
      }

      // Create new config (versioning)
      const newConfig = await sqlQuery(sql`
        INSERT INTO "loyaltyConfig" (
          "pointsPerDollar", "redemptionRate", "pointsExpireMonths",
          "minPurchaseForPoints", "maxPointsPerPurchase", active
        )
        VALUES (
          ${pointsPerDollar ?? currentConfig.pointsPerDollar},
          ${redemptionRate ?? currentConfig.redemptionRate},
          ${pointsExpireMonths ?? currentConfig.pointsExpireMonths},
          ${minPurchaseForPoints ?? currentConfig.minPurchaseForPoints},
          ${maxPointsPerPurchase ?? currentConfig.maxPointsPerPurchase},
          true
        )
        RETURNING 
          id, "pointsPerDollar", "redemptionRate", "pointsExpireMonths",
          "minPurchaseForPoints", "maxPointsPerPurchase"
      `)

      // Deactivate old configs
      if (newConfig.length > 0) {
        await sql`
          UPDATE "loyaltyConfig"
          SET active = false
          WHERE id != ${newConfig[0].id} AND active = true
        `
      }

      return {
        success: true,
        data: {
          pointsPerDollar: parseFloat(newConfig[0].pointsPerDollar),
          redemptionRate: parseFloat(newConfig[0].redemptionRate),
          pointsExpireMonths: newConfig[0].pointsExpireMonths || undefined,
          minPurchaseForPoints: parseInt(newConfig[0].minPurchaseForPoints),
          maxPointsPerPurchase: newConfig[0].maxPointsPerPurchase
            ? parseInt(newConfig[0].maxPointsPerPurchase)
            : undefined,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar configuración de lealtad',
        message: errorMessage,
      }
    }
  })

  // GET /api/shopflow/loyalty/points/:customerId - Get customer points balance
  fastify.get<{ Params: { customerId: string } }>(
    '/api/shopflow/loyalty/points/:customerId',
    async (request, reply) => {
      try {
        const { customerId } = request.params

        // Check customer exists
        const customer = await sqlQuery(sql`
          SELECT id, name FROM customers WHERE id = ${customerId} LIMIT 1
        `)

        if (customer.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Cliente no encontrado',
          }
        }

        // Get all points transactions
        const transactions = await sqlQuery(sql`
          SELECT 
            id, points, type, description, "saleId", "expiresAt", "createdAt"
          FROM "loyaltyPoints"
          WHERE "customerId" = ${customerId}
          ORDER BY "createdAt" DESC
        `)

        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        let totalPoints = 0
        let availablePoints = 0
        let expiringSoon = 0
        let lastActivity: Date | null = null

        for (const transaction of transactions) {
          const createdAt = new Date(transaction.createdAt)
          if (!lastActivity || createdAt > lastActivity) {
            lastActivity = createdAt
          }

          // Check if points have expired
          if (transaction.expiresAt && new Date(transaction.expiresAt) < now) {
            continue
          }

          const points = parseInt(transaction.points) || 0
          totalPoints += points

          // Count available points (not redeemed)
          if (transaction.type !== 'REDEEMED') {
            availablePoints += points
          }

          // Count points expiring soon
          if (
            transaction.expiresAt &&
            new Date(transaction.expiresAt) <= thirtyDaysFromNow &&
            new Date(transaction.expiresAt) > now
          ) {
            if (transaction.type !== 'REDEEMED') {
              expiringSoon += points
            }
          }
        }

        return {
          success: true,
          data: {
            customerId,
            customerName: customer[0].name,
            totalPoints: Math.max(0, totalPoints),
            availablePoints: Math.max(0, availablePoints),
            expiringSoon: Math.max(0, expiringSoon),
            lastActivity,
          },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener balance de puntos',
          message: errorMessage,
        }
      }
    }
  )

  // POST /api/shopflow/loyalty/points/award - Award points for purchase
  fastify.post<{
    Body: {
      customerId: string
      purchaseAmount: number
      saleId: string
    }
  }>('/api/shopflow/loyalty/points/award', async (request, reply) => {
    try {
      const { customerId, purchaseAmount, saleId } = request.body

      // Get loyalty config
      const config = await sqlQuery(sql`
        SELECT 
          "pointsPerDollar", "minPurchaseForPoints", "maxPointsPerPurchase", "pointsExpireMonths"
        FROM "loyaltyConfig"
        WHERE active = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `)

      if (config.length === 0) {
        return {
          success: true,
          data: { pointsAwarded: 0 },
        }
      }

      const cfg = config[0]
      const minPurchase = parseFloat(cfg.minPurchaseForPoints) || 0

      // Check minimum purchase requirement
      if (purchaseAmount < minPurchase) {
        return {
          success: true,
          data: { pointsAwarded: 0 },
        }
      }

      // Calculate points to award
      let pointsToAward = Math.floor(purchaseAmount * parseFloat(cfg.pointsPerDollar))

      // Apply maximum points per purchase limit if set
      if (cfg.maxPointsPerPurchase) {
        const maxPoints = parseInt(cfg.maxPointsPerPurchase)
        if (pointsToAward > maxPoints) {
          pointsToAward = maxPoints
        }
      }

      if (pointsToAward <= 0) {
        return {
          success: true,
          data: { pointsAwarded: 0 },
        }
      }

      // Calculate expiration date if configured
      let expiresAt: Date | null = null
      if (cfg.pointsExpireMonths) {
        expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(cfg.pointsExpireMonths))
      }

      // Create points transaction
      const transaction = await sqlQuery(sql`
        INSERT INTO "loyaltyPoints" (
          "customerId", type, points, description, "saleId", "expiresAt", balance
        )
        VALUES (
          ${customerId}, 'EARNED', ${pointsToAward}, 
          ${`Points earned from purchase #${saleId}`}, ${saleId}, ${expiresAt}, 0
        )
        RETURNING id, points
      `)

      return {
        success: true,
        data: { pointsAwarded: transaction.length > 0 ? parseInt(transaction[0].points) : 0 },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al otorgar puntos',
        message: errorMessage,
      }
    }
  })
}
