import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('POST /api/meetings', () => {
  let app: ReturnType<typeof buildApp>

  afterEach(() => app.close())

  const setup = async () => {
    app = buildApp({ now: () => new Date('2026-11-02T10:00:00+03:00') })
    for (const [id, durationMinutes] of [
      ['intro', 30],
      ['deep-dive', 60],
    ] as const) {
      await app.inject({
        method: 'POST',
        url: '/api/meeting-types',
        payload: { id, name: id, durationMinutes },
      })
    }
  }

  const book = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/meetings',
      payload: {
        meetingTypeId: 'intro',
        start: '2026-11-03T09:00:00+03:00',
        guestName: 'Анна',
        guestEmail: 'anna@example.com',
        ...payload,
      },
    })

  const slotStarts = async (id: string) => {
    const response = await app.inject({ method: 'GET', url: `/api/meeting-types/${id}/slots` })
    return (response.json() as { start: string }[]).map((slot) => slot.start)
  }

  it('creates a meeting with a server id and computed end', async () => {
    await setup()

    const response = await book({ guestName: '  Анна  ' })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      meetingType: { id: 'intro', name: 'intro', durationMinutes: 30 },
      start: '2026-11-03T09:00:00+03:00',
      end: '2026-11-03T09:30:00+03:00',
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    })
  })

  it('compares start as an instant regardless of offset', async () => {
    await setup()

    const response = await book({ start: '2026-11-03T06:00:00Z' })

    expect(response.statusCode).toBe(201)
    expect(response.json().start).toBe('2026-11-03T09:00:00+03:00')
  })

  it('answers 400 validation_error with fields', async () => {
    await setup()

    const response = await book({ guestName: '   ', guestEmail: 'not-an-email' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'validation_error',
      fields: { guestName: expect.any(String), guestEmail: expect.any(String) },
    })
  })

  it('rejects a name over 100 characters', async () => {
    await setup()

    const response = await book({ guestName: 'a'.repeat(101) })

    expect(response.statusCode).toBe(400)
    expect(response.json().fields).toHaveProperty('guestName')
  })

  it('accepts a 100-character name padded with spaces', async () => {
    await setup()

    const response = await book({ guestName: `  ${'a'.repeat(100)}  ` })

    expect(response.statusCode).toBe(201)
    expect(response.json().guestName).toBe('a'.repeat(100))
  })

  it('reports a blank name as required', async () => {
    await setup()

    const response = await book({ guestName: '   ' })

    expect(response.json().fields.guestName).toBe('Обязательное поле')
  })

  it('answers 404 meeting_type_not_found for an unknown type', async () => {
    await setup()

    const response = await book({ meetingTypeId: 'unknown' })

    expect(response.statusCode).toBe(404)
    expect(response.json().code).toBe('meeting_type_not_found')
  })

  it.each([
    ['in the past', '2026-11-02T09:00:00+03:00'],
    ['outside the window', '2026-11-16T09:00:00+03:00'],
    ['on a weekend', '2026-11-07T10:00:00+03:00'],
    ['off the start step', '2026-11-03T09:10:00+03:00'],
    ['before working hours', '2026-11-03T08:45:00+03:00'],
    ['ending after working hours', '2026-11-03T17:45:00+03:00'],
  ])('answers 422 slot_unavailable for a start %s', async (_reason, start) => {
    await setup()

    const response = await book({ start })

    expect(response.statusCode).toBe(422)
    expect(response.json()).toEqual({
      code: 'slot_unavailable',
      message: 'Это время недоступно для записи',
    })
  })

  it('rejects a start that overlaps an existing meeting', async () => {
    await setup()
    await book({})

    const response = await book({ start: '2026-11-03T09:15:00+03:00', guestEmail: 'b@example.com' })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({
      code: 'slot_taken',
      message: 'Это время уже занято. Выберите другой слот',
    })
  })

  it('treats intervals as half-open', async () => {
    await setup()
    await book({ meetingTypeId: 'deep-dive', start: '2026-11-03T10:00:00+03:00' })

    const inside = await book({ start: '2026-11-03T10:30:00+03:00' })
    const adjacent = await book({ start: '2026-11-03T11:00:00+03:00' })

    expect(inside.statusCode).toBe(409)
    expect(adjacent.statusCode).toBe(201)
  })

  it('accepts exactly one of two parallel overlapping requests of different types', async () => {
    await setup()

    const responses = await Promise.all([
      book({ meetingTypeId: 'deep-dive', start: '2026-11-03T10:00:00+03:00' }),
      book({ meetingTypeId: 'intro', start: '2026-11-03T10:30:00+03:00' }),
    ])

    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409])
  })

  it('removes the booked slot and overlapping slots of other types', async () => {
    await setup()
    expect(await slotStarts('deep-dive')).toContain('2026-11-03T09:00:00+03:00')

    await book({})

    const starts = await slotStarts('deep-dive')
    expect(starts).not.toContain('2026-11-03T09:00:00+03:00')
    expect(starts).not.toContain('2026-11-03T09:15:00+03:00')
    expect(starts).toContain('2026-11-03T09:30:00+03:00')
    expect(await slotStarts('intro')).not.toContain('2026-11-03T09:15:00+03:00')
  })

  it('lets one email book several non-overlapping meetings', async () => {
    await setup()

    const first = await book({})
    const second = await book({ start: '2026-11-03T09:30:00+03:00' })

    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
  })
})
