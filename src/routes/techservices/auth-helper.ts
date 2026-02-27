/**
 * Tech services use the same company-scoped context as Workify.
 * Re-export for preHandler and context helper.
 */
export { contextFromRequest, requireWorkifyContext as requireTechServicesContext } from '../../lib/auth-context.js'
