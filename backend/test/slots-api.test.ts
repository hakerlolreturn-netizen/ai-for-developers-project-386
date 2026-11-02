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

  const starts = (response: { json: () => unknown }) =>
    (response.json() as { start: string }[]).map((slot) => slot.start)

  it('steps every 15 minutes from 09:00 and ends the last slot at 18:00', async () => {
    const response = await setup('2026-11-02T06:00:00+03:00', 60)

    const slots = response.json() as { start: string; end: string }[]
    const monday = slots.filter((slot) => slot.start.startsWith('2026-11-02'))
    expect(monday).toHaveLength(33)
    expect(monday[0]).toEqual({
      start: '2026-11-02T09:00:00+03:00',
      end: '2026-11-02T10:00:00+03:00',
    })
    expect(monday[1]!.start).toBe('2026-11-02T09:15:00+03:00')
    expect(monday.at(-1)).toEqual({
      start: '2026-11-02T17:00:00+03:00',
      end: '2026-11-02T18:00:00+03:00',
    })
  })

  it('offers only slots strictly after now today', async () => {
    const response = await setup('2026-11-02T10:00:00+03:00')

    expect(starts(response)[0]).toBe('2026-11-02T10:15:00+03:00')
  })

  it('has no slots today after 18:00', async () => {
    const response = await setup('2026-11-02T18:00:00+03:00', 15)

    expect(starts(response)[0]).toBe('2026-11-03T09:00:00+03:00')
  })

  it('on Friday evening starts on the next working day', async () => {
    const response = await setup('2026-11-06T18:30:00+03:00')

    const days = starts(response).map((start) => start.slice(0, 10))
    expect(days[0]).toBe('2026-11-09')
    expect(days.at(-1)).toBe('2026-11-19')
  })

  it('on a Saturday the first slot is Monday 09:00', async () => {
    const response = await setup('2026-11-07T10:00:00+03:00')

    expect(starts(response)[0]).toBe('2026-11-09T09:00:00+03:00')
  })

  it('uses the owner day near UTC midnight', async () => {
    const response = await setup('2026-11-02T22:30:00Z')

    expect(starts(response)[0]).toBe('2026-11-03T09:00:00+03:00')
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
