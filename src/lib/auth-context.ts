import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../db/index.js'
import { getCompanyModules, type CompanyModulesShape } from './modules.js'

export type CompanyRow = {
  id: string
  name: string
  modules: CompanyModulesShape
  membershipRole?: string | null
}

/**
 * Get companies for a user (all active if superuser, else via company_members / user_roles).
 */
export async function getUserCompanies(
  userId: string,
  isSuperuser: boolean
): Promise<CompanyRow[]> {
  if (isSuperuser) {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    const result: CompanyRow[] = []
    for (const c of companies) {
      result.push({
        id: c.id,
        name: c.name,
        modules: await getCompanyModules(c.id),
        membershipRole: undefined,
      })
    }
    return result
  }

  const members = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeMembers = members.filter((m) => m.company.isActive)
  if (activeMembers.length > 0) {
    const result: CompanyRow[] = []
    for (const m of activeMembers) {
      result.push({
        id: m.company.id,
        name: m.company.name,
        modules: await getCompanyModules(m.company.id),
        membershipRole: m.membershipRole,
      })
    }
    return result
  }

  const userRoles = await prisma.userRoleAssignment.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeRoles = userRoles.filter((r) => r.company.isActive)
  const result: CompanyRow[] = []
  for (const r of activeRoles) {
    result.push({
      id: r.company.id,
      name: r.company.name,
      modules: await getCompanyModules(r.company.id),
      membershipRole: null,
    })
  }
  return result
}

/**
 * Pick selected company from list (by preferredCompanyId/shopflowPreferredCompanyId or first if single).
 */
export function selectCompanyForUser(
  companies: CompanyRow[],
  preferredCompanyId?: string | null
): { selectedCompany: Omit<CompanyRow, 'membershipRole'>; selectedMembershipRole: string | null } | null {
  if (companies.length === 0) return null
  if (preferredCompanyId && companies.some((c) => c.id === preferredCompanyId)) {
    const row = companies.find((c) => c.id === preferredCompanyId)!
    return {
      selectedCompany: { id: row.id, name: row.name, modules: row.modules },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  if (companies.length === 1) {
    const row = companies[0]
    return {
      selectedCompany: { id: row.id, name: row.name, modules: row.modules },
      selectedMembershipRole: row.membershipRole ?? null,
    }
  }
  return null
}

/**
 * Tipos de contexto (para tipado en rutas que usan request.companyId, etc.).
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
    companyId?: string
    membershipRole?: string | null
    storeId?: string | null
  }
}

const NO_ACCESS_MSG = 'No tienes acceso a ninguna empresa'

function getStoreIdFromHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers['x-store-id']
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

async function resolveCompanyId(decoded: {
  id: string
  companyId?: string
  isSuperuser?: boolean
}): Promise<{ companyId: string; membershipRole: string | null } | null> {
  const userId = decoded.id

  if (decoded.isSuperuser) {
    if (decoded.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: decoded.companyId, isActive: true },
      })
      if (company) return { companyId: decoded.companyId, membershipRole: null }
    }
    const first = await prisma.company.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    if (first) return { companyId: first.id, membershipRole: null }
    return null
  }

  const members = await prisma.companyMember.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: 'asc' } },
  })

  const activeMembers = members.filter((m) => m.company.isActive)
  let companies: { id: string; membershipRole: string | null }[] = activeMembers.map(
    (m) => ({ id: m.company.id, membershipRole: m.membershipRole })
  )

  if (companies.length === 0) {
    const userRoles = await prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { company: true },
      orderBy: { company: { name: 'asc' } },
    })
    companies = userRoles
      .filter((r) => r.company.isActive)
      .map((r) => ({ id: r.company.id, membershipRole: null }))
  }

  if (companies.length === 0) return null

  if (decoded.companyId && companies.some((c) => c.id === decoded.companyId)) {
    const row = companies.find((c) => c.id === decoded.companyId)!
    return { companyId: row.id, membershipRole: row.membershipRole }
  }

  const first = companies[0]
  return { companyId: first.id, membershipRole: first.membershipRole }
}

/**
 * PreHandler: resuelve empresa y membership (usa request.user de requireAuth).
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
 * Si viene X-Store-Id: para USER valida UserStore; para OWNER/ADMIN/superuser valida que la tienda sea de la empresa.
 */
export async function requireShopflowContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)

  const rawStoreId = getStoreIdFromHeader(request)
  if (!rawStoreId) {
    request.storeId = undefined
    return
  }

  const userId = request.user!.id
  const companyId = request.companyId!
  const membershipRole = request.membershipRole
  const isFullAccess =
    request.user!.isSuperuser ||
    membershipRole === 'OWNER' ||
    membershipRole === 'ADMIN'

  const store = await prisma.store.findFirst({
    where: { id: rawStoreId, companyId },
  })

  if (!store) {
    reply.code(403).send({
      success: false,
      error: 'No tienes acceso a esta tienda',
    })
    throw new Error('Store access denied')
  }

  if (!isFullAccess) {
    const userStore = await prisma.userStore.findUnique({
      where: { userId_storeId: { userId, storeId: rawStoreId } },
    })
    if (!userStore) {
      reply.code(403).send({
        success: false,
        error: 'No tienes acceso a esta tienda',
      })
      throw new Error('Store access denied')
    }
  }

  request.storeId = rawStoreId
}

/**
 * PreHandler para rutas Workify/TechServices: requireAuth + requireCompanyContext.
 */
export async function requireWorkifyContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireCompanyContext(request, reply)
}

export function contextFromRequest(request: FastifyRequest, includeStoreId: true): ShopflowContext
export function contextFromRequest(request: FastifyRequest, includeStoreId?: false): CompanyContext
export function contextFromRequest(
  request: FastifyRequest,
  includeStoreId = false
): CompanyContext | ShopflowContext {
  const base: CompanyContext = {
    userId: request.user!.id,
    companyId: request.companyId!,
    isSuperuser: request.user!.isSuperuser ?? false,
    membershipRole: request.membershipRole ?? null,
  }
  return includeStoreId ? { ...base, storeId: request.storeId ?? undefined } : base
}
