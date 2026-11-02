// Europe/Moscow has a fixed +03:00 offset (ADR 0001), so day arithmetic is done on shifted epoch milliseconds.
const OFFSET_MS = 3 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const OPEN_MINUTES = 9 * 60
const CLOSE_MINUTES = 18 * 60
const STEP_MINUTES = 15
const WINDOW_DAYS = 14

export type Interval = { start: Date; end: Date }

/** Slots of the booking window that fit `durationMinutes` and do not overlap `busy` (half-open intervals). */
export function freeSlots({
  durationMinutes,
  busy,
  now,
}: {
  durationMinutes: number
  busy: readonly Interval[]
  now: Date
}): Interval[] {
  const slots: Interval[] = []
  const today = Math.floor((now.getTime() + OFFSET_MS) / DAY_MS)
  for (let day = today; day < today + WINDOW_DAYS; day++) {
    // Epoch day 0 is a Thursday; 0 is Monday here.
    if ((day + 3) % 7 >= 5) continue
    const midnight = day * DAY_MS - OFFSET_MS
    const lastStart = CLOSE_MINUTES - durationMinutes
    for (let minutes = OPEN_MINUTES; minutes <= lastStart; minutes += STEP_MINUTES) {
      const start = midnight + minutes * MINUTE_MS
      const end = start + durationMinutes * MINUTE_MS
      if (start <= now.getTime()) continue
      if (busy.some((b) => b.start.getTime() < end && start < b.end.getTime())) continue
      slots.push({ start: new Date(start), end: new Date(end) })
    }
  }
  return slots
}

/** ISO 8601 in the owner's zone, e.g. 2026-11-02T09:00:00+03:00. */
export function formatOwnerTime(date: Date): string {
  return `${new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 19)}+03:00`
}
