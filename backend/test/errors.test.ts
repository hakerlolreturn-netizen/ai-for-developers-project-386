import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('error format', () => {
  const app = buildApp()
  app.post(
    '/api/echo',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: { name: { type: 'string' }, email: { type: 'string' } },
        },
      },
    },
    async (request) => request.body,
  )
  app.get('/api/boom', async () => {
    throw new Error('secret')
  })

  afterAll(() => app.close())

  it('reports validation errors per field', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/echo', payload: {} })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.code).toBe('validation_error')
    expect(typeof body.message).toBe('string')
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'name'])
  })

  it('reports unknown routes as not_found', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/nope' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ code: 'not_found', message: 'Не найдено' })
  })

  it('hides details of unexpected errors', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/boom' })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      code: 'internal_error',
      message: 'Внутренняя ошибка сервера',
    })
  })
})

describe('current time option', () => {
  it('defaults to the system clock', () => {
    const app = buildApp()
    const before = Date.now()
    const now = app.now().getTime()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(Date.now())
  })

  it('uses the supplied clock', () => {
    const fixed = new Date('2026-10-30T12:00:00+03:00')
    const app = buildApp({ now: () => fixed })
    expect(app.now()).toBe(fixed)
  })
})
