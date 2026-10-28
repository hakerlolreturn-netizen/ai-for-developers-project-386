// PROTOTYPE: заглушка API для прототипа потока гостя. Не production-код, данные только в памяти вкладки.

export type MeetingType = { id: string; name: string; description: string; durationMinutes: number }
export type Slot = { start: string; end: string }
export type Meeting = {
  id: string
  meetingType: { id: string; name: string; durationMinutes: number }
  start: string
  end: string
  guestName: string
  guestEmail: string
}
export type ApiError = { code: string; message: string; fields?: Record<string, string> }

export const owner = { name: 'Владелец календаря', timeZone: 'Europe/Moscow' }

export const meetingTypes: MeetingType[] = [
  {
    id: 'intro-call',
    name: 'Знакомство',
    description: 'Короткий звонок, чтобы познакомиться и обсудить задачу.',
    durationMinutes: 15,
  },
  {
    id: 'consultation',
    name: 'Консультация',
    description: 'Разбор конкретного вопроса по проекту.',
    durationMinutes: 30,
  },
  { id: 'deep-dive', name: 'Разбор архитектуры', description: '', durationMinutes: 60 },
]

// Europe/Moscow без перехода на летнее время: смещение постоянное.
const OFFSET_MS = 3 * 60 * 60_000
const STEP = 15
const OPEN = 9 * 60
const CLOSE = 18 * 60
const DAYS = 14

const booked: { start: number; end: number }[] = []

function moscowParts(ms: number) {
  const d = new Date(ms + OFFSET_MS)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() }
}

function iso(ms: number) {
  return new Date(ms + OFFSET_MS).toISOString().slice(0, 19) + '+03:00'
}

function dayStart(now: number, i: number) {
  const t = moscowParts(now)
  return Date.UTC(t.y, t.m, t.d + i) - OFFSET_MS
}

// Несколько занятых интервалов, чтобы в календаре были неполные дни.
for (let i = 1; i < DAYS; i += 2) {
  const base = dayStart(Date.now(), i)
  booked.push({ start: base + 10 * 3_600_000, end: base + 11 * 3_600_000 })
  booked.push({ start: base + 14.5 * 3_600_000, end: base + 15 * 3_600_000 })
}

export function getSlots(typeId: string, now = Date.now()): Slot[] {
  const type = meetingTypes.find((t) => t.id === typeId)
  if (!type) return []
  const dur = type.durationMinutes * 60_000
  const slots: Slot[] = []
  for (let i = 0; i < DAYS; i++) {
    const base = dayStart(now, i)
    const wd = moscowParts(base).wd
    if (wd === 0 || wd === 6) continue
    for (let t = OPEN; t * 60_000 + dur <= CLOSE * 60_000; t += STEP) {
      const s = base + t * 60_000
      const e = s + dur
      if (s <= now) continue
      if (booked.some((b) => s < b.end && b.start < e)) continue
      slots.push({ start: iso(s), end: iso(e) })
    }
  }
  return slots
}

export const sim = { conflictNext: false }

const delay = () => new Promise((r) => setTimeout(r, 300))

export async function createMeeting(
  typeId: string,
  start: string,
  guestName: string,
  guestEmail: string,
): Promise<{ ok: true; meeting: Meeting } | { ok: false; error: ApiError }> {
  await delay()
  const fields: Record<string, string> = {}
  if (!guestName.trim()) fields.guestName = 'Укажите имя'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) fields.guestEmail = 'Укажите корректный email'
  if (Object.keys(fields).length) {
    return { ok: false, error: { code: 'validation_error', message: 'Проверьте данные', fields } }
  }
  const type = meetingTypes.find((t) => t.id === typeId)!
  const s = new Date(start).getTime()
  const e = s + type.durationMinutes * 60_000
  if (sim.conflictNext) {
    sim.conflictNext = false
    booked.push({ start: s, end: e })
    return {
      ok: false,
      error: { code: 'slot_taken', message: 'Это время уже занято. Выберите другой слот' },
    }
  }
  if (!getSlots(typeId).some((x) => x.start === start)) {
    return {
      ok: false,
      error: { code: 'slot_unavailable', message: 'Это время недоступно для записи' },
    }
  }
  booked.push({ start: s, end: e })
  return {
    ok: true,
    meeting: {
      id: crypto.randomUUID(),
      meetingType: { id: type.id, name: type.name, durationMinutes: type.durationMinutes },
      start: iso(s),
      end: iso(e),
      guestName: guestName.trim(),
      guestEmail,
    },
  }
}

export const dayKey = (isoString: string) => isoString.slice(0, 10)
export const timeLabel = (isoString: string) => isoString.slice(11, 16)

export function groupByDay(slots: Slot[]) {
  const map = new Map<string, Slot[]>()
  for (const s of slots) map.set(dayKey(s.start), [...(map.get(dayKey(s.start)) ?? []), s])
  return map
}

export function formatDay(key: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${key}T00:00:00Z`))
}

export function windowBounds() {
  const now = Date.now()
  return { min: iso(dayStart(now, 0)).slice(0, 10), max: iso(dayStart(now, DAYS - 1)).slice(0, 10) }
}
