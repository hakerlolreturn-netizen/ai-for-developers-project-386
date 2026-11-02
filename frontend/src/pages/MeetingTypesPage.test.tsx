import { MantineProvider } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'

type Stored = { id: string; name: string; description: string; durationMinutes: number }

let stored: Stored[]
let posted: unknown[]

beforeEach(() => {
  stored = []
  posted = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request) => {
      const { pathname } = new URL(input.url)
      if (pathname !== '/api/meeting-types') {
        return Response.json({ code: 'not_found', message: 'Не найдено' }, { status: 404 })
      }
      if (input.method === 'GET') return Response.json(stored)
      const body = (await input.json()) as Omit<Stored, 'description'> & { description?: string }
      posted.push(body)
      if (stored.some((meetingType) => meetingType.id === body.id)) {
        return Response.json(
          { code: 'meeting_type_id_taken', message: 'Тип встречи с таким id уже существует' },
          { status: 409 },
        )
      }
      const meetingType = { ...body, description: body.description ?? '' }
      stored.push(meetingType)
      return Response.json(meetingType, { status: 201 })
    }),
  )
})

afterEach(() => {
  cleanup()
  notifications.clean()
  vi.unstubAllGlobals()
})

async function openPage() {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
  )
  await userEvent.click(
    within(screen.getByRole('banner')).getByRole('link', { name: 'Типы встреч' }),
  )
  await screen.findByRole('heading', { name: 'Типы встреч' })
}

async function fillAndSubmit(id: string, name: string) {
  await userEvent.type(screen.getByLabelText('Идентификатор'), id)
  await userEvent.type(screen.getByLabelText('Название'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Создать' }))
}

describe('типы встреч владельца', () => {
  it('кнопка в шапке ведёт на страницу типов встреч', async () => {
    await openPage()

    expect(await screen.findByText('Типов встреч пока нет')).toBeTruthy()
  })

  it('показывает предпросмотр адреса записи', async () => {
    await openPage()

    await userEvent.type(screen.getByLabelText('Идентификатор'), 'intro')

    expect(screen.getByText('/book/intro')).toBeTruthy()
  })

  it('создаёт тип встречи, очищает форму и показывает его в таблице', async () => {
    await openPage()
    await userEvent.type(screen.getByLabelText('Описание'), 'Короткий звонок')
    await userEvent.click(screen.getByText('45'))

    await fillAndSubmit('intro', 'Знакомство')

    expect(await screen.findByText('Тип встречи создан')).toBeTruthy()
    const row = await screen.findByRole('row', { name: /intro/ })
    expect(within(row).getByText('Знакомство')).toBeTruthy()
    expect(within(row).getByText('45 мин')).toBeTruthy()
    expect(within(row).getByText('Короткий звонок')).toBeTruthy()
    expect(posted).toEqual([
      { id: 'intro', name: 'Знакомство', description: 'Короткий звонок', durationMinutes: 45 },
    ])
    expect((screen.getByLabelText('Идентификатор') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Название') as HTMLInputElement).value).toBe('')
  })

  it('по умолчанию выбрана длительность 30 минут', async () => {
    await openPage()

    await fillAndSubmit('intro', 'Знакомство')

    await screen.findByText('Тип встречи создан')
    expect(posted).toEqual([expect.objectContaining({ durationMinutes: 30 })])
  })

  it('показывает ошибку повтора id у поля и не меняет таблицу', async () => {
    stored.push({ id: 'intro', name: 'Старый', description: '', durationMinutes: 15 })
    await openPage()

    await fillAndSubmit('intro', 'Новый')

    expect(await screen.findByText('Тип встречи с таким id уже существует')).toBeTruthy()
    expect(screen.getByLabelText('Идентификатор').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Старый')).toBeTruthy()
    expect(screen.queryByText('Новый', { selector: 'td' })).toBeNull()
    expect(screen.queryByText('Тип встречи создан')).toBeNull()
  })
})
