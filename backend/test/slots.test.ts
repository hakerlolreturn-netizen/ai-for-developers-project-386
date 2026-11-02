import { describe, expect, it } from 'vitest'
import { formatOwnerTime, freeSlots } from '../src/slots.ts'

const at = (iso: string) => new Date(iso)
const startsOn = (day: string, slots: { start: Date }[]) =>
  slots.map((slot) => formatOwnerTime(slot.start)).filter((start) => start.startsWith(day))
const days = (slots: { start: Date }[]) => [
  ...new Set(slots.map((slot) => formatOwnerTime(slot.start).slice(0, 10))),
]

// 2026-11-02 is a Monday.
const MONDAY_MORNING = at('2026-11-02T06:00:00+03:00')

describe('freeSlots', () => {
  it('starts every 15 minutes from 09:00 and ends the last slot at 18:00', () => {
    const slots = freeSlots({ durationMinutes: 60, busy: [], now: MONDAY_MORNING })
    const monday = slots.filter((slot) => formatOwnerTime(slot.start).startsWith('2026-11-02'))

    expect(startsOn('2026-11-02', slots).slice(0, 2)).toEqual([
      '2026-11-02T09:00:00+03:00',
      '2026-11-02T09:15:00+03:00',
    ])
    expect(startsOn('2026-11-02', slots).at(-1)).toBe('2026-11-02T17:00:00+03:00')
    expect(formatOwnerTime(monday.at(-1)!.end)).toBe('2026-11-02T18:00:00+03:00')
    expect(monday).toHaveLength(33)
  })

  it('covers today and the next 13 days and skips weekends', () => {
    const slots = freeSlots({ durationMinutes: 30, busy: [], now: MONDAY_MORNING })

    expect(days(slots)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ])
  })

  it('on Friday evening the window starts on the next working day', () => {
    const slots = freeSlots({
      durationMinutes: 30,
      busy: [],
      now: at('2026-11-06T18:30:00+03:00'),
    })

    expect(days(slots)[0]).toBe('2026-11-09')
    expect(days(slots).at(-1)).toBe('2026-11-19')
  })

  it('on a Saturday the first slot is on Monday at 09:00', () => {
    const slots = freeSlots({
      durationMinutes: 30,
      busy: [],
      now: at('2026-11-07T10:00:00+03:00'),
    })

    expect(formatOwnerTime(slots[0]!.start)).toBe('2026-11-09T09:00:00+03:00')
  })

  it('after 18:00 today has no slots', () => {
    const slots = freeSlots({
      durationMinutes: 15,
      busy: [],
      now: at('2026-11-02T18:00:00+03:00'),
    })

    expect(startsOn('2026-11-02', slots)).toEqual([])
    expect(startsOn('2026-11-03', slots)[0]).toBe('2026-11-03T09:00:00+03:00')
  })

  it('today only has slots strictly after now', () => {
    const slots = freeSlots({
      durationMinutes: 30,
      busy: [],
      now: at('2026-11-02T10:00:00+03:00'),
    })

    expect(startsOn('2026-11-02', slots)[0]).toBe('2026-11-02T10:15:00+03:00')
  })

  it('uses the owner day near UTC midnight', () => {
    const slots = freeSlots({
      durationMinutes: 30,
      busy: [],
      now: at('2026-11-02T22:30:00Z'),
    })

    expect(days(slots)[0]).toBe('2026-11-03')
  })
})

describe('freeSlots busy intervals', () => {
  const busy = [{ start: at('2026-11-02T10:00:00+03:00'), end: at('2026-11-02T11:00:00+03:00') }]
  const monday = () =>
    startsOn('2026-11-02', freeSlots({ durationMinutes: 30, busy, now: MONDAY_MORNING }))

  it('excludes overlapping slots', () => {
    expect(monday()).not.toContain('2026-11-02T09:45:00+03:00')
    expect(monday()).not.toContain('2026-11-02T10:00:00+03:00')
    expect(monday()).not.toContain('2026-11-02T10:45:00+03:00')
  })

  it('keeps slots that only touch the busy interval', () => {
    expect(monday()).toContain('2026-11-02T09:30:00+03:00')
    expect(monday()).toContain('2026-11-02T11:00:00+03:00')
  })
})
