import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('GET /api/meetings', () => {
  let app: ReturnType<typeof buildApp>
  let now: Date

  afterEach(() => app.close())

  const setup = async () => {
    now = new Date('2026-11-02T10:00:00+03:00')
    app = buildApp({ now: () => now })
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

  const book = (meetingTypeId: string, start: string, guestName: string) =>
    app.inject({
      method: 'POST',
      url: '/api/meetings',
      payload: { meetingTypeId, start, guestName, guestEmail: 'guest@example.com' },
    })

  const list = async () => {
    const response = await app.inject({ method: 'GET', url: '/api/meetings' })
    expect(response.statusCode).toBe(200)
    return response.json() as { start: string; guestName: string; meetingType: { id: string } }[]
  }

  it('returns an empty list without meetings', async () => {
    await setup()
    expect(await list()).toEqual([])
  })

  it('sorts meetings of all types by start', async () => {
    await setup()
    await book('deep-dive', '2026-11-04T10:00:00+03:00', 'Третий')
    await book('intro', '2026-11-03T09:00:00+03:00', 'Первый')
    await book('intro', '2026-11-03T11:00:00+03:00', 'Второй')
    const meetings = await list()
    expect(meetings.map((meeting) => meeting.guestName)).toEqual(['Первый', 'Второй', 'Третий'])
    expect(meetings.map((meeting) => meeting.meetingType.id)).toEqual([
      'intro',
      'intro',
      'deep-dive',
    ])
    expect(meetings[0]?.start).toBe('2026-11-03T09:00:00+03:00')
  })

  it('includes a meeting in progress and excludes a finished one', async () => {
    await setup()
    await book('intro', '2026-11-03T09:00:00+03:00', 'Закончилась')
    await book('deep-dive', '2026-11-03T10:00:00+03:00', 'Идёт')
    await book('intro', '2026-11-03T12:00:00+03:00', 'Будет')

    now = new Date('2026-11-03T10:30:00+03:00')
    expect((await list()).map((meeting) => meeting.guestName)).toEqual(['Идёт', 'Будет'])

    now = new Date('2026-11-03T11:00:00+03:00')
    expect((await list()).map((meeting) => meeting.guestName)).toEqual(['Будет'])
  })
})
