import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import env from '@fastify/env'
import { registerRoutes } from '../../routes'

/**
 * Esquema de variables de entorno para tests
 */
const testEnvSchema = {
  type: 'object',
  required: [],
  properties: {
    PORT: {
      type: 'string',
      default: '3000'
    },
    CORS_ORIGIN: {
      type: 'string',
      default: 'http://localhost:3003,http://localhost:3004,http://localhost:3005'
    },
    DATABASE_URL: {
      type: 'string'
    },
    NODE_ENV: {
      type: 'string',
      default: 'test'
    }
  }
}

/**
 * Crea una instancia de Fastify configurada para tests
 * @param options Opciones de configuración opcionales
 * @returns Instancia de Fastify lista para usar en tests
 */
export async function buildTestServer(options?: {
  logger?: boolean
  corsOrigin?: string
}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options?.logger ?? false
  })

  // Registrar variables de entorno con valores de test
  await fastify.register(env, {
    schema: testEnvSchema,
    dotenv: false,
    data: {
      PORT: '3000',
      CORS_ORIGIN: options?.corsOrigin ?? 'http://localhost:3003,http://localhost:3004,http://localhost:3005',
      NODE_ENV: 'test'
    }
  })

  // Obtener configuración
  const config = (fastify as any).config as {
    PORT: string
    CORS_ORIGIN: string
    DATABASE_URL?: string
    NODE_ENV: string
  }

  // Registrar CORS
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN.split(',')
  })

  // Registrar rutas
  await fastify.register(registerRoutes)

  return fastify
}

/**
 * Limpia y cierra una instancia de Fastify después de los tests
 * @param fastify Instancia de Fastify a cerrar
 */
export async function closeTestServer(fastify: FastifyInstance): Promise<void> {
  await fastify.close()
}
