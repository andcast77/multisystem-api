import { FastifyRequest, FastifyReply } from 'fastify'
import { sql } from '../db/neon.js'

export type CompanyRow = {
  id: string
  name: string
  workifyEnabled: boolean
  shopflowEnabled: boolean
  technicalServicesEnabled: boolean
  membershipRole?: string | null
}

/**
 * Get companies for a user (all active if superuser, else via company_members / user_roles).
 */
export async function getUserCompanies(userId: string, isSuperuser: boolean): Promise<CompanyRow[]> {
  if (isSuperuser) {
    return (await sql`
      SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
      FROM companies
      WHERE "isActive" = true
      ORDER BY name
    `) as CompanyRow[]
  }
  let companies: CompanyRow[] = []
  try {
    companies = (await sql`
      SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled", cm."membershipRole" as "membershipRole"
      FROM company_members cm
      JOIN companies c ON c.id = cm."companyId"
      WHERE cm."userId" = ${userId} AND c."isActive" = true
      ORDER BY c.name
    `) as CompanyRow[]
  } catch {
    // company_members may not exist
  }
  if (companies.length === 0) {
    try {
      const ur = (await sql`
        SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled"
        FROM user_roles ur
        JOIN companies c ON c.id = ur."companyId"
        WHERE ur."userId" = ${userId}
        ORDER BY c.name
      `) as CompanyRow[]
      companies = ur.map((r) => ({ ...r, membershipRole: undefined }))
    } catch {
      // user_roles may not exist
    }
  }
  return companies
}

/**
 * Pick selected company from list (by preferredCompanyId or first if single).
 */
export function selectCompanyForUser(
  companies: CompanyRow[],
  preferredCompanyId?: string | null
): { selectedCompany: Omit<CompanyRow, 'membershipRole'>; selectedMembershipRole: string | null } | null {
  if (companies.length === 0) return null
  if (preferredCompanyId && companies.some((c) => c.id === preferredCompanyId)) {
    const row = companies.find((c) => c.id === preferredCompanyId)!
    return {
      selectedCompany: {
        id: row.id,
        name: row.name,
        workifyEnabled: row.workifyEnabled,
        shopflowEnabled: row.shopflowEnabled,
        technicalServicesEnabled: row.technicalServicesEnabled,
      },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  if (companies.length === 1) {
    const row = companies[0]
    return {
      selectedCompany: {
        id: row.id,
        name: row.name,
        workifyEnabled: row.workifyEnabled,
        shopflowEnabled: row.shopflowEnabled,
        technicalServicesEnabled: row.technicalServicesEnabled,
      },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  return null
}

/**
 * Tipos de contexto (para tipado en rutas que usan request.companyId, etc.).
 * El contexto se expone vía request; estos tipos documentan la forma.
 */
export type CompanyContext = {
  userId: string
  companyId: string
  isSuperuser: boolean
  membershipRole: string | null
}

export type ShopflowContext = CompanyContext & { storeId?: string | null }
export type WorkifyContext = CompanyContext

declare module 'fastify' {
  interface FastifyRequest {
    /** Empresa resuelta (requiere requireShopflowContext o requireWorkifyContext tras requireAuth). */
    companyId?: string
    membershipRole?: string | null
    /** Solo en rutas Shopflow (header X-Store-Id). */
    storeId?: string | null
  }
}

const NO_ACCESS_MSG = 'No tienes acceso a ninguna empresa'

function getStoreIdFromHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers['x-store-id']
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

async function resolveCompanyId(decoded: { id: string; companyId?: string; isSuperuser?: boolean }): Promise<{
  companyId: string
  membershipRole: string | null
} | null> {
  const userId = decoded.id

  if (decoded.isSuperuser) {
    if (decoded.companyId) {
      const rows = (await sql`
        SELECT id FROM companies WHERE id = ${decoded.companyId} AND "isActive" = true LIMIT 1
      `) as Array<{ id: string }>
      if (rows.length > 0) {
        return { companyId: decoded.companyId, membershipRole: null }
      }
    }
    const rows = (await sql`
      SELECT id FROM companies WHERE "isActive" = true ORDER BY name LIMIT 1
    `) as Array<{ id: string }>
    if (rows.length > 0) return { companyId: rows[0].id, membershipRole: null }
    return null
  }

  type Row = { id: string; membershipRole: string | null }
  let companies: Row[] = []

  try {
    const members = (await sql`
      SELECT c.id, cm."membershipRole" as "membershipRole"
      FROM company_members cm
      JOIN companies c ON c.id = cm."companyId"
      WHERE cm."userId" = ${userId} AND c."isActive" = true
      ORDER BY c.name
    `) as Row[]
    if (members.length > 0) companies = members
  } catch {
    // company_members may not exist
  }

  if (companies.length === 0) {
    try {
      const ur = (await sql`
        SELECT c.id
        FROM user_roles ur
        JOIN companies c ON c.id = ur."companyId"
        WHERE ur."userId" = ${userId} AND c."isActive" = true
        ORDER BY c.name
      `) as Array<{ id: string }>
      companies = ur.map((r) => ({ id: r.id, membershipRole: null }))
    } catch {
      // user_roles may not exist
    }
  }

  if (companies.length === 0) return null

  if (decoded.companyId && companies.some((c) => c.id === decoded.companyId)) {
    const row = companies.find((c) => c.id === decoded.companyId)!
    return { companyId: row.id, membershipRole: row.membershipRole ?? null }
  }

  const first = companies[0]
  return { companyId: first.id, membershipRole: first.membershipRole ?? null }
}

/**
 * PreHandler: resuelve empresa y membership (usa request.user de requireAuth).
 * Debe ir después de requireAuth. En fallo envía 401 y lanza.
 */
export async function requireCompanyContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user
  if (!user) {
    reply.code(401).send({ success: false, error: 'Token de autenticación requerido' })
    throw new Error('Unauthorized')
  }
  const resolved = await resolveCompanyId(user)
  if (!resolved) {
    reply.code(401).send({ success: false, error: NO_ACCESS_MSG })
    throw new Error('No company access')
  }
  request.companyId = resolved.companyId
  request.membershipRole = resolved.membershipRole
}

/**
 * PreHandler para rutas Shopflow: requireAuth + requireCompanyContext + X-Store-Id.
 * Orden: [requireAuth, requireShopflowContext]. Deja en request: user, companyId, membershipRole, storeId.
 */
export async function requireShopflowContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)
  request.storeId = getStoreIdFromHeader(request) ?? undefined
}

/**
 * PreHandler para rutas Workify/TechServices: requireAuth + requireCompanyContext.
 * Orden: [requireAuth, requireWorkifyContext]. Deja en request: user, companyId, membershipRole.
 */
export async function requireWorkifyContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)
}

/**
 * Construye objeto de contexto desde request (tras requireAuth + requireShopflowContext o requireWorkifyContext).
 * Shopflow: pass true para incluir storeId (retorna ShopflowContext).
 */
export function contextFromRequest(request: FastifyRequest, includeStoreId: true): ShopflowContext
export function contextFromRequest(request: FastifyRequest, includeStoreId?: false): CompanyContext
export function contextFromRequest(request: FastifyRequest, includeStoreId = false): CompanyContext | ShopflowContext {
  const base: CompanyContext = {
    userId: request.user!.id,
    companyId: request.companyId!,
    isSuperuser: request.user!.isSuperuser ?? false,
    membershipRole: request.membershipRole ?? null,
  }
  return includeStoreId ? { ...base, storeId: request.storeId ?? undefined } : base
}
