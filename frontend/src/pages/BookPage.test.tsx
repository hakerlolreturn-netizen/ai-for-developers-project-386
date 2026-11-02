import { MantineProvider } from '@mantine/core'
import dayjs from 'dayjs'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

type Stored = { id: string; name: string; description: string; durationMinutes: number }

type Slot = { start: string; end: string }

let stored: Stored[]
let slots: Slot[]

beforeEach(() => {
  stored = []
  slots = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      const { pathname } = new URL(input.url)
      if (pathname === '/api/owner') {
        return Response.json({ name: 'Владелец календаря', timeZone: 'Europe/Moscow' })
      }
      if (pathname === '/api/meeting-types') return Response.json(stored)
      if (pathname.endsWith('/slots')) return Response.json(slots)
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

describe('шаг «Время»', () => {
  const moscowToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(
    new Date(),
  )
  const day = (offset: number) => dayjs(moscowToday).add(offset, 'day')
  const slotAt = (offset: number, time: string): Slot => ({
    start: `${day(offset).format('YYYY-MM-DD')}T${time}:00+03:00`,
    end: `${day(offset).format('YYYY-MM-DD')}T${time}:00+03:00`,
  })
  const dayButton = (offset: number) =>
    screen.getByRole('button', { name: day(offset).format('D MMMM YYYY') }) as HTMLButtonElement

  beforeEach(() => {
    stored.push({ id: 'intro', name: 'Знакомство', description: '', durationMinutes: 30 })
    slots = [slotAt(1, '09:00'), slotAt(1, '09:15'), slotAt(3, '14:30')]
  })

  it('выключает дни без слотов и дни вне окна записи', async () => {
    renderAt('/book/intro')
    await screen.findByText('Знакомство, 30 мин')
    await screen.findByRole('button', { name: day(1).format('D MMMM YYYY') })

    expect(dayButton(1).disabled).toBe(false)
    expect(dayButton(3).disabled).toBe(false)
    expect(dayButton(2).disabled).toBe(true)
    expect(dayButton(0).disabled).toBe(true)
    expect(dayButton(14).disabled).toBe(true)
  })

  it('после выбора дня показывает кнопки со временем начала слотов этого дня', async () => {
    renderAt('/book/intro')

    await userEvent.click(await screen.findByRole('button', { name: day(1).format('D MMMM YYYY') }))

    expect(screen.getByRole('button', { name: '09:00' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '09:15' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '14:30' })).toBeNull()
  })

  it('«Далее» активна только после выбора слота', async () => {
    renderAt('/book/intro')
    await userEvent.click(await screen.findByRole('button', { name: day(1).format('D MMMM YYYY') }))
    const next = screen.getByRole('button', { name: 'Далее' }) as HTMLButtonElement
    expect(next.disabled).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: '09:15' }))

    expect(next.disabled).toBe(false)
  })

  it('«Далее» ведёт на шаг «Данные», «Назад» возвращает на «Время» с выбранным слотом', async () => {
    renderAt('/book/intro')
    await userEvent.click(await screen.findByRole('button', { name: day(1).format('D MMMM YYYY') }))
    await userEvent.click(screen.getByRole('button', { name: '09:15' }))

    await userEvent.click(screen.getByRole('button', { name: 'Далее' }))

    expect(screen.queryByRole('button', { name: '09:15' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Время/ }))
    expect(
      ((await screen.findByRole('button', { name: 'Далее' })) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('«Назад» на шаге «Время» возвращает к списку типов встреч', async () => {
    renderAt('/book/intro')

    await userEvent.click(await screen.findByRole('link', { name: 'Назад' }))

    expect(await screen.findByRole('link', { name: /Знакомство/ })).toBeTruthy()
  })
})
