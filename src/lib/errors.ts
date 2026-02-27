import { FastifyReply } from 'fastify'

const DEFAULT_UNAUTHORIZED = 'Token de autenticación requerido'
const DEFAULT_FORBIDDEN = 'No tienes permiso para realizar esta acción'
const DEFAULT_NOT_FOUND = 'Recurso no encontrado'
const DEFAULT_BAD_REQUEST = 'Solicitud inválida'
const DEFAULT_SERVER_ERROR = 'Error interno del servidor'

export function sendUnauthorized(reply: FastifyReply, message?: string) {
  reply.code(401)
  return { success: false, error: message ?? DEFAULT_UNAUTHORIZED }
}

export function sendForbidden(reply: FastifyReply, message?: string) {
  reply.code(403)
  return { success: false, error: message ?? DEFAULT_FORBIDDEN }
}

export function sendNotFound(reply: FastifyReply, message?: string) {
  reply.code(404)
  return { success: false, error: message ?? DEFAULT_NOT_FOUND }
}

export function sendBadRequest(reply: FastifyReply, message?: string) {
  reply.code(400)
  return { success: false, error: message ?? DEFAULT_BAD_REQUEST }
}

export function sendServerError(
  reply: FastifyReply,
  err: unknown,
  log?: { error: (err: unknown) => void },
  publicMessage = DEFAULT_SERVER_ERROR
) {
  if (log) {
    log.error(err)
  }
  reply.code(500)
  return {
    success: false,
    error: publicMessage,
    ...(process.env.NODE_ENV !== 'production' && {
      message: err instanceof Error ? err.message : 'Error desconocido',
    }),
  }
}

/**
 * Registers a global error handler so unhandled errors return 500 with consistent format.
 */
export function registerErrorHandler(
  fastify: {
    setErrorHandler: (handler: (error: Error, request: unknown, reply: FastifyReply) => Promise<void> | void) => void
    log?: { error: (err: unknown) => void }
  }
) {
  fastify.setErrorHandler((error, _request, reply) => {
    if (reply.sent) return
    if (fastify.log) fastify.log.error(error)
    reply.code(500)
    void reply.send({
      success: false,
      error: DEFAULT_SERVER_ERROR,
      ...(process.env.NODE_ENV !== 'production' && { message: error.message }),
    })
  })
}
