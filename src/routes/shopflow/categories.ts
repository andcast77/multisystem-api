
import { FastifyInstance } from 'fastify';
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js';
import { requireAuth } from '../../lib/auth.js'
import { contextFromRequest, requireShopflowContext } from '../../lib/auth-context.js'

export type Category = {
  name: string
  description?: string | null
  parentId?: string | null
}

export async function shopflowCategoriesRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/categories - List categories with filters
  fastify.get<{ Querystring: { search?: string; parentId?: string; includeChildren?: string } }>(
    '/api/shopflow/categories',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { search, parentId, includeChildren } = request.query

        let query = sql`
          SELECT 
            c.id,
            c."companyId",
            c.name,
            c.description,
            c."parentId",
            c."createdAt",
            c."updatedAt",
            COUNT(DISTINCT p.id) as products_count,
            COUNT(DISTINCT ch.id) as children_count,
            parent.id as parent_id,
            parent.name as parent_name
          FROM categories c
          LEFT JOIN products p ON p."categoryId" = c.id AND p."companyId" = c."companyId"
          LEFT JOIN categories ch ON ch."parentId" = c.id AND ch."companyId" = c."companyId"
          LEFT JOIN categories parent ON parent.id = c."parentId"
          WHERE c."companyId" = ${ctx.companyId}
        `;

        if (search) {
          query = sql`
            ${query}
            AND (c.name ILIKE ${`%${search}%`} 
              OR c.description ILIKE ${`%${search}%`})
          `;
        }

        if (parentId !== undefined) {
          if (parentId === null || parentId === 'null') {
            query = sql`${query} AND c."parentId" IS NULL`;
          } else {
            query = sql`${query} AND c."parentId" = ${parentId}`;
          }
        }

        query = sql`
          ${query}
          GROUP BY c.id, parent.id, parent.name
          ORDER BY c.name ASC
        `;

        const categories = await sqlQuery(query);

        const result = categories.map((c: any) => {
          const category: any = {
            id: c.id,
            name: c.name,
            description: c.description,
            parentId: c.parentId,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            _count: {
              products: parseInt(c.products_count) || 0,
              children: parseInt(c.children_count) || 0,
            },
          };

          if (c.parent_id) {
            category.parent = {
              id: c.parent_id,
              name: c.parent_name,
            };
          }

          if (includeChildren === 'true' && parseInt(c.children_count) > 0) {
            // Note: This is a simplified version. Full tree would require recursive query
            category.children = [];
          }

          return category;
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        fastify.log.error(error);
        reply.code(500);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return {
          success: false,
          error: 'Error al obtener categorías',
          message: errorMessage,
        };
      }
    }
  );

  // GET /api/shopflow/categories/:id - Get category by ID
  fastify.get<{ Params: { id: string } }>('/api/shopflow/categories/:id', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
      // TODO: Decodifica el token directamente aquí o usa la lógica centralizada de auth
      // if (!ctx) return
      const { id } = request.params

      const category = await sqlQuery<any>(sql`
        SELECT 
          c.id,
          c."companyId",
          c.name,
          c.description,
          c."parentId",
          c."createdAt",
          c."updatedAt"
        FROM categories c
        -- TODO: Filtra por companyId usando el payload del token
        LIMIT 1
      `)

      if (category.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Categoría no encontrada',
        }
      }

      // Get parent if exists
      const parent = category[0].parentId
        ? await sqlQuery<any>(sql`
            SELECT id, "companyId", name, description
            FROM categories
            WHERE id = ${category[0].parentId} -- TODO: Filtra por companyId usando el payload del token
            LIMIT 1
          `)
        : []

      // Get children
      const children = await sqlQuery<any>(sql`
        SELECT id, "companyId", name, description, "parentId"
        FROM categories
        WHERE "parentId" = ${id} -- TODO: Filtra por companyId usando el payload del token
        ORDER BY name ASC
      `)

      // Get products count
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "categoryId" = ${id} -- TODO: Filtra por companyId usando el payload del token
      `)

      // Get children count
      const childrenCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM categories
        WHERE "parentId" = ${id} -- TODO: Filtra por companyId usando el payload del token
      `)

      return {
        success: true,
        data: {
          ...category[0],
          parent: parent.length > 0 ? parent[0] : null,
          children: children,
          _count: {
            products: parseInt(productsCount[0]?.count || '0'),
            children: parseInt(childrenCount[0]?.count || '0'),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener categoría',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/categories - Create category
  fastify.post<{ Body: Category }>('/api/shopflow/categories', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
        const ctx = contextFromRequest(request, true)
      const { name, description, parentId } = request.body

      // Check if category name already exists at the same level
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM categories
        WHERE "companyId" = ${ctx.companyId} AND name = ${name} AND "parentId" IS NOT DISTINCT FROM ${parentId ?? null}
        LIMIT 1
      `)

      if (existing.length > 0) {
        reply.code(409)
        return {
          success: false,
          error: 'Ya existe una categoría con este nombre en este nivel',
        }
      }

      // Validate parent exists if provided
      if (parentId) {
        const parent = await sqlQuery<{ id: string }>(sql`
          SELECT id FROM categories WHERE id = ${parentId} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)
        if (parent.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Categoría padre no encontrada',
          }
        }
      }

      const id = crypto.randomUUID()
      const now = new Date()
      const category = await sqlQuery<any>(sql`
        INSERT INTO categories (id, "companyId", name, description, "parentId", "createdAt", "updatedAt")
        VALUES (${id}, ${ctx.companyId}, ${name}, ${description}, ${parentId}, ${now}, ${now})
        RETURNING id, "companyId", name, description, "parentId", "createdAt", "updatedAt"
      `)

      // Get counts
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM products WHERE "categoryId" = ${category[0].id} AND "companyId" = ${ctx.companyId}
      `)
      const childrenCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM categories WHERE "parentId" = ${category[0].id} AND "companyId" = ${ctx.companyId}
      `)

      // Get parent if exists
      const parent = category[0].parentId
        ? await sqlQuery<any>(sql`
            SELECT id, name FROM categories WHERE id = ${category[0].parentId} LIMIT 1
          `)
        : []

      return {
        success: true,
        data: {
          ...category[0],
          parent: parent.length > 0 ? parent[0] : null,
          _count: {
            products: parseInt(productsCount[0]?.count || '0'),
            children: parseInt(childrenCount[0]?.count || '0'),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear categoría',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/categories/:id - Update category
  fastify.put<{ Params: { id: string }; Body: Partial<Category> }>(
    '/api/shopflow/categories/:id',
    { preHandler: [requireAuth, requireShopflowContext] },
    async (request, reply) => {
      try {
        const ctx = contextFromRequest(request, true)
        const { id } = request.params
        const { name, description, parentId } = request.body

        // Check if category exists
        const existing = await sqlQuery<any>(sql`
          SELECT id, name, "parentId" FROM categories WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)

        if (existing.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Categoría no encontrada',
          }
        }

        // Prevent circular reference
        if (parentId === id) {
          reply.code(400)
          return {
            success: false,
            error: 'Una categoría no puede ser su propio padre',
          }
        }

        // Check if name already exists at the same level
        if (name && name !== existing[0].name) {
          const sibling = await sqlQuery<{ id: string }>(sql`
            SELECT id FROM categories
            WHERE "companyId" = ${ctx.companyId} AND name = ${name} 
              AND "parentId" IS NOT DISTINCT FROM ${parentId ?? existing[0].parentId}
              AND id != ${id}
            LIMIT 1
          `)
          if (sibling.length > 0) {
            reply.code(409)
            return {
              success: false,
              error: 'Ya existe una categoría con este nombre en este nivel',
            }
          }
        }

        // Validate parent exists if provided
        if (parentId) {
          const parent = await sqlQuery<{ id: string }>(sql`
            SELECT id FROM categories WHERE id = ${parentId} AND "companyId" = ${ctx.companyId} LIMIT 1
          `)
          if (parent.length === 0) {
            reply.code(404)
            return {
              success: false,
              error: 'Categoría padre no encontrada',
            }
          }
        }

        // Build update
        const updates: string[] = []
        const values: any[] = []

        if (name !== undefined) {
          updates.push(`name = $${values.length + 1}`)
          values.push(name)
        }
        if (description !== undefined) {
          updates.push(`description = $${values.length + 1}`)
          values.push(description)
        }
        if (parentId !== undefined) {
          updates.push(`"parentId" = $${values.length + 1}`)
          values.push(parentId)
        }

        if (updates.length === 0) {
          reply.code(400)
          return {
            success: false,
            error: 'No hay campos para actualizar',
          }
        }

        updates.push(`"updatedAt" = NOW()`)
        values.push(ctx.companyId, id)

        const idParam = values.length
        const companyParam = values.length - 1
        const query = `
          UPDATE categories 
          SET ${updates.join(', ')}
          WHERE id = $${idParam} AND "companyId" = $${companyParam}
          RETURNING id, "companyId", name, description, "parentId", "createdAt", "updatedAt"
        `

        const category = await sqlUnsafe<any>(query, values)

        // Get counts and parent
        const productsCount = await sqlQuery<{ count: string }>(sql`
          SELECT COUNT(*) as count FROM products WHERE "categoryId" = ${id} AND "companyId" = ${ctx.companyId}
        `)
        const childrenCount = await sqlQuery<{ count: string }>(sql`
          SELECT COUNT(*) as count FROM categories WHERE "parentId" = ${id} AND "companyId" = ${ctx.companyId}
        `)
        const parent = category[0].parentId
          ? await sqlQuery<any>(sql`SELECT id, name FROM categories WHERE id = ${category[0].parentId} LIMIT 1`)
          : []

        return {
          success: true,
          data: {
            ...category[0],
            parent: parent.length > 0 ? parent[0] : null,
            _count: {
              products: parseInt(productsCount[0]?.count || '0'),
              children: parseInt(childrenCount[0]?.count || '0'),
            },
          },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al actualizar categoría',
          message: errorMessage,
        }
      }
    }
  )

  // DELETE /api/shopflow/categories/:id - Delete category
  fastify.delete<{ Params: { id: string } }>('/api/shopflow/categories/:id', { preHandler: [requireAuth, requireShopflowContext] }, async (request, reply) => {
    try {
        const ctx = contextFromRequest(request, true)
      const { id } = request.params

      // Check if category exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM categories WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
      `)

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Categoría no encontrada',
        }
      }

      // Check if category has products
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM products WHERE "categoryId" = ${id} AND "companyId" = ${ctx.companyId}
      `)

      if (parseInt(productsCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar una categoría que tiene productos. Por favor reasigne o elimine los productos primero.',
        }
      }

      // Check if category has children
      const childrenCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count FROM categories WHERE "parentId" = ${id} AND "companyId" = ${ctx.companyId}
      `)

      if (parseInt(childrenCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar una categoría que tiene subcategorías. Por favor elimine o reasigne las subcategorías primero.',
        }
      }

      await sqlQuery(sql`DELETE FROM categories WHERE id = ${id} AND "companyId" = ${ctx.companyId}`)

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
        error: 'Error al eliminar categoría',
        message: errorMessage,
      }
    }
  })
}

