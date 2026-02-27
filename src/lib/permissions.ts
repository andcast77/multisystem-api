import type { TokenPayload } from './auth.js'

export type DecodedUser = Pick<TokenPayload, 'id' | 'companyId' | 'isSuperuser' | 'membershipRole'>

/**
 * User can access the given company (is superuser or has companyId matching).
 */
export function canAccessCompany(decoded: DecodedUser, companyId: string): boolean {
  if (decoded.isSuperuser) return true
  return decoded.companyId === companyId
}

/**
 * User is owner of the current company context.
 */
export function isOwner(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER'
}

/**
 * User can manage company settings (owner or admin).
 */
export function canManageCompany(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
}

/**
 * User can manage company members (owner or admin).
 */
export function canManageMembers(decoded: { membershipRole?: string; isSuperuser?: boolean }): boolean {
  if (decoded.isSuperuser) return true
  return decoded.membershipRole === 'OWNER' || decoded.membershipRole === 'ADMIN'
}
