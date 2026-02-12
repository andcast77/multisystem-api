import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../auth.js'

export type ShopflowContext = {
  userId: string
  companyId: string
  /** OWNER | ADMIN = can see all stores; USER = restricted to user_stores */
  membershipRole?: string
  /** isSuperuser = can see all stores */
  isSuperuser?: boolean
  /** Current store from header X-Store-Id; required for USER when listing sales/reports */
  storeId?: string | null
}

/**
 * Verifies Bearer token and requires companyId (Shopflow is always company-scoped).
 * Reads X-Store-Id header as current store (optional; used for USER scope).
 * Returns { userId, companyId, membershipRole?, storeId? } or sends 401/403 and returns null.
 */
export async function getShopflowContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ShopflowContext | null> {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ success: false, error: 'Token de autenticación requerido' })
    return null
  }
  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    reply.code(401).send({ success: false, error: 'Token inválido o expirado' })
    return null
  }
  if (!decoded.companyId) {
    reply.code(403).send({
      success: false,
      error: 'Selecciona una empresa para usar Shopflow (contexto de empresa requerido)',
    })
    return null
  }
  const storeIdHeader = request.headers['x-store-id']
  const storeId =
    typeof storeIdHeader === 'string' && storeIdHeader.trim() ? storeIdHeader.trim() : null
  return {
    userId: decoded.id,
    companyId: decoded.companyId,
    membershipRole: decoded.membershipRole,
    isSuperuser: decoded.isSuperuser ?? false,
    storeId: storeId ?? undefined,
  }
}
