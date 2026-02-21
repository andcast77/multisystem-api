import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, type User, userDisplayName } from '../db/neon.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export type TokenPayload = {
  id: string
  email: string
  role: string
  companyId?: string
  isSuperuser?: boolean
  membershipRole?: string
}

// Helper function to generate JWT token (optionally with company context)
function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

// Helper function to verify JWT token (exported for use in other routes)
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
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
      companyId?: string
    }
  }>('/api/auth/login', async (request, reply) => {
    try {
      const { email, password, companyId: bodyCompanyId } = request.body

      if (!email || !password) {
        reply.code(400)
        return {
          success: false,
          error: 'Email y contraseña son requeridos',
        }
      }

      const users = (await sql`
        SELECT 
          id,
          email,
          password,
          role,
          "isActive",
          "isSuperuser",
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

      if (!user.isActive) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario inactivo',
        }
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        reply.code(401)
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

      type CompanyRow = { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean; membershipRole?: string }
      let companies: CompanyRow[] = []
      let selectedCompany: { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean } | null = null
      let selectedMembershipRole: string | null = null

      // Superuser: get all companies; token may include companyId if bodyCompanyId provided
      if (user.isSuperuser) {
        const allCompanies = (await sql`
          SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
          FROM companies
          WHERE "isActive" = true
          ORDER BY name
        `) as CompanyRow[]
        companies = allCompanies
        if (bodyCompanyId && allCompanies.some((c) => c.id === bodyCompanyId)) {
          selectedCompany = allCompanies.find((c) => c.id === bodyCompanyId) ?? null
        }
      } else {
        // Company members (company_members); fallback to user_roles
        try {
          const members = (await sql`
            SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled", cm."membershipRole" as "membershipRole"
            FROM company_members cm
            JOIN companies c ON c.id = cm."companyId"
            WHERE cm."userId" = ${user.id} AND c."isActive" = true
            ORDER BY c.name
          `) as CompanyRow[]
          if (members.length > 0) {
            companies = members
          }
        } catch {
          // company_members may not exist yet
        }
        if (companies.length === 0) {
          const ur = (await sql`
            SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled"
            FROM user_roles ur
            JOIN companies c ON c.id = ur."companyId"
            WHERE ur."userId" = ${user.id}
            ORDER BY c.name
          `) as CompanyRow[]
          companies = ur.map((r) => ({ ...r, membershipRole: undefined }))
        }
        if (bodyCompanyId && companies.some((c) => c.id === bodyCompanyId)) {
          const row = companies.find((c) => c.id === bodyCompanyId)
          if (row) {
            selectedCompany = row
            selectedMembershipRole = row.membershipRole ?? null
          }
        } else if (companies.length === 1) {
          selectedCompany = { id: companies[0].id, name: companies[0].name, workifyEnabled: companies[0].workifyEnabled, shopflowEnabled: companies[0].shopflowEnabled, technicalServicesEnabled: companies[0].technicalServicesEnabled }
          selectedMembershipRole = companies[0].membershipRole ?? null
        }
      }

      const tokenPayload: TokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperuser: user.isSuperuser ?? false,
      }
      if (selectedCompany) {
        tokenPayload.companyId = selectedCompany.id
        if (selectedMembershipRole) tokenPayload.membershipRole = selectedMembershipRole
      }
      const token = generateToken(tokenPayload)

      const data: {
        user: { id: string; email: string; name: string; role: string; isSuperuser?: boolean }
        token: string
        companyId?: string
        company?: { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }
        companies?: CompanyRow[]
      } = {
        user: {
          id: user.id,
          email: user.email,
          name: userDisplayName(user),
          role: user.role,
          isSuperuser: user.isSuperuser ?? false,
        },
        token,
      }
      if (selectedCompany) {
        data.companyId = selectedCompany.id
        data.company = selectedCompany
      }
      if (companies.length > 1 || user.isSuperuser) {
        data.companies = companies
      }

      return { success: true, data }
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

  // POST /api/auth/logout - Logout (client clears cookie)
  fastify.post('/api/auth/logout', async (_request, reply) => {
    reply.code(200)
    return { success: true }
  })

  // POST /api/auth/register - Register new company (Hub only). With companyName: creates company, user as owner, CompanyMember OWNER, role admin + user_role.
  fastify.post<{
    Body: {
      email: string
      password: string
      firstName?: string
      lastName?: string
      companyName?: string
      workifyEnabled?: boolean
      shopflowEnabled?: boolean
      technicalServicesEnabled?: boolean
    }
  }>('/api/auth/register', async (request, reply) => {
    try {
      const { email, password, firstName = '', lastName = '', companyName, workifyEnabled = true, shopflowEnabled = false, technicalServicesEnabled = false } = request.body

      if (!email || !password) {
        reply.code(400)
        return {
          success: false,
          error: 'Email y contraseña son requeridos',
        }
      }

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `)
      if (existing.length > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'Ya existe un usuario con este email',
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      if (companyName && companyName.trim()) {
        // Hub: create user (owner), company with ownerUserId + modules, CompanyMember OWNER, role admin + user_role
        try {
          const users = (await sqlQuery<User & { password?: string }>(sql`
            INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isSuperuser", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'USER', true, false, NOW(), NOW())
            RETURNING id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
          `)) as User[]
          if (users.length === 0) throw new Error('User insert failed')
          const user = users[0]

          const companyRows = (await sql`
            INSERT INTO companies (id, name, "ownerUserId", "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled", "isActive", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${companyName.trim()}, ${user.id}, ${workifyEnabled}, ${shopflowEnabled}, ${technicalServicesEnabled}, true, NOW(), NOW())
            RETURNING id
          `) as Array<{ id: string }>
          if (companyRows.length === 0) throw new Error('Company insert failed')
          const companyId = companyRows[0].id

          await sql`
            INSERT INTO company_members (id, "userId", "companyId", "membershipRole", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${user.id}, ${companyId}, 'OWNER', NOW(), NOW())
          `

          let roleRows = (await sql`
            SELECT id FROM roles WHERE name = 'admin' AND "companyId" = ${companyId} LIMIT 1
          `) as Array<{ id: string }>
          if (roleRows.length === 0) {
            roleRows = (await sql`
              INSERT INTO roles (id, name, "companyId", "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), 'admin', ${companyId}, NOW(), NOW())
              RETURNING id
            `) as Array<{ id: string }>
          }
          const roleId = roleRows[0].id

          await sql`
            INSERT INTO user_roles (id, "userId", "roleId", "companyId", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), ${user.id}, ${roleId}, ${companyId}, NOW(), NOW())
          `

          const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId,
            isSuperuser: false,
            membershipRole: 'OWNER',
          })

          return {
            success: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                name: userDisplayName(user),
                role: user.role,
                companyId,
              },
              token,
              company: { id: companyId, name: companyName.trim(), workifyEnabled, shopflowEnabled, technicalServicesEnabled },
            },
          }
        } catch (err) {
          fastify.log.error(err)
          reply.code(500)
          return {
            success: false,
            error: 'Error al registrar (tablas companies/company_members/roles/user_roles pueden no existir). Ejecuta migraciones.',
            message: err instanceof Error ? err.message : 'Error',
          }
        }
      }

      // No company: only user (legacy; normally users are created from Hub or from Usuarios tab)
      const users = (await sqlQuery<User>(sql`
        INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isSuperuser", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${email}, ${hashedPassword}, ${firstName}, ${lastName}, 'USER', true, false, NOW(), NOW())
        RETURNING id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
      `)) as User[]

      if (users.length === 0) {
        reply.code(500)
        return { success: false, error: 'Error al crear usuario' }
      }

      const user = users[0]
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
        error: 'Error al registrar usuario',
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

      // Get user from database (incl. empresa preferida Shopflow)
      const users = (await sql`
        SELECT 
          id,
          email,
          role,
          "isActive",
          "firstName",
          "lastName",
          "createdAt",
          "updatedAt",
          "shopflowPreferredCompanyId"
        FROM users
        WHERE id = ${decoded.id}
        LIMIT 1
      `) as (User & { shopflowPreferredCompanyId?: string | null })[]

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

      const row = user as Record<string, unknown>
      let preferredCompanyId: string | null =
        (row.shopflowPreferredCompanyId as string | null | undefined) ??
        (row.shopflowpreferredcompanyid as string | null | undefined) ??
        null

      // Si el usuario no tiene empresa preferida, asignar una en BD antes de responder
      if (!preferredCompanyId) {
        let defaultCompanyId: string | null = null
        if (decoded.isSuperuser) {
          const rows = (await sql`
            SELECT id FROM companies WHERE "isActive" = true ORDER BY name LIMIT 1
          `) as Array<{ id: string }>
          defaultCompanyId = rows[0]?.id ?? null
        } else {
          try {
            const rows = (await sql`
              SELECT c.id FROM company_members cm
              JOIN companies c ON c.id = cm."companyId"
              WHERE cm."userId" = ${decoded.id} AND c."isActive" = true
              ORDER BY c.name LIMIT 1
            `) as Array<{ id: string }>
            defaultCompanyId = rows[0]?.id ?? null
          } catch {
            const rows = (await sql`
              SELECT c.id FROM user_roles ur
              JOIN companies c ON c.id = ur."companyId"
              WHERE ur."userId" = ${decoded.id} AND c."isActive" = true
              ORDER BY c.name LIMIT 1
            `) as Array<{ id: string }>
            defaultCompanyId = rows[0]?.id ?? null
          }
        }
        if (defaultCompanyId) {
          await sql`
            UPDATE users SET "shopflowPreferredCompanyId" = ${defaultCompanyId}
            WHERE id = ${decoded.id}
          `
          preferredCompanyId = defaultCompanyId
        }
      }

      let company: { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean } | null = null
      let responseCompanyId: string | undefined = decoded.companyId

      if (decoded.companyId) {
        const rows = (await sql`
          SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
          FROM companies WHERE id = ${decoded.companyId} AND "isActive" = true LIMIT 1
        `) as Array<{ id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }>
        company = rows[0] ?? null
      }

      // Si la respuesta quedaría sin companyId válido (token sin company, company inactiva/inexistente),
      // usar empresa preferida (o asignar una en BD) y sincronizar en la respuesta antes de responder.
      if (!responseCompanyId || !company) {
        const effectiveId = preferredCompanyId
        if (effectiveId) {
          responseCompanyId = effectiveId
          const rows = (await sql`
            SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
            FROM companies WHERE id = ${effectiveId} AND "isActive" = true LIMIT 1
          `) as Array<{ id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }>
          company = rows[0] ?? null
        }
      }

      return {
        success: true,
        data: {
          ...user,
          name: userDisplayName(user),
          companyId: responseCompanyId,
          preferredCompanyId: preferredCompanyId ?? undefined,
          membershipRole: decoded.membershipRole,
          isSuperuser: decoded.isSuperuser,
          company: company ?? undefined,
        },
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

  // GET /api/auth/companies - List companies for authenticated user (or all if superuser)
  fastify.get<{
    Headers: { authorization?: string }
  }>('/api/auth/companies', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }
      const decoded = verifyToken(authHeader.substring(7))
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      type CompanyRow = { id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean; membershipRole?: string }
      let companies: CompanyRow[] = []

      if (decoded.isSuperuser) {
        companies = (await sql`
          SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
          FROM companies
          WHERE "isActive" = true
          ORDER BY name
        `) as CompanyRow[]
      } else {
        try {
          companies = (await sql`
            SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled", cm."membershipRole" as "membershipRole"
            FROM company_members cm
            JOIN companies c ON c.id = cm."companyId"
            WHERE cm."userId" = ${decoded.id} AND c."isActive" = true
            ORDER BY c.name
          `) as CompanyRow[]
        } catch {
          const ur = (await sql`
            SELECT c.id, c.name, c."workifyEnabled", c."shopflowEnabled", c."technicalServicesEnabled"
            FROM user_roles ur
            JOIN companies c ON c.id = ur."companyId"
            WHERE ur."userId" = ${decoded.id} AND c."isActive" = true
            ORDER BY c.name
          `) as CompanyRow[]
          companies = ur
        }
      }

      return { success: true, data: companies }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // POST /api/auth/context - Set company context (return new token with companyId)
  fastify.post<{
    Headers: { authorization?: string }
    Body: { companyId: string }
  }>('/api/auth/context', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401)
        return { success: false, error: 'Token de autenticación requerido' }
      }
      const decoded = verifyToken(authHeader.substring(7))
      if (!decoded) {
        reply.code(401)
        return { success: false, error: 'Token inválido o expirado' }
      }

      const { companyId } = request.body
      if (!companyId) {
        reply.code(400)
        return { success: false, error: 'companyId es requerido' }
      }

      let allowed = false
      let membershipRole: string | null = null

      if (decoded.isSuperuser) {
        const rows = (await sql`
          SELECT id FROM companies WHERE id = ${companyId} AND "isActive" = true LIMIT 1
        `) as Array<{ id: string }>
        allowed = rows.length > 0
      } else {
        try {
          const rows = (await sql`
            SELECT "membershipRole" FROM company_members
            WHERE "userId" = ${decoded.id} AND "companyId" = ${companyId} LIMIT 1
          `) as Array<{ membershipRole: string }>
          if (rows.length > 0) {
            allowed = true
            membershipRole = rows[0].membershipRole
          }
        } catch {
          const ur = (await sql`
            SELECT 1 FROM user_roles WHERE "userId" = ${decoded.id} AND "companyId" = ${companyId} LIMIT 1
          `) as Array<{ '?column?': number }>
          allowed = ur.length > 0
        }
      }

      if (!allowed) {
        reply.code(403)
        return { success: false, error: 'No tienes acceso a esta empresa' }
      }

      const token = generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        companyId,
        isSuperuser: decoded.isSuperuser,
        membershipRole: membershipRole ?? undefined,
      })

      await sql`
        UPDATE users SET "shopflowPreferredCompanyId" = ${companyId}
        WHERE id = ${decoded.id}
      `

      const companyRows = (await sql`
        SELECT id, name, "workifyEnabled", "shopflowEnabled", "technicalServicesEnabled"
        FROM companies WHERE id = ${companyId} AND "isActive" = true LIMIT 1
      `) as Array<{ id: string; name: string; workifyEnabled: boolean; shopflowEnabled: boolean; technicalServicesEnabled: boolean }>

      return {
        success: true,
        data: {
          token,
          companyId,
          company: companyRows[0] ?? null,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
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
