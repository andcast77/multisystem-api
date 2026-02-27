import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { registerRoutes } from '../../routes/index.js'

describe('health', () => {
  let app: Awaited<ReturnType<typeof Fastify>>

  beforeAll(async () => {
    app = Fastify({ logger: false })
    await registerRoutes(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns 200 and { status: "ok" }', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload)
    expect(body).toEqual({ status: 'ok' })
  })
})
