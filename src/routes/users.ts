import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe, type User, userDisplayName } from '../db/neon.js'
import bcrypt from 'bcryptjs'

export async function usersRoutes(fastify: FastifyInstance) {
  // GET /api/users - Obtener todos los usuarios (schema: firstName, lastName, isActive)
  fastify.get('/api/users', async (request, reply) => {
    try {
      const users = await sqlQuery<User>(sql`
        SELECT 
          id,
          email,
          "firstName",
          "lastName",
          role,
          "isActive",
          "createdAt",
          "updatedAt"
        FROM users
        WHERE "isActive" = true
        ORDER BY "createdAt" DESC
      `)

      return {
        success: true,
        data: users.map((u) => ({ ...u, name: userDisplayName(u) })),
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined
      return {
        success: false,
        error: 'Error al obtener usuarios',
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      }
    }
  })

  // GET /api/users/:id - Obtener un usuario por ID
  fastify.get<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const users = await sqlQuery<User>(sql`
        SELECT 
          id,
          email,
          "firstName",
          "lastName",
          role,
          "isActive",
          "createdAt",
          "updatedAt"
        FROM users
        WHERE id = ${id}
        LIMIT 1
      `)

      if (users.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      return {
        success: true,
        data: { ...users[0], name: userDisplayName(users[0]) },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined
      return {
        success: false,
        error: 'Error al obtener usuario',
        message: errorMessage,
        ...(errorStack && { stack: errorStack }),
      }
    }
  })

  // POST /api/users - Create user (schema: firstName, lastName, isActive)
  fastify.post<{
    Body: {
      email: string
      password: string
      firstName?: string
      lastName?: string
      role?: string
      isActive?: boolean
    }
  }>('/api/users', async (request, reply) => {
    try {
      const { email, password, firstName, lastName, role, isActive } = request.body

      // Check if user already exists
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

      // Hash password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await sqlQuery<User>(sql`
        INSERT INTO users (email, password, "firstName", "lastName", role, "isActive")
        VALUES (${email}, ${hashedPassword}, ${firstName ?? ''}, ${lastName ?? ''}, ${role || 'USER'}, ${isActive ?? true})
        RETURNING id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
      `)

      return {
        success: true,
        data: { ...user[0], name: userDisplayName(user[0]) },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear usuario',
        message: errorMessage,
      }
    }
  })

  // PUT /api/users/:id - Update user (schema: firstName, lastName, isActive)
  fastify.put<{
    Params: { id: string }
    Body: {
      email?: string
      password?: string
      firstName?: string
      lastName?: string
      role?: string
      isActive?: boolean
    }
  }>('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const { email, password, firstName, lastName, role, isActive } = request.body

      // Check if user exists
      const existing = await sqlQuery<{ id: string; email: string }>(sql`
        SELECT id, email FROM users WHERE id = ${id} LIMIT 1
      `)

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      // Check if email is already taken
      if (email && email !== existing[0].email) {
        const emailCheck = await sqlQuery<{ id: string }>(sql`
          SELECT id FROM users WHERE email = ${email} LIMIT 1
        `)
        if (emailCheck.length > 0) {
          reply.code(400)
          return {
            success: false,
            error: 'Ya existe un usuario con este email',
          }
        }
      }

      // Build update query
      const updates: string[] = []
      const values: any[] = []

      if (email !== undefined) {
        updates.push(`email = $${values.length + 1}`)
        values.push(email)
      }
      if (password !== undefined) {
        const hashedPassword = await bcrypt.hash(password, 10)
        updates.push(`password = $${values.length + 1}`)
        values.push(hashedPassword)
      }
      if (firstName !== undefined) {
        updates.push(`"firstName" = $${values.length + 1}`)
        values.push(firstName)
      }
      if (lastName !== undefined) {
        updates.push(`"lastName" = $${values.length + 1}`)
        values.push(lastName)
      }
      if (role !== undefined) {
        updates.push(`role = $${values.length + 1}`)
        values.push(role)
      }
      if (isActive !== undefined) {
        updates.push(`"isActive" = $${values.length + 1}`)
        values.push(isActive)
      }

      if (updates.length === 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No hay campos para actualizar',
        }
      }

      updates.push(`"updatedAt" = NOW()`)
      values.push(id)

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
      `

      const updated = await sqlUnsafe<User>(query, values)

      return {
        success: true,
        data: updated[0] ? { ...updated[0], name: userDisplayName(updated[0]) } : updated[0],
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar usuario',
        message: errorMessage,
      }
    }
  })

  // DELETE /api/users/:id - Delete user
  fastify.delete<{ Params: { id: string } }>('/api/users/:id', async (request, reply) => {
    try {
      const { id } = request.params

      // Check if user exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM users WHERE id = ${id} LIMIT 1
      `)

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      // Check if user has sales
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM sales WHERE "userId" = ${id}
      `)

      if (parseInt(salesCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar un usuario que tiene ventas. Desactive el usuario en su lugar.',
        }
      }

      await sql`DELETE FROM users WHERE id = ${id}`

      return {
        success: true,
        data: { success: true },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al eliminar usuario',
        message: errorMessage,
      }
    }
  })
}
