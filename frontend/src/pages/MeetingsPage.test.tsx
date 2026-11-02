import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MeetingsPage from './MeetingsPage.tsx'

type Stub = {
  id: string
  meetingType: { id: string; name: string; durationMinutes: number }
  start: string
  end: string
  guestName: string
  guestEmail: string
}

const meeting = (
  id: string,
  typeName: string,
  start: string,
  end: string,
  guestName: string,
): Stub => ({
  id,
  meetingType: { id: typeName, name: typeName, durationMinutes: 30 },
  start,
  end,
  guestName,
  guestEmail: `${id}@example.com`,
})

let meetings: Stub[]
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-29T10:15:00+03:00'))
  meetings = []
  fetchMock = vi.fn(async (input: Request) => {
    const { pathname } = new URL(input.url)
    if (pathname === '/api/meetings') return Response.json(meetings)
    return Response.json({ code: 'not_found', message: 'Не найдено' }, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderPage() {
  render(
    <MantineProvider>
      <MemoryRouter>
        <MeetingsPage />
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('предстоящие встречи', () => {
  it('показывает заголовок и пустое состояние', async () => {
    renderPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Предстоящие встречи · время по Москве' }),
    ).toBeTruthy()
    expect(await screen.findByText('Предстоящих встреч нет')).toBeTruthy()
  })

  it('группирует встречи по дням и показывает строки', async () => {
    meetings = [
      meeting('a', 'Знакомство', '2026-10-29T12:00:00+03:00', '2026-10-29T12:30:00+03:00', 'Анна'),
      meeting('b', 'Разбор', '2026-10-30T09:00:00+03:00', '2026-10-30T10:00:00+03:00', 'Борис'),
    ]
    renderPage()

    expect(await screen.findByRole('heading', { name: 'четверг, 29 октября' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'пятница, 30 октября' })).toBeTruthy()
    expect(screen.getByText('12:00–12:30 · Знакомство · Анна · a@example.com')).toBeTruthy()
    expect(screen.getByText('09:00–10:00 · Разбор · Борис · b@example.com')).toBeTruthy()
    expect(screen.queryByText('идёт сейчас')).toBeNull()
    expect(screen.queryByText('Предстоящих встреч нет')).toBeNull()
  })

  it('помечает идущую встречу значком', async () => {
    meetings = [
      meeting('a', 'Знакомство', '2026-10-29T10:00:00+03:00', '2026-10-29T10:30:00+03:00', 'Анна'),
      meeting('b', 'Разбор', '2026-10-29T12:00:00+03:00', '2026-10-29T13:00:00+03:00', 'Борис'),
    ]
    renderPage()

    const rows = await screen.findAllByRole('listitem')
    expect(within(rows[0]!).getByText('идёт сейчас')).toBeTruthy()
    expect(within(rows[1]!).queryByText('идёт сейчас')).toBeNull()
  })

  it('загружает данные один раз при открытии', async () => {
    renderPage()
    await screen.findByText('Предстоящих встреч нет')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
