import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getTechServicesContext } from './auth-helper.js'

type VisitInput = {
  scheduledStartAt?: string
  scheduledEndAt?: string | null
  status?: string
  assignedEmployeeId?: string | null
  notes?: string | null
}

export async function techServicesVisitsRoutes(fastify: FastifyInstance) {
  // GET /api/techservices/work-orders/:id/visits
  fastify.get<{ Params: { id: string } }>(
    '/api/techservices/work-orders/:id/visits',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      try {
        const rows = await sqlQuery(sql`
          SELECT v.id, v."workOrderId", v."assignedEmployeeId", v."scheduledStartAt", v."scheduledEndAt", v.status, v.notes, v."createdAt", v."updatedAt",
            e."firstName" as employee_first_name, e."lastName" as employee_last_name
          FROM service_visits v
          JOIN work_orders w ON w.id = v."workOrderId"
          LEFT JOIN employees e ON e.id = v."assignedEmployeeId"
          WHERE v."workOrderId" = ${id} AND w."companyId" = ${ctx.companyId}
          ORDER BY v."scheduledStartAt" ASC
        `)

        const visits = rows.map((row: any) => ({
          id: row.id,
          workOrderId: row.workOrderId,
          assignedEmployeeId: row.assignedEmployeeId,
          scheduledStartAt: row.scheduledStartAt,
          scheduledEndAt: row.scheduledEndAt,
          status: row.status,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          assignedEmployee: row.assignedEmployeeId
            ? { id: row.assignedEmployeeId, firstName: row.employee_first_name, lastName: row.employee_last_name }
            : null,
        }))

        return { success: true, data: visits }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al listar visitas' }
      }
    }
  )

  // POST /api/techservices/work-orders/:id/visits
  fastify.post<{ Params: { id: string }; Body: VisitInput }>(
    '/api/techservices/work-orders/:id/visits',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { scheduledStartAt, scheduledEndAt, status, assignedEmployeeId, notes } = request.body

      if (!scheduledStartAt) {
        reply.code(400)
        return { success: false, error: 'La fecha de inicio es requerida' }
      }

      try {
        if (assignedEmployeeId) {
          const employeeRows = await sqlQuery(sql`
            SELECT id FROM employees
            WHERE id = ${assignedEmployeeId} AND "companyId" = ${ctx.companyId}
              AND ("isDeleted" IS NOT TRUE OR "isDeleted" IS NULL)
            LIMIT 1
          `)
          if (employeeRows.length === 0) {
            reply.code(400)
            return { success: false, error: 'Empleado invalido' }
          }
        }

        const orderRows = await sqlQuery(sql`
          SELECT id FROM work_orders WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)
        if (orderRows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Orden no encontrada' }
        }

        const rows = await sqlQuery(sql`
          INSERT INTO service_visits (
            "companyId", "workOrderId", "assignedEmployeeId", "scheduledStartAt", "scheduledEndAt", status, notes
          ) VALUES (
            ${ctx.companyId}, ${id}, ${assignedEmployeeId ?? null}, ${new Date(scheduledStartAt)}, ${scheduledEndAt ? new Date(scheduledEndAt) : null}, ${status ?? 'SCHEDULED'}, ${notes ?? null}
          )
          RETURNING id, "workOrderId", "assignedEmployeeId", "scheduledStartAt", "scheduledEndAt", status, notes, "createdAt", "updatedAt"
        `)

        return { success: true, data: rows[0] }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al crear visita' }
      }
    }
  )

  // PUT /api/techservices/visits/:id
  fastify.put<{ Params: { id: string }; Body: VisitInput }>(
    '/api/techservices/visits/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { scheduledStartAt, scheduledEndAt, status, assignedEmployeeId, notes } = request.body

      try {
        const existing = await sqlQuery(sql`
          SELECT v.id
          FROM service_visits v
          JOIN work_orders w ON w.id = v."workOrderId"
          WHERE v.id = ${id} AND w."companyId" = ${ctx.companyId}
          LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Visita no encontrada' }
        }

        if (assignedEmployeeId) {
          const employeeRows = await sqlQuery(sql`
            SELECT id FROM employees
            WHERE id = ${assignedEmployeeId} AND "companyId" = ${ctx.companyId}
              AND ("isDeleted" IS NOT TRUE OR "isDeleted" IS NULL)
            LIMIT 1
          `)
          if (employeeRows.length === 0) {
            reply.code(400)
            return { success: false, error: 'Empleado invalido' }
          }
        }

        const updates: string[] = []
        const values: Array<string | Date | null> = []

        if (scheduledStartAt !== undefined) {
          updates.push(`"scheduledStartAt" = $${values.length + 1}`)
          values.push(scheduledStartAt ? new Date(scheduledStartAt) : null)
        }
        if (scheduledEndAt !== undefined) {
          updates.push(`"scheduledEndAt" = $${values.length + 1}`)
          values.push(scheduledEndAt ? new Date(scheduledEndAt) : null)
        }
        if (status !== undefined) {
          updates.push(`status = $${values.length + 1}`)
          values.push(status)
        }
        if (assignedEmployeeId !== undefined) {
          updates.push(`"assignedEmployeeId" = $${values.length + 1}`)
          values.push(assignedEmployeeId)
        }
        if (notes !== undefined) {
          updates.push(`notes = $${values.length + 1}`)
          values.push(notes)
        }

        if (updates.length === 0) {
          return { success: true }
        }

        const query = `
          UPDATE service_visits
          SET ${updates.join(', ')}, "updatedAt" = NOW()
          WHERE id = $${values.length + 1}
          RETURNING id
        `

        await sqlUnsafe(query, [...values, id])
        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar visita' }
      }
    }
  )

  // DELETE /api/techservices/visits/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/techservices/visits/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      try {
        const existing = await sqlQuery(sql`
          SELECT v.id
          FROM service_visits v
          JOIN work_orders w ON w.id = v."workOrderId"
          WHERE v.id = ${id} AND w."companyId" = ${ctx.companyId}
          LIMIT 1
        `)
        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Visita no encontrada' }
        }

        await sqlQuery(sql`
          DELETE FROM service_visits WHERE id = ${id}
        `)

        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar visita' }
      }
    }
  )
}
