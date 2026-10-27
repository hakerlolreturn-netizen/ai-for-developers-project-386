import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen } from '@testing-library/react'
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

  it('кнопка «Записаться» ведёт на страницу записи', async () => {
    renderAt('/')

    await userEvent.click(screen.getByRole('link', { name: 'Записаться' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Запись на звонок' })).toBeTruthy()
    expect(screen.getByText('Скоро здесь можно будет выбрать тип встречи и слот')).toBeTruthy()
  })

  it('со страницы записи можно вернуться на главную', async () => {
    renderAt('/book')

    await userEvent.click(screen.getByRole('link', { name: 'На главную' }))

    expect(screen.getByRole('link', { name: 'Записаться' })).toBeTruthy()
  })
})
