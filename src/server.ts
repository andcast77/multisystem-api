import Fastify from 'fastify'
import cors from '@fastify/cors'
import env from '@fastify/env'
import { registerRoutes } from './routes/index.js'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fastify = Fastify({ logger: true })

// Esquema de variables de entorno
const envSchema = {
  type: 'object',
  required: ['DATABASE_URL'],
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
      default: 'development'
    }
  }
}

async function start() {
  try {
    // Registrar y validar variables de entorno
    // Ruta explícita a .env (raíz del proyecto) para que funcione desde cualquier directorio de trabajo
    const envPath = join(__dirname, '..', '.env')
    const dotenvConfig = existsSync(envPath) ? { path: envPath } : false
    await fastify.register(env, {
      schema: envSchema,
      dotenv: dotenvConfig
    })

    // Obtener configuración validada (disponible después de registrar @fastify/env)
    const config = (fastify as any).config as {
      PORT: string
      CORS_ORIGIN: string
      DATABASE_URL: string
      NODE_ENV: string
    }

    // Registrar CORS con orígenes desde .env
    await fastify.register(cors, {
      origin: config.CORS_ORIGIN.split(',')
    })

    // Registrar rutas
    await fastify.register(registerRoutes)

    // Iniciar servidor
    const port = parseInt(config.PORT, 10)
    await fastify.listen({ port, host: '0.0.0.0' })
    
    console.log(`🚀 API server listening on port ${port}`)
    console.log(`📋 CORS origins: ${config.CORS_ORIGIN}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
