import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getShopflowContext } from './auth-helper.js'

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
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return
        const { search, email, phone } = request.query

        let query = sql`
          SELECT 
            c.id,
            c."companyId",
            c.name,
            c.email,
            c.phone,
            c.address,
            c."createdAt",
            c."updatedAt",
            COUNT(s.id) as sales_count
          FROM customers c
          LEFT JOIN sales s ON s."customerId" = c.id AND s."companyId" = c."companyId"
          WHERE c."companyId" = ${ctx.companyId}
        `

        if (search) {
          query = sql`
            ${query}
            AND c.name ILIKE ${`%${search}%`}
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

        const customers = await sqlQuery(query)

        return {
          success: true,
          data: customers.map((c: any) => ({
            id: c.id,
            companyId: c.companyId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
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
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { id } = request.params

      const customer = await sqlQuery<any>(sql`
        SELECT 
          c.id,
          c."companyId",
          c.name,
          c.email,
          c.phone,
          c.address,
          c."createdAt",
          c."updatedAt"
        FROM customers c
        WHERE c.id = ${id} AND c."companyId" = ${ctx.companyId}
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
        WHERE "customerId" = ${id} AND "companyId" = ${ctx.companyId}
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
        WHERE "customerId" = ${id} AND "companyId" = ${ctx.companyId}
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
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { name, email, phone, address } = request.body

      const customer = await sqlQuery<any>(sql`
        INSERT INTO customers (
          "companyId", name, email, phone, address
        )
        VALUES (
          ${ctx.companyId}, ${name}, ${email ?? null}, ${phone ?? null}, ${address ?? null}
        )
        RETURNING 
          id, "companyId", name, email, phone, address, "createdAt", "updatedAt"
      `)

      // Get sales count
      const salesCount = await sqlQuery<{ count: string }>(sql`
        SELECT COUNT(*) as count
        FROM sales
        WHERE "customerId" = ${customer[0].id} AND "companyId" = ${ctx.companyId}
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
        const ctx = await getShopflowContext(request, reply)
        if (!ctx) return
        const { id } = request.params
        const { name, email, phone, address } = request.body

        // Check if customer exists
        const existing = await sqlQuery<{ id: string }>(sql`
          SELECT id FROM customers WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
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
          UPDATE customers 
          SET ${updates.join(', ')}
          WHERE id = $${idParam} AND "companyId" = $${companyParam}
          RETURNING id, "companyId", name, email, phone, address, "createdAt", "updatedAt"
        `

        const customer = await sqlUnsafe<any>(query, values)

        // Get sales count
        const salesCount = await sqlQuery<{ count: string }>(sql`
          SELECT COUNT(*) as count
          FROM sales
          WHERE "customerId" = ${id} AND "companyId" = ${ctx.companyId}
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
      const ctx = await getShopflowContext(request, reply)
      if (!ctx) return
      const { id } = request.params

      // Check if customer exists
      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM customers WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
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
        WHERE "customerId" = ${id} AND "companyId" = ${ctx.companyId}
      `)

      if (parseInt(salesCount[0]?.count || '0') > 0) {
        reply.code(400)
        return {
          success: false,
          error: 'No se puede eliminar un cliente que tiene ventas. Las ventas se preservan para registros históricos.',
        }
      }

      await sqlQuery(sql`DELETE FROM customers WHERE id = ${id} AND "companyId" = ${ctx.companyId}`)

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
