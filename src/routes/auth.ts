import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, type User, userDisplayName } from '../db/neon.js'
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

      // Find user by email (schema: firstName, lastName, isActive)
      const users = (await sql`
        SELECT 
          id,
          email,
          password,
          role,
          "isActive",
          "firstName",
          "lastName"
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
      if (!user.isActive) {
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
            name: userDisplayName(user),
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

      // Get user from database (schema: firstName, lastName, isActive)
      const users = (await sql`
        SELECT 
          id,
          email,
          role,
          "isActive",
          "firstName",
          "lastName",
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

      if (!user.isActive) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario inactivo',
        }
      }

      return {
        success: true,
        data: { ...user, name: userDisplayName(user) },
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
        SELECT id, "isActive"
        FROM users
        WHERE id = ${decoded.id}
        LIMIT 1
      `) as Array<{ id: string; isActive: boolean }>

      if (users.length === 0 || !users[0].isActive) {
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

  // POST /api/auth/sessions - Create session (store session token)
  fastify.post<{
    Body: {
      userId: string
      sessionToken: string
      ipAddress?: string
      userAgent?: string
      expiresAt: string
    }
  }>('/api/auth/sessions', async (request, reply) => {
    try {
      const { userId, sessionToken, ipAddress, userAgent, expiresAt } = request.body
      if (!userId || !sessionToken) {
        reply.code(400)
        return { success: false, error: 'userId y sessionToken son requeridos' }
      }
      const user = await sqlQuery<{ id: string; role: string }>(sql`
        SELECT id, role FROM users WHERE id = ${userId} AND "isActive" = true LIMIT 1
      `)
      if (user.length === 0) {
        reply.code(404)
        return { success: false, error: 'Usuario no encontrado' }
      }
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM sessions WHERE "userId" = ${userId} LIMIT 1
      `)
      if (existing.length > 0 && user[0].role !== 'ADMIN' && user[0].role !== 'SUPERADMIN') {
        reply.code(409)
        return { success: false, error: 'Concurrent sessions not allowed for this role' }
      }
      await sqlQuery(sql`
        INSERT INTO sessions ("userId", "sessionToken", "ipAddress", "userAgent", "expiresAt")
        VALUES (${userId}, ${sessionToken}, ${ipAddress ?? null}, ${userAgent ?? null}, ${expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)})
      `)
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // GET /api/auth/sessions/validate?token= - Validate session token
  fastify.get<{ Querystring: { token: string } }>('/api/auth/sessions/validate', async (request, reply) => {
    try {
      const { token } = request.query
      if (!token) {
        reply.code(400)
        return { success: false, data: { valid: false } }
      }
      const rows = await sqlQuery<any>(sql`
        SELECT id FROM sessions WHERE "sessionToken" = ${token} AND "expiresAt" > NOW() LIMIT 1
      `)
      return { success: true, data: { valid: rows.length > 0 } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, data: { valid: false } }
    }
  })

  // GET /api/auth/sessions?userId= - List user sessions
  fastify.get<{ Querystring: { userId: string } }>('/api/auth/sessions', async (request, reply) => {
    try {
      const { userId } = request.query
      if (!userId) {
        reply.code(400)
        return { success: false, error: 'userId es requerido' }
      }
      const rows = await sqlQuery<any>(sql`
        SELECT id, "userId", "sessionToken", "ipAddress", "userAgent", "expiresAt", "createdAt"
        FROM sessions WHERE "userId" = ${userId} AND "expiresAt" > NOW() ORDER BY "createdAt" DESC
      `)
      return { success: true, data: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // DELETE /api/auth/sessions/:token?userId= - Terminate one session
  fastify.delete<{ Params: { token: string }; Querystring: { userId?: string } }>(
    '/api/auth/sessions/:token',
    async (request, reply) => {
      try {
        const { token } = request.params
        const { userId } = request.query
        const decoded = decodeURIComponent(token)
        const existing = await sqlQuery<any>(sql`
          SELECT id, "userId" FROM sessions WHERE "sessionToken" = ${decoded} LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Session not found' }
        }
        if (userId && existing[0].userId !== userId) {
          reply.code(403)
          return { success: false, error: 'Access denied' }
        }
        await sqlQuery(sql`DELETE FROM sessions WHERE "sessionToken" = ${decoded}`)
        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error' }
      }
    }
  )

  // POST /api/auth/sessions/terminate-others - Terminate all sessions except current
  fastify.post<{
    Body: { userId: string; currentSessionToken: string }
  }>('/api/auth/sessions/terminate-others', async (request, reply) => {
    try {
      const { userId, currentSessionToken } = request.body
      if (!userId || !currentSessionToken) {
        reply.code(400)
        return { success: false, error: 'userId y currentSessionToken son requeridos' }
      }
      await sqlQuery(sql`
        DELETE FROM sessions WHERE "userId" = ${userId} AND "sessionToken" != ${currentSessionToken}
      `)
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // POST /api/auth/sessions/cleanup-expired - Delete expired sessions
  fastify.post('/api/auth/sessions/cleanup-expired', async (request, reply) => {
    try {
      const result = await sqlQuery<{ count: string }>(sql`
        WITH deleted AS (DELETE FROM sessions WHERE "expiresAt" <= NOW() RETURNING id)
        SELECT COUNT(*) as count FROM deleted
      `)
      const count = parseInt(result[0]?.count || '0')
      return { success: true, data: { count } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // PUT /api/auth/users/:userId/concurrent-sessions - Update concurrent session policy (no-op if not stored in DB)
  fastify.put<{
    Params: { userId: string }
    Body: { allowConcurrentSessions?: boolean }
  }>('/api/auth/users/:userId/concurrent-sessions', async (request, reply) => {
    try {
      const { userId } = request.params
      const user = await sqlQuery<{ id: string }>(sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`)
      if (user.length === 0) {
        reply.code(404)
        return { success: false, error: 'Usuario no encontrado' }
      }
      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })
}
