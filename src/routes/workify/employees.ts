import { FastifyInstance } from 'fastify'
import { sql, sqlQuery } from '../../db/neon.js'
import { getWorkifyContext } from './auth-helper.js'

export async function workifyEmployeesRoutes(fastify: FastifyInstance) {
  // GET /api/workify/employees - List employees (company-scoped)
  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; departmentId?: string }
  }>('/api/workify/employees', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    const { page = '1', limit = '10', search, status, departmentId } = request.query
    const pageNum = Math.max(1, parseInt(page, 10))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)))
    const offset = (pageNum - 1) * limitNum

    try {
      let countQuery = sql`SELECT COUNT(*)::int as total FROM employees e WHERE e."companyId" = ${ctx.companyId} AND (e."isDeleted" IS NOT TRUE OR e."isDeleted" IS NULL)`
      let listQuery = sql`SELECT e.id, e."firstName", e."lastName", e."idNumber", e.status, e."dateJoined", e."departmentId", e."positionId" FROM employees e WHERE e."companyId" = ${ctx.companyId} AND (e."isDeleted" IS NOT TRUE OR e."isDeleted" IS NULL)`

      if (status) {
        countQuery = sql`${countQuery} AND e.status = ${status}`
        listQuery = sql`${listQuery} AND e.status = ${status}`
      }
      if (departmentId) {
        countQuery = sql`${countQuery} AND e."departmentId" = ${departmentId}`
        listQuery = sql`${listQuery} AND e."departmentId" = ${departmentId}`
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`
        countQuery = sql`${countQuery} AND (e."firstName" ILIKE ${term} OR e."lastName" ILIKE ${term} OR e."idNumber" ILIKE ${term})`
        listQuery = sql`${listQuery} AND (e."firstName" ILIKE ${term} OR e."lastName" ILIKE ${term} OR e."idNumber" ILIKE ${term})`
      }

      const countResult = await sqlQuery(countQuery) as Array<{ total: number }>
      const total = countResult[0]?.total ?? 0

      const listWithOrder = sql`${listQuery} ORDER BY e."lastName", e."firstName" LIMIT ${limitNum} OFFSET ${offset}`
      const rows = (await sqlQuery(listWithOrder)) as Array<{
        id: string
        firstName: string
        lastName: string
        idNumber: string | null
        status: string
        dateJoined: Date
        departmentId: string | null
        positionId: string | null
      }>

      const employees = rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        idNumber: r.idNumber ?? '',
        status: r.status,
        dateJoined: r.dateJoined,
        departmentId: r.departmentId,
        positionId: r.positionId,
      }))

      return {
        success: true,
        employees,
        total,
        page: pageNum,
        limit: limitNum,
      }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al listar empleados' }
    }
  })

  // GET /api/workify/employees/:id - Get one employee
  fastify.get<{ Params: { id: string } }>('/api/workify/employees/:id', async (request, reply) => {
    const ctx = await getWorkifyContext(request, reply)
    if (!ctx) return

    const { id } = request.params
    try {
      const rows = (await sql`
        SELECT e.id, e."companyId", e."departmentId", e."positionId", e."userId", e."idNumber",
          e."firstName", e."lastName", e."birthDate", e.gender, e."dateJoined", e.status,
          e."customSalaryAmount", e."customSalaryType", e."customOvertimeEligible", e."createdAt", e."updatedAt"
        FROM employees e
        WHERE e.id = ${id} AND e."companyId" = ${ctx.companyId}
        LIMIT 1
      `) as Array<Record<string, unknown>>

      if (rows.length === 0) {
        reply.code(404)
        return { success: false, error: 'Empleado no encontrado' }
      }

      return { success: true, employee: rows[0] }
    } catch (error) {
      fastify.log.error(error)
      reply.code(500)
      return { success: false, error: error instanceof Error ? error.message : 'Error al obtener empleado' }
    }
  })

  // GET /api/workify/employees/:id/attendance - Employee attendance (optional month)
  fastify.get<{ Params: { id: string }; Querystring: { month?: string } }>(
    '/api/workify/employees/:id/attendance',
    async (request, reply) => {
      const ctx = await getWorkifyContext(request, reply)
      if (!ctx) return

      const { id } = request.params
      const { month } = request.query
      try {
        let query = sql`
          SELECT te.id, te.date, te."clockIn", te."clockOut", te."breakStart", te."breakEnd", te.notes
          FROM time_entries te
          JOIN employees e ON e.id = te."employeeId"
          WHERE e.id = ${id} AND e."companyId" = ${ctx.companyId}
        `
        if (month) {
          query = sql`${query} AND te.date >= date_trunc('month', ${month}::date)::date AND te.date < (date_trunc('month', ${month}::date) + interval '1 month')::date`
        }
        query = sql`${query} ORDER BY te.date DESC`

        const rows = (await sqlQuery(query)) as Array<Record<string, unknown>>
        return { success: true, attendance: rows }
      } catch (error) {
        fastify.log.error(error)
        reply.code(500)
        return { success: false, error: error instanceof Error ? error.message : 'Error al obtener asistencia' }
      }
    }
  )
}
