import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

// Crear instancia de Neon (se reutiliza automáticamente)
export const sql = neon(process.env.DATABASE_URL)

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
