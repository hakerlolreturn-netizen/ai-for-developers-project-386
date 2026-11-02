import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('GET /api/owner', () => {
  const app = buildApp()

  afterAll(() => app.close())

  it('returns the owner profile', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/owner' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ name: 'Владелец календаря', timeZone: 'Europe/Moscow' })
  })
})
