import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('GET /api/meeting-types/{id}/slots', () => {
  let app: ReturnType<typeof buildApp>

  afterEach(() => app.close())

  const setup = async (now: string, durationMinutes = 30) => {
    app = buildApp({ now: () => new Date(now) })
    await app.inject({
      method: 'POST',
      url: '/api/meeting-types',
      payload: { id: 'intro', name: 'Знакомство', durationMinutes },
    })
    return app.inject({ method: 'GET', url: '/api/meeting-types/intro/slots' })
  }

  it('returns a flat sorted list with +03:00 offsets', async () => {
    const response = await setup('2026-11-02T17:10:00+03:00')

    expect(response.statusCode).toBe(200)
    const slots = response.json() as { start: string; end: string }[]
    expect(slots.slice(0, 3)).toEqual([
      { start: '2026-11-02T17:15:00+03:00', end: '2026-11-02T17:45:00+03:00' },
      { start: '2026-11-02T17:30:00+03:00', end: '2026-11-02T18:00:00+03:00' },
      { start: '2026-11-03T09:00:00+03:00', end: '2026-11-03T09:30:00+03:00' },
    ])
    expect(slots.map((slot) => slot.start)).toEqual(slots.map((slot) => slot.start).toSorted())
  })

  it('spans the 14-day window and skips weekends', async () => {
    const response = await setup('2026-11-06T10:00:00+03:00')

    const days = new Set(response.json().map((slot: { start: string }) => slot.start.slice(0, 10)))
    expect([...days]).toEqual([
      '2026-11-06',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ])
  })

  it('answers 404 meeting_type_not_found for an unknown id', async () => {
    app = buildApp()

    const response = await app.inject({ method: 'GET', url: '/api/meeting-types/unknown/slots' })

    expect(response.statusCode).toBe(404)
    expect(response.json().code).toBe('meeting_type_not_found')
  })
})
