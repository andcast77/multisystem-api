import { prisma } from '@/lib/prisma'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import { LoyaltyPointType } from '@prisma/client'

export interface LoyaltyConfigData {
  pointsPerDollar: number
  redemptionRate: number
  pointsExpireMonths?: number
  minPurchaseForPoints: number
  maxPointsPerPurchase?: number
}

export interface CustomerPointsBalance {
  customerId: string
  customerName: string
  totalPoints: number
  availablePoints: number
  expiringSoon: number // Points expiring in next 30 days
  lastActivity: Date | null
}

export interface PointsTransaction {
  customerId: string
  points: number
  type: LoyaltyPointType
  description?: string
  saleId?: string
  expiresAt?: Date
}

/**
 * Get current loyalty configuration
 */
export async function getLoyaltyConfig(): Promise<LoyaltyConfigData> {
  const config = await prisma.loyaltyConfig.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    // Return default config if none exists
    return {
      pointsPerDollar: 1.0,
      redemptionRate: 0.01,
      pointsExpireMonths: undefined,
      minPurchaseForPoints: 0,
      maxPointsPerPurchase: undefined,
    }
  }

  return {
    pointsPerDollar: config.pointsPerDollar,
    redemptionRate: config.redemptionRate,
    pointsExpireMonths: config.pointsExpireMonths || undefined,
    minPurchaseForPoints: config.minPurchaseForPoints,
    maxPointsPerPurchase: config.maxPointsPerPurchase || undefined,
  }
}

/**
 * Update loyalty configuration
 */
export async function updateLoyaltyConfig(data: Partial<LoyaltyConfigData>): Promise<LoyaltyConfigData> {
  const currentConfig = await getLoyaltyConfig()

  const updatedConfig = await prisma.loyaltyConfig.create({
    data: {
      pointsPerDollar: data.pointsPerDollar ?? currentConfig.pointsPerDollar,
      redemptionRate: data.redemptionRate ?? currentConfig.redemptionRate,
      pointsExpireMonths: data.pointsExpireMonths ?? currentConfig.pointsExpireMonths,
      minPurchaseForPoints: data.minPurchaseForPoints ?? currentConfig.minPurchaseForPoints,
      maxPointsPerPurchase: data.maxPointsPerPurchase ?? currentConfig.maxPointsPerPurchase,
      active: true,
    },
  })

  return {
    pointsPerDollar: updatedConfig.pointsPerDollar,
    redemptionRate: updatedConfig.redemptionRate,
    pointsExpireMonths: updatedConfig.pointsExpireMonths || undefined,
    minPurchaseForPoints: updatedConfig.minPurchaseForPoints,
    maxPointsPerPurchase: updatedConfig.maxPointsPerPurchase || undefined,
  }
}

/**
 * Get customer's current points balance
 */
export async function getCustomerPointsBalance(customerId: string): Promise<CustomerPointsBalance> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true },
  })

  if (!customer) {
    throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
  }

  // Get all points transactions for this customer
  const transactions = await prisma.loyaltyPoint.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let totalPoints = 0
  let availablePoints = 0
  let expiringSoon = 0
  let lastActivity: Date | null = null

  for (const transaction of transactions) {
    if (!lastActivity || transaction.createdAt > lastActivity) {
      lastActivity = transaction.createdAt
    }

    // Check if points have expired
    if (transaction.expiresAt && transaction.expiresAt < now) {
      continue // Skip expired points
    }

    totalPoints += transaction.points

    // Count available points (not redeemed)
    if (transaction.type !== LoyaltyPointType.REDEEMED) {
      availablePoints += transaction.points
    }

    // Count points expiring soon
    if (transaction.expiresAt && transaction.expiresAt <= thirtyDaysFromNow && transaction.expiresAt > now) {
      if (transaction.type !== LoyaltyPointType.REDEEMED) {
        expiringSoon += transaction.points
      }
    }
  }

  return {
    customerId,
    customerName: customer.name,
    totalPoints: Math.max(0, totalPoints), // Ensure non-negative
    availablePoints: Math.max(0, availablePoints),
    expiringSoon: Math.max(0, expiringSoon),
    lastActivity,
  }
}

/**
 * Award points to customer for a purchase
 */
export async function awardPointsForPurchase(
  customerId: string,
  purchaseAmount: number,
  saleId: string
): Promise<number> {
  const config = await getLoyaltyConfig()

  // Check minimum purchase requirement
  if (purchaseAmount < config.minPurchaseForPoints) {
    return 0 // No points awarded
  }

  // Calculate points to award
  let pointsToAward = Math.floor(purchaseAmount * config.pointsPerDollar)

  // Apply maximum points per purchase limit if set
  if (config.maxPointsPerPurchase && pointsToAward > config.maxPointsPerPurchase) {
    pointsToAward = config.maxPointsPerPurchase
  }

  if (pointsToAward <= 0) {
    return 0
  }

  // Calculate expiration date if configured
  let expiresAt: Date | undefined
  if (config.pointsExpireMonths) {
    expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + config.pointsExpireMonths)
  }

  // Create points transaction
  const transaction = await prisma.loyaltyPoint.create({
    data: {
      customerId,
      type: LoyaltyPointType.EARNED,
      points: pointsToAward,
      balance: 0, // Will be calculated below
      description: `Points earned from purchase #${saleId}`,
      saleId,
      expiresAt,
    },
  })

  // Update balance for this transaction
  const currentBalance = await getCustomerPointsBalance(customerId)
  await prisma.loyaltyPoint.update({
    where: { id: transaction.id },
    data: { balance: currentBalance.availablePoints },
  })

  return pointsToAward
}

/**
 * Redeem points for discount
 */
export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  description?: string
): Promise<{ discountAmount: number; pointsUsed: number }> {
  const config = await getLoyaltyConfig()
  const balance = await getCustomerPointsBalance(customerId)

  if (balance.availablePoints < pointsToRedeem) {
    throw new ApiError(
      400,
      `Insufficient points. Available: ${balance.availablePoints}, Requested: ${pointsToRedeem}`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  // Calculate discount amount
  const discountAmount = pointsToRedeem * config.redemptionRate

  // Create redemption transaction
  await prisma.loyaltyPoint.create({
    data: {
      customerId,
      type: LoyaltyPointType.REDEEMED,
      points: -pointsToRedeem, // Negative for redemption
      balance: balance.availablePoints - pointsToRedeem,
      description: description || `Points redeemed for discount`,
    },
  })

  return {
    discountAmount,
    pointsUsed: pointsToRedeem,
  }
}

/**
 * Get points history for a customer
 */
export async function getCustomerPointsHistory(
  customerId: string,
  limit: number = 50,
  offset: number = 0
) {
  const [transactions, total] = await Promise.all([
    prisma.loyaltyPoint.findMany({
      where: { customerId },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.loyaltyPoint.count({ where: { customerId } }),
  ])

  return {
    transactions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  }
}

/**
 * Expire old points (should be run periodically)
 */
export async function expireOldPoints(): Promise<number> {
  const now = new Date()
  const expiredPoints = await prisma.loyaltyPoint.findMany({
    where: {
      expiresAt: { lt: now },
      type: { not: LoyaltyPointType.EXPIRED },
    },
  })

  let expiredCount = 0
  for (const point of expiredPoints) {
    if (point.points > 0) { // Only expire positive points
      await prisma.loyaltyPoint.create({
        data: {
          customerId: point.customerId,
          type: LoyaltyPointType.EXPIRED,
          points: -point.points,
          balance: 0, // Will be recalculated
          description: `Points expired (originally earned on ${point.createdAt.toISOString().split('T')[0]})`,
        },
      })
      expiredCount++
    }
  }

  return expiredCount
}
