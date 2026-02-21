import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getTechServicesContext } from './auth-helper.js'

type PartInput = {
  name?: string
  quantity?: number
  unitCost?: number
  notes?: string | null
}

export async function techServicesPartsRoutes(fastify: FastifyInstance) {
  // GET /api/techservices/work-orders/:id/parts
  fastify.get<{ Params: { id: string } }>(
    '/api/techservices/work-orders/:id/parts',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      try {
        const rows = await sqlQuery(sql`
          SELECT p.id, p."workOrderId", p.name, p.quantity, p."unitCost", p.notes, p."createdAt", p."updatedAt"
          FROM work_order_parts p
          JOIN work_orders w ON w.id = p."workOrderId"
          WHERE p."workOrderId" = ${id} AND w."companyId" = ${ctx.companyId}
          ORDER BY p."createdAt" DESC
        `)

        return { success: true, data: rows }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al listar partes' }
      }
    }
  )

  // POST /api/techservices/work-orders/:id/parts
  fastify.post<{ Params: { id: string }; Body: PartInput }>(
    '/api/techservices/work-orders/:id/parts',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { name, quantity = 1, unitCost, notes } = request.body

      if (!name || !name.trim()) {
        reply.code(400)
        return { success: false, error: 'El nombre es requerido' }
      }
      if (unitCost === undefined || Number.isNaN(Number(unitCost))) {
        reply.code(400)
        return { success: false, error: 'El costo unitario es requerido' }
      }

      try {
        const orderRows = await sqlQuery(sql`
          SELECT id FROM work_orders WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)
        if (orderRows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Orden no encontrada' }
        }

        const rows = await sqlQuery(sql`
          INSERT INTO work_order_parts (
            "workOrderId", name, quantity, "unitCost", notes
          ) VALUES (
            ${id}, ${name.trim()}, ${quantity}, ${unitCost}, ${notes ?? null}
          )
          RETURNING id, "workOrderId", name, quantity, "unitCost", notes, "createdAt", "updatedAt"
        `)

        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al agregar parte' }
      }
    }
  )

  // PUT /api/techservices/parts/:id
  fastify.put<{ Params: { id: string }; Body: PartInput }>(
    '/api/techservices/parts/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { name, quantity, unitCost, notes } = request.body

      try {
        const existing = await sqlQuery(sql`
          SELECT p.id
          FROM work_order_parts p
          JOIN work_orders w ON w.id = p."workOrderId"
          WHERE p.id = ${id} AND w."companyId" = ${ctx.companyId}
          LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Parte no encontrada' }
        }

        const updates: string[] = []
        const values: Array<string | number | null> = []

        if (name !== undefined) {
          updates.push(`name = $${values.length + 1}`)
          values.push(name)
        }
        if (quantity !== undefined) {
          updates.push(`quantity = $${values.length + 1}`)
          values.push(quantity)
        }
        if (unitCost !== undefined) {
          updates.push(`"unitCost" = $${values.length + 1}`)
          values.push(unitCost)
        }
        if (notes !== undefined) {
          updates.push(`notes = $${values.length + 1}`)
          values.push(notes)
        }

        if (updates.length === 0) {
          return { success: true }
        }

        const query = `
          UPDATE work_order_parts
          SET ${updates.join(', ')}, "updatedAt" = NOW()
          WHERE id = $${values.length + 1}
          RETURNING id
        `

        await sqlUnsafe(query, [...values, id])
        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar parte' }
      }
    }
  )

  // DELETE /api/techservices/parts/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/techservices/parts/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      try {
        const existing = await sqlQuery(sql`
          SELECT p.id
          FROM work_order_parts p
          JOIN work_orders w ON w.id = p."workOrderId"
          WHERE p.id = ${id} AND w."companyId" = ${ctx.companyId}
          LIMIT 1
        `)

        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Parte no encontrada' }
        }

        await sqlQuery(sql`
          DELETE FROM work_order_parts WHERE id = ${id}
        `)

        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar parte' }
      }
    }
  )
}
