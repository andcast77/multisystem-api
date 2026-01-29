import { FastifyInstance } from 'fastify'
import { sql, type User } from '../db/neon.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Helper function to generate JWT token
function generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  )
}

// Helper function to verify JWT token
function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string }
    return decoded
  } catch (error) {
    return null
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login - Login user
  fastify.post<{
    Body: {
      email: string
      password: string
    }
  }>('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body

      if (!email || !password) {
        reply.code(400)
        return {
          success: false,
          error: 'Email y contraseña son requeridos',
        }
      }

      // Find user by email
      const users = (await sql`
        SELECT 
          id,
          email,
          password,
          name,
          role,
          active
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `) as Array<User & { password: string }>

      if (users.length === 0) {
        reply.code(401)
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

      const user = users[0]

      // Check if user is active
      if (!user.active) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario inactivo',
        }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        reply.code(401)
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
      })

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al autenticar usuario',
        message: errorMessage,
      }
    }
  })

  // GET /api/auth/me - Get current user
  fastify.get<{
    Headers: {
      authorization?: string
    }
  }>('/api/auth/me', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return {
          success: false,
          error: 'Token de autenticación requerido',
        }
      }

      const token = authHeader.substring(7)
      const decoded = verifyToken(token)

      if (!decoded) {
        reply.code(401)
        return {
          success: false,
          error: 'Token inválido o expirado',
        }
      }

      // Get user from database
      const users = (await sql`
        SELECT 
          id,
          email,
          name,
          role,
          active,
          "createdAt",
          "updatedAt"
        FROM users
        WHERE id = ${decoded.id}
        LIMIT 1
      `) as User[]

      if (users.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      const user = users[0]

      if (!user.active) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario inactivo',
        }
      }

      return {
        success: true,
        data: user,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener usuario',
        message: errorMessage,
      }
    }
  })

  // POST /api/auth/verify - Verify token
  fastify.post<{
    Body: {
      token: string
    }
  }>('/api/auth/verify', async (request, reply) => {
    try {
      const { token } = request.body

      if (!token) {
        reply.code(400)
        return {
          success: false,
          error: 'Token es requerido',
        }
      }

      const decoded = verifyToken(token)

      if (!decoded) {
        reply.code(401)
        return {
          success: false,
          error: 'Token inválido o expirado',
        }
      }

      // Verify user still exists and is active
      const users = (await sql`
        SELECT id, active
        FROM users
        WHERE id = ${decoded.id}
        LIMIT 1
      `) as Array<{ id: string; active: boolean }>

      if (users.length === 0 || !users[0].active) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario no encontrado o inactivo',
        }
      }

      return {
        success: true,
        data: {
          valid: true,
          user: decoded,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al verificar token',
        message: errorMessage,
      }
    }
  })
}
