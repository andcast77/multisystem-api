import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { sql } from '../../db/neon.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export function verifyWorkifyToken(authHeader: string | undefined): { id: string; email: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { id: string; email: string }
    return decoded
  } catch {
    return null
  }
}

export async function getWorkifyContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; companyId: string } | null> {
  const decoded = verifyWorkifyToken(request.headers.authorization)
  if (!decoded) {
    reply.code(401).send({ success: false, error: 'Token de autenticación requerido' })
    return null
  }
  const userId = decoded.id

  try {
    const rows = (await sql`
      SELECT "companyId" FROM user_roles WHERE "userId" = ${userId} LIMIT 1
    `) as Array<{ companyId: string }>
    if (rows.length === 0) {
      reply.code(403).send({ success: false, error: 'Usuario sin empresa asignada' })
      return null
    }
    return { userId, companyId: rows[0].companyId }
  } catch {
    reply.code(500).send({ success: false, error: 'Error al verificar contexto' })
    return null
  }
}
