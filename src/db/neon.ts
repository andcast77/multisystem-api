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

// Helper function for unsafe queries with parameter substitution
export async function sqlUnsafe<T = any>(query: string, values?: any[]): Promise<T[]> {
  // Use sql.unsafe directly - Neon supports this signature
  const result = values ? await (sql.unsafe as any)(query, values) : await (sql.unsafe as any)(query)
  if (Array.isArray(result)) {
    return result as T[]
  }
  return result ? [result] as T[] : []
}

// Helper para tipado de resultados
export type User = {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
  active: boolean
  createdAt: Date
  updatedAt: Date
}
