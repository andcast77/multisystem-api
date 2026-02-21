import { FastifyReply, FastifyRequest } from 'fastify'
import { verifyToken } from '../auth.js'
import { sql } from '../../db/neon.js'

export type TechServicesContext = {
  userId: string
  companyId: string
  membershipRole?: string
  isSuperuser?: boolean
}

export async function getTechServicesContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<TechServicesContext | null> {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ success: false, error: 'Token de autenticacion requerido' })
    return null
  }

  const decoded = verifyToken(authHeader.substring(7))
  if (!decoded) {
    reply.code(401).send({ success: false, error: 'Token invalido o expirado' })
    return null
  }

  if (!decoded.companyId) {
    reply.code(403).send({
      success: false,
      error: 'Selecciona una empresa para usar servicios tecnicos',
    })
    return null
  }

  try {
    const rows = (await sql`
      SELECT id, "technicalServicesEnabled"
      FROM companies
      WHERE id = ${decoded.companyId} AND "isActive" = true
      LIMIT 1
    `) as Array<{ id: string; technicalServicesEnabled: boolean }>

    if (rows.length === 0) {
      reply.code(403).send({ success: false, error: 'Empresa no encontrada o inactiva' })
      return null
    }

    if (!rows[0].technicalServicesEnabled && !decoded.isSuperuser) {
      reply.code(403).send({
        success: false,
        error: 'El modulo de servicios tecnicos no esta activo para esta empresa',
      })
      return null
    }

    return {
      userId: decoded.id,
      companyId: decoded.companyId,
      membershipRole: decoded.membershipRole,
      isSuperuser: decoded.isSuperuser ?? false,
    }
  } catch {
    reply.code(500).send({ success: false, error: 'Error al verificar contexto' })
    return null
  }
}
