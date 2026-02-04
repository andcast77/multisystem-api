import { neon } from '@neondatabase/serverless'

let sqlInstance: ReturnType<typeof neon> | null = null

// Función para obtener la instancia de Neon (lazy initialization)
function getSql() {
  if (!sqlInstance) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined. Make sure it is set in your environment variables.')
    }
    sqlInstance = neon(databaseUrl)
  }
  return sqlInstance
}

// Exportar función tagged template con inicialización lazy
export const sql = ((strings: TemplateStringsArray, ...values: any[]) => {
  return getSql()(strings, ...values)
}) as ReturnType<typeof neon>

// Helper function to ensure SQL results are treated as arrays
export async function sqlQuery<T = any>(query: Promise<any>): Promise<T[]> {
  const result = await query
  // Handle FullQueryResults type (has .rows property)
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows as T[]
  }
  // Ensure result is always an array
  if (Array.isArray(result)) {
    return result as T[]
  }
  // If result is not an array, wrap it
  return result ? [result] as T[] : []
}

// Helper for parameterized queries with $1, $2 placeholders.
// Uses the Neon client's .query(string, params) (getSql() is the client).
export async function sqlUnsafe<T = any>(query: string, values?: any[]): Promise<T[]> {
  const client = getSql()
  const queryFn = (client as { query?: (q: string, v?: any[]) => Promise<any> }).query
  if (typeof queryFn !== 'function') {
    throw new Error('Neon client does not support .query(); use sql`...` tagged template for dynamic queries.')
  }
  const result = values ? await queryFn(query, values) : await queryFn(query)
  if (Array.isArray(result)) {
    return result as T[]
  }
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as any).rows)) {
    return (result as any).rows as T[]
  }
  return result ? [result] as T[] : []
}

// Helper para tipado de resultados (columnas según Prisma schema: firstName, lastName, isActive, isSuperuser)
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
export function userDisplayName(user: { firstName?: string; lastName?: string; email: string }): string {
  if (user.firstName != null && user.lastName != null) {
    const n = `${user.firstName} ${user.lastName}`.trim()
    if (n) return n
  }
  return user.email
}
