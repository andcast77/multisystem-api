import { FastifyInstance } from 'fastify'
import { sql } from '../../db/neon.js'

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
        const { search, active } = request.query

        let query = sql`
          SELECT 
            s.id,
            s.name,
            s.email,
            s.phone,
            s.address,
            s.city,
            s.state,
            s."postalCode",
            s.country,
            s."taxId",
            s.notes,
            s.active,
            s."createdAt",
            s."updatedAt",
            COUNT(p.id) as products_count
          FROM suppliers s
          LEFT JOIN products p ON p."supplierId" = s.id
          WHERE 1=1
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

        const suppliers = await query

        return {
          success: true,
          data: suppliers.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            address: s.address,
            city: s.city,
            state: s.state,
            postalCode: s.postalCode,
            country: s.country,
            taxId: s.taxId,
            notes: s.notes,
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
      const { id } = request.params

      const supplier = await sql`
        SELECT 
          s.id,
          s.name,
          s.email,
          s.phone,
          s.address,
          s.city,
          s.state,
          s."postalCode",
          s.country,
          s."taxId",
          s.notes,
          s.active,
          s."createdAt",
          s."updatedAt"
        FROM suppliers s
        WHERE s.id = ${id}
        LIMIT 1
      `

      if (supplier.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Proveedor no encontrado',
        }
      }

      // Get products
      const products = await sql`
        SELECT 
          id, name, sku, price, stock
        FROM products
        WHERE "supplierId" = ${id}
        ORDER BY name ASC
      `

      // Get products count
      const productsCount = await sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${id}
      `

      return {
        success: true,
        data: {
          ...supplier[0],
          products: products,
          _count: {
            products: parseInt(productsCount[0].count) || 0,
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
      const { name, email, phone, address, city, state, postalCode, country, taxId, notes, active } =
        request.body

      const supplier = await sql`
        INSERT INTO suppliers (
          name, email, phone, address, city, state, "postalCode", country, "taxId", notes, active
        )
        VALUES (
          ${name}, ${email}, ${phone}, ${address}, ${city}, ${state}, ${postalCode}, ${country}, ${taxId}, ${notes}, ${active ?? true}
        )
        RETURNING 
          id, name, email, phone, address, city, state, "postalCode", country, "taxId", notes, active, "createdAt", "updatedAt"
      `

      // Get products count
      const productsCount = await sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${supplier[0].id}
      `

      return {
        success: true,
        data: {
          ...supplier[0],
          _count: {
            products: parseInt(productsCount[0].count) || 0,
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
        const { id } = request.params
        const { name, email, phone, address, city, state, postalCode, country, taxId, notes, active } =
          request.body

        // Check if supplier exists
        const existing = await sql`
          SELECT id FROM suppliers WHERE id = ${id} LIMIT 1
        `

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
        if (postalCode !== undefined) {
          updates.push(`"postalCode" = $${values.length + 1}`)
          values.push(postalCode)
        }
        if (country !== undefined) {
          updates.push(`country = $${values.length + 1}`)
          values.push(country)
        }
        if (taxId !== undefined) {
          updates.push(`"taxId" = $${values.length + 1}`)
          values.push(taxId)
        }
        if (notes !== undefined) {
          updates.push(`notes = $${values.length + 1}`)
          values.push(notes)
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
        values.push(id)

        const query = `
          UPDATE suppliers 
          SET ${updates.join(', ')}
          WHERE id = $${values.length}
          RETURNING id, name, email, phone, address, city, state, "postalCode", country, "taxId", notes, active, "createdAt", "updatedAt"
        `

        const supplier = await sql.unsafe(query, values)

        // Get products count
        const productsCount = await sql`
          SELECT COUNT(*) as count
          FROM products
          WHERE "supplierId" = ${id}
        `

        return {
          success: true,
          data: {
            ...supplier[0],
            _count: {
              products: parseInt(productsCount[0].count) || 0,
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
      const { id } = request.params

      // Check if supplier exists
      const existing = await sql`
        SELECT id FROM suppliers WHERE id = ${id} LIMIT 1
      `

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Proveedor no encontrado',
        }
      }

      // Check if supplier has products
      const productsCount = await sql`
        SELECT COUNT(*) as count
        FROM products
        WHERE "supplierId" = ${id}
      `

      if (parseInt(productsCount[0].count) > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar un proveedor que tiene productos. Por favor reasigne o elimine los productos primero.',
        }
      }

      await sql`DELETE FROM suppliers WHERE id = ${id}`

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
