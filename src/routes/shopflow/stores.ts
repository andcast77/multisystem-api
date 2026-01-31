import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'

export type Store = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export async function shopflowStoresRoutes(fastify: FastifyInstance) {
  // GET /api/shopflow/stores - List stores
  fastify.get<{ Querystring: { includeInactive?: string } }>(
    '/api/shopflow/stores',
    async (request, reply) => {
      try {
        const { includeInactive } = request.query

        let query = sql`
          SELECT id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
          FROM stores
          WHERE 1=1
        `
        if (includeInactive !== 'true') {
          query = sql`${query} AND active = true`
        }
        query = sql`${query} ORDER BY name ASC`

        const stores = await sqlQuery<any>(query)
        return { success: true, data: stores }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener tiendas',
          message: errorMessage,
        }
      }
    }
  )

  // GET /api/shopflow/stores/by-code/:code - Get store by code (must be before :id to avoid matching "by-code")
  fastify.get<{ Params: { code: string } }>(
    '/api/shopflow/stores/by-code/:code',
    async (request, reply) => {
      try {
        const { code } = request.params
        const rows = await sqlQuery<any>(sql`
          SELECT id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
          FROM stores
          WHERE code = ${decodeURIComponent(code)}
          LIMIT 1
        `)
        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Tienda no encontrada' }
        }
        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        return {
          success: false,
          error: 'Error al obtener tienda',
          message: errorMessage,
        }
      }
    }
  )

  // GET /api/shopflow/stores/:id
  fastify.get<{ Params: { id: string } }>('/api/shopflow/stores/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const rows = await sqlQuery<any>(sql`
        SELECT id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
        FROM stores
        WHERE id = ${id}
        LIMIT 1
      `)
      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Tienda no encontrada' }
      }
      return { success: true, data: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al obtener tienda',
        message: errorMessage,
      }
    }
  })

  // POST /api/shopflow/stores
  fastify.post<{
    Body: {
      name: string
      code: string
      address?: string | null
      phone?: string | null
      email?: string | null
      taxId?: string | null
    }
  }>('/api/shopflow/stores', async (request, reply) => {
    try {
      const { name, code, address, phone, email, taxId } = request.body
      const store = await sqlQuery<any>(sql`
        INSERT INTO stores (name, code, address, phone, email, "taxId")
        VALUES (${name}, ${code}, ${address ?? null}, ${phone ?? null}, ${email ?? null}, ${taxId ?? null})
        RETURNING id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
      `)
      return { success: true, data: store[0] }
    } catch (error: any) {
      fastify.log.error(error)
      reply.code(500)
      if (error?.code === '23505') {
        reply.code(409)
        return { success: false, error: 'El código de tienda ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al crear tienda',
        message: errorMessage,
      }
    }
  })

  // PUT /api/shopflow/stores/:id
  fastify.put<{
    Params: { id: string }
    Body: Partial<{
      name: string
      code: string
      address: string | null
      phone: string | null
      email: string | null
      taxId: string | null
      active: boolean
    }>
  }>('/api/shopflow/stores/:id', async (request, reply) => {
    try {
      const { id } = request.params
      const body = request.body

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM stores WHERE id = ${id} LIMIT 1
      `)
      if (existing.length === 0) {
        reply.code(404)
        return { success: false, error: 'Tienda no encontrada' }
      }

      const updates: string[] = []
      const values: any[] = []
      let idx = 0
      const set = (col: string, val: any) => {
        updates.push(`"${col}" = $${++idx}`)
        values.push(val)
      }
      if (body.name !== undefined) set('name', body.name)
      if (body.code !== undefined) set('code', body.code)
      if (body.address !== undefined) set('address', body.address)
      if (body.phone !== undefined) set('phone', body.phone)
      if (body.email !== undefined) set('email', body.email)
      if (body.taxId !== undefined) set('taxId', body.taxId)
      if (body.active !== undefined) set('active', body.active)

      if (updates.length === 0) {
        const rows = await sqlQuery<any>(sql`
          SELECT id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
          FROM stores WHERE id = ${id} LIMIT 1
        `)
        return { success: true, data: rows[0] }
      }

      updates.push('"updatedAt" = NOW()')
      values.push(id)
      const q = `
        UPDATE stores SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, name, code, address, phone, email, "taxId", active, "createdAt", "updatedAt"
      `
      const store = await sqlUnsafe<any>(q, values)
      return { success: true, data: store[0] }
    } catch (error: any) {
      fastify.log.error(error)
      reply.code(500)
      if (error?.code === '23505') {
        reply.code(409)
        return { success: false, error: 'El código de tienda ya existe' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al actualizar tienda',
        message: errorMessage,
      }
    }
  })

  // DELETE /api/shopflow/stores/:id
  fastify.delete<{ Params: { id: string } }>('/api/shopflow/stores/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const existing = await sqlQuery<{ id: string }>(sql`
        SELECT id FROM stores WHERE id = ${id} LIMIT 1
      `)
      if (existing.length === 0) {
        reply.code(404)
        return { success: false, error: 'Tienda no encontrada' }
      }

      await sqlQuery(sql`DELETE FROM stores WHERE id = ${id}`)
      return { success: true, data: { id } }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: 'Error al eliminar tienda',
        message: errorMessage,
      }
    }
  })
}
