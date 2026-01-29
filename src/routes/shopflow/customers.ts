import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'

export type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  createdAt: Date
  updatedAt: Date
}

export async function shopflowCustomersRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/customers - List customers with filters
  fastify.get<{ Querystring: { search?: string; email?: string; phone?: string } }>(
    '/api/shopflow/customers',
    async (request, reply) => {
      try {
        const { search, email, phone } = request.query

        let query = sql`
          SELECT 
            c.id,
            c.name,
            c.email,
            c.phone,
            c.address,
            c.city,
            c.state,
            c."postalCode",
            c.country,
            c."createdAt",
            c."updatedAt",
            COUNT(s.id) as sales_count
          FROM customers c
          LEFT JOIN sales s ON s."customerId" = c.id
          WHERE 1=1
        `

        if (search) {
          query = sql`
            ${query}
            AND (c.name ILIKE ${`%${search}%`} 
              OR c.email ILIKE ${`%${search}%`} 
              OR c.phone ILIKE ${`%${search}%`})
          `
        }

        if (email) {
          query = sql`${query} AND c.email = ${email}`
        }

        if (phone) {
          query = sql`${query} AND c.phone = ${phone}`
        }

        query = sql`
          ${query}
          GROUP BY c.id
          ORDER BY c.name ASC
        `

        const customers = await query

        return {
          success: true,
          data: customers.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            city: c.city,
            state: c.state,
            postalCode: c.postalCode,
            country: c.country,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            _count: {
              sales: parseInt(c.sales_count) || 0,
            },
          })),
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener clientes',
          message: errorMessage,
        }
      }
    }
  )

  // GET /api/shopflow/customers/:id - Get customer by ID
  fastify.get<{ Params: { id: string } }>('/api/shopflow/customers/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const customer = await sqlQuery<any>(sql`
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c.address,
          c.city,
          c.state,
          c."postalCode",
          c.country,
          c."createdAt",
          c."updatedAt"
        FROM customers c
        WHERE c.id = ${id}
        LIMIT 1
      `)

      if (customer.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Cliente no encontrado',
        }
      }

      // Get sales count
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM sales
        WHERE "customerId" = ${id}
      `)

      // Get last 10 sales
      const sales = await sqlQuery<any>(sql`
        SELECT 
          id,
          "invoiceNumber",
          total,
          status,
          "createdAt"
        FROM sales
        WHERE "customerId" = ${id}
        ORDER BY "createdAt" DESC
        LIMIT 10
      `)

      return {
        success: true,
        data: {
          ...customer[0],
          _count: {
            sales: parseInt(salesCount[0]?.count || '0'),
          },
          sales: sales.map((s: any) => ({
            id: s.id,
            invoiceNumber: s.invoiceNumber,
            total: s.total,
            status: s.status,
            createdAt: s.createdAt,
          })),
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener cliente',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/customers - Create customer
  fastify.post<{ Body: Customer }>('/api/shopflow/customers', async (request, reply) => {
    try {
      const { name, email, phone, address, city, state, postalCode, country } = request.body

      const customer = await sqlQuery<any>(sql`
        INSERT INTO customers (
          name, email, phone, address, city, state, "postalCode", country
        )
        VALUES (
          ${name}, ${email}, ${phone}, ${address}, ${city}, ${state}, ${postalCode}, ${country}
        )
        RETURNING 
          id, name, email, phone, address, city, state, "postalCode", country, "createdAt", "updatedAt"
      `)

      // Get sales count
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM sales
        WHERE "customerId" = ${customer[0].id}
      `)

      return {
        success: true,
        data: {
          ...customer[0],
          _count: {
            sales: parseInt(salesCount[0]?.count || '0'),
          },
        },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear cliente',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/customers/:id - Update customer
  fastify.put<{ Params: { id: string }; Body: Partial<Customer> }>(
    '/api/shopflow/customers/:id',
    async (request, reply) => {
      try {
        const { id } = request.params
        const { name, email, phone, address, city, state, postalCode, country } = request.body

        // Check if customer exists
        const existing = await sqlQuery<{ id: string }>(sql`
          SELECT id FROM customers WHERE id = ${id} LIMIT 1
        `)

        if (existing.length === 0) {
          reply.code(404)
          return {
            success: false,
            error: 'Cliente no encontrado',
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
          UPDATE customers 
          SET ${updates.join(', ')}
          WHERE id = $${values.length}
          RETURNING id, name, email, phone, address, city, state, "postalCode", country, "createdAt", "updatedAt"
        `

        const customer = await sqlUnsafe<any>(query, values)

        // Get sales count
        const salesCount = await sqlQuery<{ count: string }>(sql`
          SELECT COUNT(*) as count
          FROM sales
          WHERE "customerId" = ${id}
        `)

        return {
          success: true,
          data: {
            ...customer[0],
            _count: {
              sales: parseInt(salesCount[0]?.count || '0'),
            },
          },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al actualizar cliente',
          message: errorMessage,
        }
      }
    }
  )

  // DELETE /api/shopflow/customers/:id - Delete customer
  fastify.delete<{ Params: { id: string } }>('/api/shopflow/customers/:id', async (request, reply) => {
    try {
      const { id } = request.params

      // Check if customer exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM customers WHERE id = ${id} LIMIT 1
      `)

      if (existing.length === 0) {
        reply.code(404)
        return {
          success: false,
          error: 'Cliente no encontrado',
        }
      }

      // Check if customer has sales
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM sales
        WHERE "customerId" = ${id}
      `)

      if (parseInt(salesCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar un cliente que tiene ventas. Las ventas se preservan para registros históricos.',
        }
      }

      await sqlQuery(sql`DELETE FROM customers WHERE id = ${id}`)

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
        error: 'Error al eliminar cliente',
        message: errorMessage,
      }
    }
  })
}
