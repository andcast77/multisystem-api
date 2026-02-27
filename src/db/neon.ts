/**
 * Compatibility layer: SQL raw queries via Prisma (replaces Neon).
 * Use prisma from db/index for model operations; sql/sqlQuery/sqlUnsafe for legacy raw queries.
 * Prefer Prisma models over raw SQL when migrating routes.
 */
import { prisma } from './index.js'
import { Prisma } from '@multisystem/database'

export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  prisma.$queryRaw(Prisma.sql(strings, ...values))) as typeof prisma.$queryRaw

export async function sqlQuery<T = any>(query: Promise<unknown>): Promise<T[]> {
  const result = await query
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown[] }).rows)) {
    return (result as { rows: T[] }).rows
  }
  return result ? ([result] as T[]) : []
}

export async function sqlUnsafe<T = any>(query: string, values?: unknown[]): Promise<T[]> {
  const result = values?.length
    ? await prisma.$queryRawUnsafe(query, ...values)
    : await prisma.$queryRawUnsafe(query)
  if (Array.isArray(result)) return result as T[]
  return result ? ([result] as T[]) : []
}

export type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
  isActive: boolean
  isSuperuser?: boolean
  createdAt: Date
  updatedAt: Date
}

/** Nombre para respuestas API (firstName + lastName o email) */
export function userDisplayName(user: {
  firstName?: string
  lastName?: string
  email: string
}): string {
  if (user.firstName != null && user.lastName != null) {
    const n = `${user.firstName} ${user.lastName}`.trim()
    if (n) return n
  }
  return user.email
}
