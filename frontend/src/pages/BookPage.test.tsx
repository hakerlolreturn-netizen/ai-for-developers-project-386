import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

type Stored = { id: string; name: string; description: string; durationMinutes: number }

let stored: Stored[]

beforeEach(() => {
  stored = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      const { pathname } = new URL(input.url)
      if (pathname === '/api/owner') {
        return Response.json({ name: 'Владелец календаря', timeZone: 'Europe/Moscow' })
      }
      if (pathname === '/api/meeting-types') return Response.json(stored)
      const found = stored.find(
        (meetingType) => pathname === `/api/meeting-types/${meetingType.id}`,
      )
      if (found) return Response.json(found)
      return Response.json(
        { code: 'meeting_type_not_found', message: 'Тип встречи не найден' },
        { status: 404 },
      )
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('шаг «Тип встречи»', () => {
  it('показывает карточки с названием, длительностью и описанием', async () => {
    stored.push(
      { id: 'intro', name: 'Знакомство', description: 'Короткий звонок', durationMinutes: 30 },
      { id: 'deep', name: 'Разбор', description: '', durationMinutes: 60 },
    )
    renderAt('/book')

    const intro = await screen.findByRole('link', { name: /Знакомство/ })
    expect(within(intro).getByText('30 мин')).toBeTruthy()
    expect(within(intro).getByText('Короткий звонок')).toBeTruthy()
    const deep = screen.getByRole('link', { name: /Разбор/ })
    expect(within(deep).getByText('60 мин')).toBeTruthy()
    expect(deep.textContent).toBe('Разбор60 мин')
  })

  it('без типов встреч сообщает, что владелец их не добавил', async () => {
    renderAt('/book')

    expect(await screen.findByText('Владелец ещё не добавил типы встреч')).toBeTruthy()
  })

  it('клик по карточке открывает шаг «Время» с выбранным типом', async () => {
    stored.push({ id: 'intro', name: 'Знакомство', description: '', durationMinutes: 45 })
    renderAt('/book')

    await userEvent.click(await screen.findByRole('link', { name: /Знакомство/ }))

    expect(await screen.findByText('Знакомство, 45 мин')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Знакомство/ })).toBeNull()
  })

  it('показывает выбранный тип при прямом открытии /book/<id>', async () => {
    stored.push({ id: 'intro', name: 'Знакомство', description: '', durationMinutes: 15 })
    renderAt('/book/intro')

    expect(await screen.findByText('Знакомство, 15 мин')).toBeTruthy()
  })

  it('неизвестный id даёт сообщение и ссылку на список', async () => {
    stored.push({ id: 'intro', name: 'Знакомство', description: '', durationMinutes: 15 })
    renderAt('/book/unknown')

    expect(await screen.findByText('Такого типа встречи нет')).toBeTruthy()
    await userEvent.click(screen.getByRole('link', { name: 'К списку типов встреч' }))

    expect(await screen.findByRole('link', { name: /Знакомство/ })).toBeTruthy()
  })
})
