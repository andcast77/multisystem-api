import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'
import { getConfig } from './config.js'

export type TokenPayload = {
  id: string
  email: string
  role: string
  companyId?: string
  isSuperuser?: boolean
  membershipRole?: string
}

function getJwtConfig() {
  const config = getConfig()
  return {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  }
}

export function generateToken(payload: TokenPayload): string {
  const { secret, expiresIn } = getJwtConfig()
  return jwt.sign(payload, secret, { expiresIn })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const { secret } = getJwtConfig()
    return jwt.verify(token, secret) as TokenPayload
  } catch {
    return null
  }
}

const UNAUTHORIZED_MSG = 'Token de autenticación requerido'
const INVALID_TOKEN_MSG = 'Token inválido o expirado'

function getBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload
  }
}

/**
 * Fastify preHandler: requires valid JWT and attaches request.user.
 * On failure sends 401 and throws so the route handler is not executed.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = getBearerToken(request)
  if (!token) {
    reply.code(401).send({ success: false, error: UNAUTHORIZED_MSG })
    throw new Error('Unauthorized')
  }
  const decoded = verifyToken(token)
  if (!decoded) {
    reply.code(401).send({ success: false, error: INVALID_TOKEN_MSG })
    throw new Error('Invalid token')
  }
  request.user = decoded
}
