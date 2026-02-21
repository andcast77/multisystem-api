import { FastifyInstance } from 'fastify'
import { sql, sqlQuery, sqlUnsafe } from '../../db/neon.js'
import { getTechServicesContext } from './auth-helper.js'

type WorkOrderInput = {
  title?: string
  description?: string | null
  status?: string
  priority?: string
  assetId?: string | null
  assignedEmployeeId?: string | null
  requestedAt?: string | null
  dueAt?: string | null
  completedAt?: string | null
}

export async function techServicesWorkOrdersRoutes(fastify: FastifyInstance) {
  // GET /api/techservices/work-orders
  fastify.get<{
    Querystring: {
      page?: string
      limit?: string
      search?: string
      status?: string
      priority?: string
      assignedEmployeeId?: string
      assetId?: string
    }
  }>('/api/techservices/work-orders', async (request, reply) => {
    const ctx = await getTechServicesContext(request, reply)
    if (!ctx) return

    const { page = '1', limit = '20', search, status, priority, assignedEmployeeId, assetId } = request.query
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    try {
      let countQuery = sql`
        SELECT COUNT(*)::int as total
        FROM work_orders w
        WHERE w."companyId" = ${ctx.companyId}
      `

      let listQuery = sql`
        SELECT
          w.id, w.title, w.description, w.status, w.priority, w."requestedAt", w."dueAt", w."completedAt", w."createdAt", w."updatedAt",
          w."assetId", w."assignedEmployeeId",
          a.name as asset_name, a."serialNumber" as asset_serial,
          e."firstName" as employee_first_name, e."lastName" as employee_last_name
        FROM work_orders w
        LEFT JOIN technical_assets a ON a.id = w."assetId"
        LEFT JOIN employees e ON e.id = w."assignedEmployeeId"
        WHERE w."companyId" = ${ctx.companyId}
      `

      if (status) {
        countQuery = sql`${countQuery} AND w.status = ${status}`
        listQuery = sql`${listQuery} AND w.status = ${status}`
      }
      if (priority) {
        countQuery = sql`${countQuery} AND w.priority = ${priority}`
        listQuery = sql`${listQuery} AND w.priority = ${priority}`
      }
      if (assignedEmployeeId) {
        countQuery = sql`${countQuery} AND w."assignedEmployeeId" = ${assignedEmployeeId}`
        listQuery = sql`${listQuery} AND w."assignedEmployeeId" = ${assignedEmployeeId}`
      }
      if (assetId) {
        countQuery = sql`${countQuery} AND w."assetId" = ${assetId}`
        listQuery = sql`${listQuery} AND w."assetId" = ${assetId}`
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`
        countQuery = sql`${countQuery} AND (w.title ILIKE ${term} OR COALESCE(w.description, '') ILIKE ${term})`
        listQuery = sql`${listQuery} AND (w.title ILIKE ${term} OR COALESCE(w.description, '') ILIKE ${term})`
      }

      const countResult = await sqlQuery(countQuery)
      const total = (countResult[0] as { total: number } | undefined)?.total ?? 0

      const listWithOrder = sql`${listQuery} ORDER BY w."createdAt" DESC LIMIT ${limitNum} OFFSET ${offset}`
      const rows = await sqlQuery(listWithOrder)

      const workOrders = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        requestedAt: row.requestedAt,
        dueAt: row.dueAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assetId: row.assetId,
        assignedEmployeeId: row.assignedEmployeeId,
        asset: row.assetId
          ? { id: row.assetId, name: row.asset_name, serialNumber: row.asset_serial }
          : null,
        assignedEmployee: row.assignedEmployeeId
          ? { id: row.assignedEmployeeId, firstName: row.employee_first_name, lastName: row.employee_last_name }
          : null,
      }))

      return {
        success: true,
        data: workOrders,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar ordenes' }
    }
  })

  // GET /api/techservices/work-orders/:id
  fastify.get<{ Params: { id: string } }>(
    '/api/techservices/work-orders/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      try {
        const rows = await sqlQuery(sql`
          SELECT
            w.id, w.title, w.description, w.status, w.priority, w."requestedAt", w."dueAt", w."completedAt", w."createdAt", w."updatedAt",
            w."assetId", w."assignedEmployeeId",
            a.name as asset_name, a."serialNumber" as asset_serial,
            e."firstName" as employee_first_name, e."lastName" as employee_last_name
          FROM work_orders w
          LEFT JOIN technical_assets a ON a.id = w."assetId"
          LEFT JOIN employees e ON e.id = w."assignedEmployeeId"
          WHERE w.id = ${id} AND w."companyId" = ${ctx.companyId}
          LIMIT 1
        `)

        if (rows.length === 0) {
          reply.code(404)
          return { success: false, error: 'Orden no encontrada' }
        }

        const row: any = rows[0]
        return {
          success: true,
          data: {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            requestedAt: row.requestedAt,
            dueAt: row.dueAt,
            completedAt: row.completedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            assetId: row.assetId,
            assignedEmployeeId: row.assignedEmployeeId,
            asset: row.assetId ? { id: row.assetId, name: row.asset_name, serialNumber: row.asset_serial } : null,
            assignedEmployee: row.assignedEmployeeId
              ? { id: row.assignedEmployeeId, firstName: row.employee_first_name, lastName: row.employee_last_name }
              : null,
          },
        }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al obtener orden' }
      }
    }
  )

  // POST /api/techservices/work-orders
  fastify.post<{ Body: WorkOrderInput }>(
    '/api/techservices/work-orders',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { title, description, status, priority, assetId, assignedEmployeeId, requestedAt, dueAt } = request.body

      if (!title || !title.trim()) {
        reply.code(400)
        return { success: false, error: 'El titulo es requerido' }
      }

      try {
        if (assetId) {
          const assetRows = await sqlQuery(sql`
            SELECT id FROM technical_assets WHERE id = ${assetId} AND "companyId" = ${ctx.companyId} LIMIT 1
          `)
          if (assetRows.length === 0) {
            reply.code(400)
            return { success: false, error: 'Activo invalido' }
          }
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

        const rows = await sqlQuery(sql`
          INSERT INTO work_orders (
            "companyId", "assetId", "createdByUserId", "assignedEmployeeId",
            title, description, status, priority, "requestedAt", "dueAt"
          ) VALUES (
            ${ctx.companyId}, ${assetId ?? null}, ${ctx.userId}, ${assignedEmployeeId ?? null},
            ${title.trim()}, ${description ?? null}, ${status ?? 'OPEN'}, ${priority ?? 'MEDIUM'}, ${requestedAt ? new Date(requestedAt) : new Date()}, ${dueAt ? new Date(dueAt) : null}
          )
          RETURNING id
        `)

        return { success: true, data: { id: rows[0]?.id } }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al crear orden' }
      }
    }
  )

  // PUT /api/techservices/work-orders/:id
  fastify.put<{ Params: { id: string }; Body: WorkOrderInput }>(
    '/api/techservices/work-orders/:id',
    async (request, reply) => {
      const ctx = await getTechServicesContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { title, description, status, priority, assetId, assignedEmployeeId, requestedAt, dueAt, completedAt } = request.body

      try {
        const existing = await sqlQuery(sql`
          SELECT id FROM work_orders WHERE id = ${id} AND "companyId" = ${ctx.companyId} LIMIT 1
        `)

        if (existing.length === 0) {
          reply.code(404)
          return { success: false, error: 'Orden no encontrada' }
        }

        if (assetId) {
          const assetRows = await sqlQuery(sql`
            SELECT id FROM technical_assets WHERE id = ${assetId} AND "companyId" = ${ctx.companyId} LIMIT 1
          `)
          if (assetRows.length === 0) {
            reply.code(400)
            return { success: false, error: 'Activo invalido' }
          }
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
        const values: Array<string | null | Date> = []

        if (title !== undefined) {
          updates.push(`title = $${values.length + 1}`)
          values.push(title)
        }
        if (description !== undefined) {
          updates.push(`description = $${values.length + 1}`)
          values.push(description)
        }
        if (status !== undefined) {
          updates.push(`status = $${values.length + 1}`)
          values.push(status)
        }
        if (priority !== undefined) {
          updates.push(`priority = $${values.length + 1}`)
          values.push(priority)
        }
        if (assetId !== undefined) {
          updates.push(`"assetId" = $${values.length + 1}`)
          values.push(assetId)
        }
        if (assignedEmployeeId !== undefined) {
          updates.push(`"assignedEmployeeId" = $${values.length + 1}`)
          values.push(assignedEmployeeId)
        }
        if (requestedAt !== undefined) {
          updates.push(`"requestedAt" = $${values.length + 1}`)
          values.push(requestedAt ? new Date(requestedAt) : null)
        }
        if (dueAt !== undefined) {
          updates.push(`"dueAt" = $${values.length + 1}`)
          values.push(dueAt ? new Date(dueAt) : null)
        }
        if (completedAt !== undefined) {
          updates.push(`"completedAt" = $${values.length + 1}`)
          values.push(completedAt ? new Date(completedAt) : null)
        } else if (status === 'COMPLETED') {
          updates.push(`"completedAt" = NOW()`)
        }

        if (updates.length === 0) {
          return { success: true }
        }

        const query = `
          UPDATE work_orders
          SET ${updates.join(', ')}, "updatedAt" = NOW()
          WHERE id = $${values.length + 1} AND "companyId" = $${values.length + 2}
          RETURNING id
        `

        await sqlUnsafe(query, [...values, id, ctx.companyId])
        return { success: true }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar orden' }
      }
    }
  )
}
