// Funciones de autenticación que usan Prisma - Solo para API routes (servidor)
import bcrypt from 'bcrypt'
import jwt, { type SignOptions } from 'jsonwebtoken'
import type { User, UserRole } from '@prisma/client'
import type { UserWithRole, LoginCredentials } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions
  )
}

// Funciones que usan Prisma - Solo disponibles en API routes (servidor)
// Estas funciones deben moverse a la API unificada en el futuro
export async function authenticate(
  credentials: LoginCredentials
): Promise<UserWithRole | null> {
  // Solo ejecutar en servidor
  if (typeof window !== 'undefined') {
    throw new Error('authenticate solo puede usarse en el servidor. Usa la API /api/auth/login')
  }

  // Dynamic import para evitar que Next.js empaquete Prisma para el cliente
  const { prisma } = await import('./prisma')
  
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  })

  if (!user || !user.active) {
    return null
  }

  const isValid = await verifyPassword(credentials.password, user.password)
  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
  }
}

export async function getUserById(id: string): Promise<UserWithRole | null> {
  // Solo ejecutar en servidor
  if (typeof window !== 'undefined') {
    throw new Error('getUserById solo puede usarse en el servidor. Usa la API /api/auth/me')
  }

  // Dynamic import para evitar que Next.js empaquete Prisma para el cliente
  const { prisma } = await import('./prisma')
  
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  })

  return user
}
