import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../auth.js'

export type ShopflowContext = {
  userId: string
  companyId: string
}

/**
 * Verifies Bearer token and requires companyId (Shopflow is always company-scoped).
 * Returns { userId, companyId } or sends 401/403 and returns null.
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
  return { userId: decoded.id, companyId: decoded.companyId }
}
