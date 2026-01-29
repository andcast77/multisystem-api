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
