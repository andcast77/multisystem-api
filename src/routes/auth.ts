import { FastifyInstance } from 'fastify'
import { prisma } from '../db/index.js'
import bcrypt from 'bcryptjs'
import { generateToken, requireAuth, userDisplayName, verifyToken, type TokenPayload } from '../lib/auth.js'
import { getUserCompanies, selectCompanyForUser, type CompanyRow } from '../lib/auth-context.js'
import { getCompanyModules } from '../lib/modules.js'
import { sendBadRequest, sendForbidden, sendServerError } from '../lib/errors.js'

export type { TokenPayload } from '../lib/auth.js'

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login - Login user
  fastify.post<{
    Body: {
      email: string
      password: string
      companyId?: string
    }
  }>('/api/auth/login', {
    schema: {
      description: 'Autentica a un usuario y devuelve un token JWT.',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
          password: { type: 'string', description: 'Contraseña', example: '123456' },
          companyId: { type: 'string', description: 'ID de la empresa (opcional)', example: 'uuid-empresa' }
        }
      },
      response: {
        200: {
          description: 'Autenticación exitosa',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' },
                    email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
                    name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' },
                    role: { type: 'string', description: 'Rol', example: 'USER' },
                    isSuperuser: { type: 'boolean', description: 'Superusuario', example: false }
                  }
                },
                token: { type: 'string', description: 'Token JWT', example: 'jwt-token' },
                companyId: { type: 'string', description: 'ID de la empresa', example: 'uuid-empresa' },
                company: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'uuid-empresa' },
                    name: { type: 'string', example: 'Empresa S.A.' },
                    modules: {
                      type: 'object',
                      properties: {
                        workify: { type: 'boolean', example: true },
                        shopflow: { type: 'boolean', example: false },
                        techservices: { type: 'boolean', example: true }
                      }
                    }
                  }
                },
                companies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'uuid-empresa' },
                      name: { type: 'string', example: 'Empresa S.A.' },
                      modules: {
                        type: 'object',
                        properties: {
                          workify: { type: 'boolean', example: true },
                          shopflow: { type: 'boolean', example: false },
                          techservices: { type: 'boolean', example: true }
                        }
                      },
                      membershipRole: { type: 'string', example: 'OWNER' }
                    }
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Email y contraseña son requeridos',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Email y contraseña son requeridos' }
          }
        },
        401: {
          description: 'Credenciales inválidas o usuario inactivo',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Credenciales inválidas' }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al autenticar usuario' },
            message: { type: 'string', example: 'Error desconocido' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password, companyId: bodyCompanyId } = request.body

      if (!email || !password) {
        return sendBadRequest(reply, 'Email y contraseña son requeridos')
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          isActive: true,
          isSuperuser: true,
          firstName: true,
          lastName: true,
          shopflowPreferredCompanyId: true,
        },
      })

      if (!user) {
        reply.code(401)
        return {
          success: false,
          error: 'Credenciales inválidas',
        }
      }

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

      const companies = await getUserCompanies(user.id, user.isSuperuser ?? false)
      const preferredCompanyId = bodyCompanyId ?? user.shopflowPreferredCompanyId ?? undefined
      const selected = selectCompanyForUser(companies, preferredCompanyId)
      const selectedCompany = selected?.selectedCompany ?? null
      const selectedMembershipRole = selected?.selectedMembershipRole ?? null

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
        company?: { id: string; name: string; modules: { workify: boolean; shopflow: boolean; techservices: boolean } }
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
      return sendServerError(reply, error, fastify.log, 'Error al autenticar usuario')
    }
  })

  // POST /api/auth/logout - Logout (client clears cookie)
  fastify.post('/api/auth/logout', {
    schema: {
      description: 'Cierra la sesión del usuario (el cliente debe limpiar el token).',
      tags: ['Auth'],
      response: {
        200: {
          description: 'Logout exitoso',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true }
          }
        }
      }
    }
  }, async (_request, reply) => {
    reply.code(200);
    return { success: true };
  });

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
  }>('/api/auth/register', {
    schema: {
      description: 'Registra un nuevo usuario y empresa (solo Hub).',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
          password: { type: 'string', description: 'Contraseña', example: '123456' },
          firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
          lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
          companyName: { type: 'string', description: 'Nombre de la empresa', example: 'Empresa S.A.' },
          workifyEnabled: { type: 'boolean', description: 'Módulo Workify habilitado', example: true },
          shopflowEnabled: { type: 'boolean', description: 'Módulo Shopflow habilitado', example: false },
          technicalServicesEnabled: { type: 'boolean', description: 'Módulo Tech Services habilitado', example: true }
        }
      },
      response: {
        200: {
          description: 'Registro exitoso',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'uuid-123' },
                    email: { type: 'string', example: 'usuario@dominio.com' },
                    name: { type: 'string', example: 'Juan Pérez' },
                    role: { type: 'string', example: 'USER' }
                  }
                },
                companyId: { type: 'string', example: 'uuid-empresa' },
                token: { type: 'string', example: 'jwt-token' }
              }
            }
          }
        },
        400: {
          description: 'Ya existe un usuario con este email',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Ya existe un usuario con este email' }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al registrar usuario' },
            message: { type: 'string', example: 'Error desconocido' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password, firstName = '', lastName = '', companyName, workifyEnabled = true, shopflowEnabled = false, technicalServicesEnabled = false } = request.body

      if (!email || !password) {
        reply.code(400)
        return {
          success: false,
          error: 'Email y contraseña son requeridos',
        }
      }

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (existing) {
        reply.code(400)
        return {
          success: false,
          error: 'Ya existe un usuario con este email',
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      if (companyName && companyName.trim()) {
        try {
          const [workifyMod, shopflowMod, techservicesMod] = await Promise.all([
            prisma.module.findUnique({ where: { key: 'workify' } }),
            prisma.module.findUnique({ where: { key: 'shopflow' } }),
            prisma.module.findUnique({ where: { key: 'techservices' } }),
          ])

          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              firstName,
              lastName,
              role: 'USER',
              isActive: true,
              isSuperuser: false,
            },
          })

          const company = await prisma.company.create({
            data: {
              name: companyName.trim(),
              ownerUserId: user.id,
              isActive: true,
            },
          })

          await prisma.companyMember.create({
            data: {
              userId: user.id,
              companyId: company.id,
              membershipRole: 'OWNER',
            },
          })

          const moduleIds: string[] = []
          if (workifyEnabled && workifyMod) moduleIds.push(workifyMod.id)
          if (shopflowEnabled && shopflowMod) moduleIds.push(shopflowMod.id)
          if (technicalServicesEnabled && techservicesMod) moduleIds.push(techservicesMod.id)
          for (const modId of moduleIds) {
            await prisma.companyModule.create({
              data: { companyId: company.id, moduleId: modId, enabled: true },
            })
          }

          const role =
            (await prisma.role.findFirst({ where: { name: 'admin', companyId: company.id } })) ??
            (await prisma.role.create({ data: { name: 'admin', companyId: company.id } }))

          await prisma.userRoleAssignment.create({
            data: { userId: user.id, roleId: role.id, companyId: company.id },
          })

          const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: company.id,
            isSuperuser: false,
            membershipRole: 'OWNER',
          })

          const modules = {
            workify: workifyEnabled,
            shopflow: shopflowEnabled,
            techservices: technicalServicesEnabled,
          }

          return {
            success: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                name: userDisplayName(user),
                role: user.role,
                companyId: company.id,
              },
              token,
              company: { id: company.id, name: company.name, modules },
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

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      })
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

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          firstName: true,
          lastName: true,
          shopflowPreferredCompanyId: true,
        },
      })

      if (!user) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      if (!user.isActive) {
        reply.code(401)
        return {
          success: false,
          error: 'Usuario inactivo',
        }
      }

      let preferredCompanyId: string | null = user.shopflowPreferredCompanyId

      if (!preferredCompanyId) {
        const companies = await getUserCompanies(decoded.id, decoded.isSuperuser ?? false)
        const defaultCompanyId = companies[0]?.id ?? null
        if (defaultCompanyId) {
          await prisma.user.update({
            where: { id: decoded.id },
            data: { shopflowPreferredCompanyId: defaultCompanyId },
          })
          preferredCompanyId = defaultCompanyId
        }
      }

      let company: { id: string; name: string; modules: { workify: boolean; shopflow: boolean; techservices: boolean } } | null = null
      let responseCompanyId: string | undefined = decoded.companyId

      if (decoded.companyId) {
        const c = await prisma.company.findFirst({
          where: { id: decoded.companyId, isActive: true },
        })
        if (c) {
          const modules = await getCompanyModules(c.id)
          company = { id: c.id, name: c.name, modules }
        }
      }

      if (!responseCompanyId || !company) {
        const effectiveId = preferredCompanyId ?? undefined
        if (effectiveId) {
          responseCompanyId = effectiveId
          const c = await prisma.company.findFirst({
            where: { id: effectiveId, isActive: true },
          })
          if (c) {
            const modules = await getCompanyModules(c.id)
            company = { id: c.id, name: c.name, modules }
          }
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

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, isActive: true },
      })

      if (!user || !user.isActive) {
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

      const companies = await getUserCompanies(decoded.id, decoded.isSuperuser ?? false)
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
  }>('/api/auth/context', {
    schema: {
      body: {
        type: 'object',
        required: ['companyId'],
        properties: { companyId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
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
        const company = await prisma.company.findFirst({
          where: { id: companyId, isActive: true },
        })
        allowed = !!company
      } else {
        const member = await prisma.companyMember.findUnique({
          where: { userId_companyId: { userId: decoded.id, companyId } },
          select: { membershipRole: true },
        })
        if (member) {
          allowed = true
          membershipRole = member.membershipRole
        } else {
          const ur = await prisma.userRoleAssignment.findFirst({
            where: { userId: decoded.id, companyId },
          })
          allowed = !!ur
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

      await prisma.user.update({
        where: { id: decoded.id },
        data: { shopflowPreferredCompanyId: companyId },
      })

      const company = await prisma.company.findFirst({
        where: { id: companyId, isActive: true },
      })
      const companyWithModules = company
        ? { id: company.id, name: company.name, modules: await getCompanyModules(company.id) }
        : null

      return {
        success: true,
        data: {
          token,
          companyId,
          company: companyWithModules,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // POST /api/auth/sessions - Create session (store session token). Caller must be the user or superuser.
  fastify.post<{
    Body: {
      userId: string
      sessionToken: string
      ipAddress?: string
      userAgent?: string
      expiresAt: string
    }
  }>('/api/auth/sessions', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'sessionToken'],
        properties: {
          userId: { type: 'string' },
          sessionToken: { type: 'string' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          expiresAt: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { userId, sessionToken, ipAddress, userAgent, expiresAt } = request.body
      if (!userId || !sessionToken) {
        return sendBadRequest(reply, 'userId y sessionToken son requeridos')
      }
      if (decoded.id !== userId && !decoded.isSuperuser) {
        return sendForbidden(reply, 'Solo puedes crear sesión para tu propio usuario')
      }
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: { id: true, role: true },
      })
      if (!user) {
        reply.code(404)
        return { success: false, error: 'Usuario no encontrado' }
      }
      const existingSessions = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM sessions WHERE "userId" = ${userId} LIMIT 1
      `
      if (
        existingSessions.length > 0 &&
        user.role !== 'ADMIN' &&
        user.role !== 'SUPERADMIN'
      ) {
        reply.code(409)
        return { success: false, error: 'Concurrent sessions not allowed for this role' }
      }
      const expiresAtVal = expiresAt
        ? new Date(expiresAt)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await prisma.$executeRaw`
        INSERT INTO sessions ("userId", "sessionToken", "ipAddress", "userAgent", "expiresAt")
        VALUES (${userId}, ${sessionToken}, ${ipAddress ?? null}, ${userAgent ?? null}, ${expiresAtVal})
      `
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
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM sessions WHERE "sessionToken" = ${token} AND "expiresAt" > NOW() LIMIT 1
      `
      return { success: true, data: { valid: rows.length > 0 } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, data: { valid: false } }
    }
  })

  // GET /api/auth/sessions?userId= - List user sessions. Caller must be the user or superuser.
  fastify.get<{ Querystring: { userId: string }   }>('/api/auth/sessions', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const decoded = request.user!
      const { userId } = request.query
      if (!userId) {
        return sendBadRequest(reply, 'userId es requerido')
      }
      if (decoded.id !== userId && !decoded.isSuperuser) {
        return sendForbidden(reply, 'Solo puedes listar tus propias sesiones')
      }
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, "userId", "sessionToken", "ipAddress", "userAgent", "expiresAt", "createdAt"
        FROM sessions WHERE "userId" = ${userId} AND "expiresAt" > NOW() ORDER BY "createdAt" DESC
      `
      return { success: true, data: rows }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error' }
    }
  })

  // DELETE /api/auth/sessions/:token - Terminate one session. Caller must own the session or be superuser.
  fastify.delete<{ Params: { token: string }; Querystring: { userId?: string } }>(
    '/api/auth/sessions/:token',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const caller = request.user!
        const { token } = request.params
        const decodedToken = decodeURIComponent(token)
        const existing = await prisma.$queryRaw<{ id: string; userId: string }[]>`
          SELECT id, "userId" FROM sessions WHERE "sessionToken" = ${decodedToken} LIMIT 1
        `
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Session not found' }
        }
        const sessionUserId = existing[0].userId
        if (caller.id !== sessionUserId && !caller.isSuperuser) {
          return sendForbidden(reply, 'No puedes eliminar sesiones de otro usuario')
        }
        await prisma.$executeRaw`DELETE FROM sessions WHERE "sessionToken" = ${decodedToken}`
        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error' }
      }
    }
  )

  // POST /api/auth/sessions/terminate-others - Terminate all sessions except current. Caller must be the user or superuser.
  fastify.post<{
    Body: { userId: string; currentSessionToken: string }
  }>('/api/auth/sessions/terminate-others', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['userId', 'currentSessionToken'],
        properties: {
          userId: { type: 'string' },
          currentSessionToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const caller = request.user!
      const { userId, currentSessionToken } = request.body
      if (!userId || !currentSessionToken) {
        return sendBadRequest(reply, 'userId y currentSessionToken son requeridos')
      }
      if (caller.id !== userId && !caller.isSuperuser) {
        return sendForbidden(reply, 'Solo puedes terminar tus propias sesiones')
      }
      await prisma.$executeRaw`
        DELETE FROM sessions WHERE "userId" = ${userId} AND "sessionToken" != ${currentSessionToken}
      `
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
      const result = await prisma.$queryRaw<{ count: string }[]>`
        WITH deleted AS (DELETE FROM sessions WHERE "expiresAt" <= NOW() RETURNING id)
        SELECT COUNT(*)::text as count FROM deleted
      `
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      })
      if (!user) {
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
