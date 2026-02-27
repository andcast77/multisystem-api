/**
 * Centralized configuration. Reads from process.env (populated by @fastify/env in server.ts).
 * Use this instead of process.env in lib modules (auth, db) for a single source of truth.
 */
export type AppConfig = {
  PORT: string
  CORS_ORIGIN: string
  DATABASE_URL: string
  NODE_ENV: string
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
}

export function getConfig(): AppConfig {
  return {
    PORT: process.env.PORT ?? '3000',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3003,http://localhost:3004,http://localhost:3005',
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    JWT_SECRET: process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-in-production'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  }
}
