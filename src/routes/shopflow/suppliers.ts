import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getShopflowContext } from './auth-helper.js'

export type Supplier = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  taxId: string | null
  notes: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export async function shopflowSuppliersRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/suppliers - List suppliers with filters
  fastify.get<{ Querystring: { search?: string; active?: string } }>(
    '/api/shopflow/suppliers',
    async (request, reply) => {
      try {
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return
        const { search, active } = request.query

        let query = sql`
          SELECT 
            s.id,
            s."companyId",
            s.name,
            s.email,
            s.phone,
            s.address,
            s.city,
            s.state,
            s."taxId",
            s.active,
            s."createdAt",
            s."updatedAt",
            COUNT(p.id) as products_count
          FROM suppliers s
          LEFT JOIN products p ON p."supplierId" = s.id AND p."companyId" = s."companyId"
          WHERE s."companyId" = ${ctx.companyId}
        `

        if (search) {
          query = sql`
            ${query}
            AND (s.name ILIKE ${`%${search}%`} 
              OR s.email ILIKE ${`%${search}%`} 
              OR s.phone ILIKE ${`%${search}%`}
              OR s."taxId" ILIKE ${`%${search}%`})
          `
        }

        if (active !== undefined) {
          query = sql`${query} AND s.active = ${active === 'true'}`
        }

        query = sql`
          ${query}
          GROUP BY s.id
          ORDER BY s.name ASC
        `

        const suppliers = await sqlQuery<any>(query)

        return {
          success: true,
          data: suppliers.map((s: any) => ({
            id: s.id,
            companyId: s.companyId,
            name: s.name,
            email: s.email,
            phone: s.phone,
            address: s.address,
            city: s.city,
            state: s.state,
            taxId: s.taxId,
            active: s.active,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            _count: {
              products: parseInt(s.products_count) || 0,
            },
          })),
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener proveedores',
          message: errorMessage,
        }
      }
    }
  )

  // GET /api/shopflow/suppliers/:id - Get supplier by ID
  fastify.get<{ Params: { id: string } }>('/api/shopflow/suppliers/:id', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { id } = request.params

      const supplier = await sqlQuery<any>(sql`
        SELECT 
          s.id,
          s."companyId",
          s.name,
          s.email,
          s.phone,
          s.address,
          s.city,
          s.state,
          s."taxId",
          s.active,
          s."createdAt",
          s."updatedAt"
        FROM suppliers s
        WHERE s.id = ${id} AND s."companyId" = ${ctx.companyId}
        LIMIT 1
      `)

      if (supplier.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Proveedor no encontrado',
        }
      }

      // Get products
      const products = await sqlQuery<any>(sql`
        SELECT 
          id, name, sku, price, stock
        FROM products
        WHERE "supplierId" = ${id} AND "companyId" = ${ctx.companyId}
        ORDER BY name ASC
      `)

      // Get products count
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${id} AND "companyId" = ${ctx.companyId}
      `)

      return {
        success: true,
        data: {
          ...supplier[0],
          products: products,
          _count: {
            products: parseInt(productsCount[0]?.count || '0'),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener proveedor',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/suppliers - Create supplier
  fastify.post<{ Body: Supplier }>('/api/shopflow/suppliers', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { name, email, phone, address, city, state, taxId, active } =
        request.body

      const supplier = await sqlQuery<any>(sql`
        INSERT INTO suppliers (
          "companyId", name, email, phone, address, city, state, "taxId", active
        )
        VALUES (
          ${ctx.companyId}, ${name}, ${email ?? null}, ${phone ?? null}, ${address ?? null}, ${city ?? null}, ${state ?? null}, ${taxId ?? null}, ${active ?? true}
        )
        RETURNING 
          id, "companyId", name, email, phone, address, city, state, "taxId", active, "createdAt", "updatedAt"
      `)

      // Get products count
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${supplier[0].id} AND "companyId" = ${ctx.companyId}
      `)

      return {
        success: true,
        data: {
          ...supplier[0],
          _count: {
            products: parseInt(productsCount[0]?.count || '0'),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear proveedor',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/suppliers/:id - Update supplier
  fastify.put<{ Params: { id: string }; Body: Partial<Supplier> }>(
    '/api/shopflow/suppliers/:id',
    async (request, reply) => {
      try {
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return
        const { id } = request.params
        const { name, email, phone, address, city, state, taxId, active } =
          request.body

        // Check if supplier exists
        const existing = await sqlQuery<{ id: string }>(sql`
          SELECT id FROM suppliers WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)

        if (existing.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Proveedor no encontrado',
          }
        }

        // Build update query dynamically
        const updates: string[] = []
        const values: any[] = []

        if (name !== undefined) {
          updates.push(`name = $${values.length + 1}`)
          values.push(name)
        }
        if (email !== undefined) {
          updates.push(`email = $${values.length + 1}`)
          values.push(email)
        }
        if (phone !== undefined) {
          updates.push(`phone = $${values.length + 1}`)
          values.push(phone)
        }
        if (address !== undefined) {
          updates.push(`address = $${values.length + 1}`)
          values.push(address)
        }
        if (city !== undefined) {
          updates.push(`city = $${values.length + 1}`)
          values.push(city)
        }
        if (state !== undefined) {
          updates.push(`state = $${values.length + 1}`)
          values.push(state)
        }
        if (taxId !== undefined) {
          updates.push(`"taxId" = $${values.length + 1}`)
          values.push(taxId)
        }
        if (active !== undefined) {
          updates.push(`active = $${values.length + 1}`)
          values.push(active)
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
          UPDATE suppliers 
          SET ${updates.join(', ')}
          WHERE id = $${idParam} AND "companyId" = $${companyParam}
          RETURNING id, "companyId", name, email, phone, address, city, state, "taxId", active, "createdAt", "updatedAt"
        `

        const supplier = await sqlUnsafe<any>(query, values)

        // Get products count
        const productsCount = await sqlQuery<{ count: string }>(sql`
          SELECT COUNT(*) as count
          FROM products
          WHERE "supplierId" = ${id} AND "companyId" = ${ctx.companyId}
        `)

        return {
          success: true,
          data: {
            ...supplier[0],
            _count: {
              products: parseInt(productsCount[0]?.count || '0'),
            },
          },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al actualizar proveedor',
          message: errorMessage,
        }
      }
    }
  )

  // DELETE /api/shopflow/suppliers/:id - Delete supplier
  fastify.delete<{ Params: { id: string } }>('/api/shopflow/suppliers/:id', async (request, reply) => {
    try {
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { id } = request.params

      // Check if supplier exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM suppliers WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
      `)

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Proveedor no encontrado',
        }
      }

      // Check if supplier has products
      const productsCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${id} AND "companyId" = ${ctx.companyId}
      `)

      if (parseInt(productsCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar un proveedor que tiene productos. Por favor reasigne o elimine los productos primero.',
        }
      }

      await sqlQuery(sql`DELETE FROM suppliers WHERE id = ${id} AND "companyId" = ${ctx.companyId}`)

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
        error: 'Error al eliminar proveedor',
        message: errorMessage,
      }
    }
  })
}
