import { describe, it, expect, beforeAll } from 'vitest'
import { SELF } from 'cloudflare:test'

describe('Health Endpoints', () => {
  it('should return health status', async () => {
    const response = await SELF.fetch('http://localhost/health')
    expect(response.status).toBe(200)

    const data = await response.json() as {
      status: string
      timestamp: string
      version: string
      database: string
    }
    expect(data.status).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(data.version).toBe('1.0.0')
    expect(data.database).toBeDefined()
  })

  it('should return API information at root', async () => {
    const response = await SELF.fetch('http://localhost/')
    expect(response.status).toBe(200)

    const data = await response.json() as {
      name: string
      version: string
      documentation: string
      admin: string
    }
    expect(data.name).toBe('Eden Server API')
    expect(data.version).toBe('1.0.0')
    expect(data.documentation).toBe('/scalar')
    expect(data.admin).toBe('/admin')
  })

  it('should serve OpenAPI documentation', async () => {
    const response = await SELF.fetch('http://localhost/doc')
    expect(response.status).toBe(200)

    const doc = await response.json() as { openapi: string; info: { title: string } }
    expect(doc.openapi).toBe('3.0.0')
    expect(doc.info.title).toBe('Eden Server API')
  })
})
