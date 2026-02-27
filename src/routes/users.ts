import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe, type User, userDisplayName } from '../db/neon.js'
import { requireAuth } from '../lib/auth.js'
import { sendServerError } from '../lib/errors.js'
import bcrypt from 'bcryptjs'

export async function usersRoutes(fastify: FastifyInstance) {
  // GET /api/users - Obtener todos los usuarios (requiere JWT)
  fastify.get('/api/users', {
    preHandler: [requireAuth],
    schema: {
      description: 'Obtiene todos los usuarios activos.',
      tags: ['Usuarios'],
      response: {
        200: {
          description: 'Lista de usuarios activos',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' },
                  email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
                  firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
                  lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
                  role: { type: 'string', description: 'Rol', example: 'USER' },
                  isActive: { type: 'boolean', description: 'Activo', example: true },
                  createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
                  updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de actualización' },
                  name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' }
                }
              }
            }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al obtener usuarios' },
            message: { type: 'string', example: 'Error desconocido' },
            stack: { type: 'string', description: 'Stack trace (solo desarrollo)', nullable: true }
          }
        }
      }
    }
  }, async (request, reply) => {
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
      return sendServerError(reply, error, fastify.log, 'Error al obtener usuarios')
    }
  })

  // GET /api/users/:id - Obtener un usuario por ID (requiere JWT)
  fastify.get<{ Params: { id: string } }>('/api/users/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Obtiene un usuario por su ID.',
      tags: ['Usuarios'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' }
        }
      },
      response: {
        200: {
          description: 'Usuario encontrado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' },
                email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
                firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
                lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
                role: { type: 'string', description: 'Rol', example: 'USER' },
                isActive: { type: 'boolean', description: 'Activo', example: true },
                createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
                updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de actualización' },
                name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' }
              }
            }
          }
        },
        404: {
          description: 'Usuario no encontrado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Usuario no encontrado' }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al obtener usuario' },
            message: { type: 'string', example: 'Error desconocido' },
            stack: { type: 'string', description: 'Stack trace (solo desarrollo)', nullable: true }
          }
        }
      }
    }
  }, async (request, reply) => {
  const { id } = request.params;
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
      WHERE id = ${id}
      LIMIT 1
    `);
    if (users.length === 0) {
      reply.code(404);
      return {
        success: false,
        error: 'Usuario no encontrado',
      };
    }
    return {
      success: true,
      data: { ...users[0], name: userDisplayName(users[0]) },
    };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined;
    return {
      success: false,
      error: 'Error al obtener usuario',
      message: errorMessage,
      ...(errorStack && { stack: errorStack }),
    };
  }
});

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
  }>('/api/users', {
    preHandler: [requireAuth],
    schema: {
      description: 'Crea un nuevo usuario.',
      tags: ['Usuarios'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
          password: { type: 'string', description: 'Contraseña', example: '123456' },
          firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
          lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
          role: { type: 'string', description: 'Rol', example: 'USER' },
          isActive: { type: 'boolean', description: 'Activo', example: true }
        }
      },
      response: {
        200: {
          description: 'Usuario creado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' },
                email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
                firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
                lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
                role: { type: 'string', description: 'Rol', example: 'USER' },
                isActive: { type: 'boolean', description: 'Activo', example: true },
                createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
                updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de actualización' },
                name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' }
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
            error: { type: 'string', example: 'Error al crear usuario' },
            message: { type: 'string', example: 'Error desconocido' }
          }
        }
      }
    }
  }, async (request, reply) => {
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
  }>('/api/users/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Actualiza un usuario por su ID.',
      tags: ['Usuarios'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
          password: { type: 'string', description: 'Contraseña', example: '123456' },
          firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
          lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
          role: { type: 'string', description: 'Rol', example: 'USER' },
          isActive: { type: 'boolean', description: 'Activo', example: true }
        }
      },
      response: {
        200: {
          description: 'Usuario actualizado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' },
                email: { type: 'string', description: 'Correo electrónico', example: 'usuario@dominio.com' },
                firstName: { type: 'string', description: 'Nombre', example: 'Juan' },
                lastName: { type: 'string', description: 'Apellido', example: 'Pérez' },
                role: { type: 'string', description: 'Rol', example: 'USER' },
                isActive: { type: 'boolean', description: 'Activo', example: true },
                createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
                updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de actualización' },
                name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' }
              }
            }
          }
        },
        400: {
          description: 'No hay campos para actualizar o email duplicado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'No hay campos para actualizar' }
          }
        },
        404: {
          description: 'Usuario no encontrado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Usuario no encontrado' }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al actualizar usuario' },
            message: { type: 'string', example: 'Error desconocido' }
          }
        }
      }
    }
  }, async (request, reply) => {
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

  // DELETE /api/users/:id - Delete user (requiere JWT)
  fastify.delete<{ Params: { id: string } }>('/api/users/:id', {
    preHandler: [requireAuth],
    schema: {
      description: 'Elimina un usuario por su ID.',
      tags: ['Usuarios'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID del usuario', example: 'uuid-123' }
        }
      },
      response: {
        200: {
          description: 'Usuario eliminado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: { success: { type: 'boolean', example: true } } }
          }
        },
        400: {
          description: 'No se puede eliminar un usuario que tiene ventas',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'No se puede eliminar un usuario que tiene ventas. Desactive el usuario en su lugar.' }
          }
        },
        404: {
          description: 'Usuario no encontrado',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Usuario no encontrado' }
          }
        },
        500: {
          description: 'Error interno',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error al eliminar usuario' },
            message: { type: 'string', example: 'Error desconocido' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      // Check if user exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM users WHERE id = ${id} LIMIT 1
      `);
      if (existing.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'Usuario no encontrado',
        };
      }
      // Check if user has sales
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM sales WHERE "userId" = ${id}
      `);
      if (parseInt(salesCount[0]?.count || '0') > 0) {
        reply.code(400);
        return {
          success: false,
          error: 'No se puede eliminar un usuario que tiene ventas. Desactive el usuario en su lugar.',
        };
      }
      await sql`DELETE FROM users WHERE id = ${id}`;
      return {
        success: true,
        data: { success: true },
      };
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        success: false,
        error: 'Error al eliminar usuario',
        message: errorMessage,
      };
    }
  });
}
