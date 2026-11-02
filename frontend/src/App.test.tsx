import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  render(
    <MantineProvider>
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1 }}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </DatesProvider>
    </MantineProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      const { pathname } = new URL(input.url)
      if (pathname === '/api/owner') {
        return Response.json({ name: 'Владелец календаря', timeZone: 'Europe/Moscow' })
      }
      return Response.json({ code: 'not_found', message: 'Не найдено' }, { status: 404 })
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('главная страница', () => {
  it('рассказывает про сервис и шаги записи', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeTruthy()
    expect(screen.getByText(/Выберите удобное время для звонка/)).toBeTruthy()
    expect(screen.getByText('Выберите тип встречи')).toBeTruthy()
    expect(screen.getByText('Выберите свободный слот')).toBeTruthy()
    expect(screen.getByText('Оставьте имя и email')).toBeTruthy()
  })

  it('описывает возможности сервиса', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Возможности' })).toBeTruthy()
    expect(screen.getByText('Выбор типа встречи и удобного времени для звонка.')).toBeTruthy()
    expect(screen.getByText('Запись без регистрации: достаточно имени и email.')).toBeTruthy()
    expect(
      screen.getByText('Владелец заводит типы встреч и видит все предстоящие встречи.'),
    ).toBeTruthy()
  })

  it('кнопка «Записаться» ведёт на страницу записи', async () => {
    renderAt('/')

    await userEvent.click(
      within(screen.getByRole('main')).getByRole('link', { name: 'Записаться' }),
    )

    expect(await screen.findByText('Владелец календаря')).toBeTruthy()
  })

  it('со страницы записи можно вернуться на главную', async () => {
    renderAt('/book')

    await userEvent.click(screen.getByRole('link', { name: 'На главную' }))

    expect(screen.getByText('Выберите тип встречи')).toBeTruthy()
  })
})

describe('страница записи', () => {
  it('показывает имя владельца из API и пометку о времени по Москве', async () => {
    renderAt('/book')

    expect(await screen.findByText('Владелец календаря')).toBeTruthy()
    expect(screen.getByText(/время по Москве/)).toBeTruthy()
  })
})

describe('панель сверху', () => {
  it('показывает название сервиса', () => {
    renderAt('/')

    expect(within(screen.getByRole('banner')).getByText('Calendar')).toBeTruthy()
  })

  it('«Записаться» ведёт на страницу записи', async () => {
    renderAt('/')

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Записаться' }),
    )

    expect(await screen.findByText('Владелец календаря')).toBeTruthy()
  })

  it('«Предстоящие встречи» ведёт на страницу предстоящих встреч', async () => {
    renderAt('/')

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Предстоящие встречи' }),
    )

    expect(screen.getByText('Скоро здесь появится список предстоящих встреч')).toBeTruthy()
  })
})
