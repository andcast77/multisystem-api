import { FastifyInstance } from 'fastify'
import { workifyMeRoutes } from './me.js'
import { workifyEmployeesRoutes } from './employees.js'
import { workifyPositionsRoutes } from './positions.js'
import { workifyRolesRoutes } from './roles.js'
import { workifyHolidaysRoutes } from './holidays.js'
import { workifyWorkShiftsRoutes } from './work-shifts.js'
import { workifyTimeEntriesRoutes } from './time-entries.js'
import { workifyDashboardRoutes } from './dashboard.js'
// import { workifyAttendanceRoutes } from './attendance.js'
import { workifySpecialAssignmentsRoutes } from './special-assignments.js'

export async function workifyRoutes(fastify: FastifyInstance) {
  await fastify.register(workifyMeRoutes)
  await fastify.register(workifyEmployeesRoutes)
  await fastify.register(workifyPositionsRoutes)
  await fastify.register(workifyRolesRoutes)
  await fastify.register(workifyHolidaysRoutes)
  await fastify.register(workifyWorkShiftsRoutes)
  await fastify.register(workifyTimeEntriesRoutes)
  await fastify.register(workifyDashboardRoutes)
  // await fastify.register(workifyAttendanceRoutes)
  await fastify.register(workifySpecialAssignmentsRoutes)
}
