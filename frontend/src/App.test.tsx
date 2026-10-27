import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
}

afterEach(cleanup)

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

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeTruthy()
    expect(screen.getByText('Скоро здесь можно будет выбрать тип встречи и слот')).toBeTruthy()
  })

  it('со страницы записи можно вернуться на главную', async () => {
    renderAt('/book')

    await userEvent.click(screen.getByRole('link', { name: 'На главную' }))

    expect(screen.getByText('Выберите тип встречи')).toBeTruthy()
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

    expect(screen.getByText('Скоро здесь можно будет выбрать тип встречи и слот')).toBeTruthy()
  })

  it('«Предстоящие встречи» ведёт на страницу предстоящих встреч', async () => {
    renderAt('/')

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('link', { name: 'Предстоящие встречи' }),
    )

    expect(screen.getByText('Скоро здесь появится список предстоящих встреч')).toBeTruthy()
  })
})
