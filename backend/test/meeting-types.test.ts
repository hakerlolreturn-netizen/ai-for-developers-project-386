import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('meeting types', () => {
  let app: ReturnType<typeof buildApp>

  beforeEach(() => {
    app = buildApp()
  })

  afterEach(() => app.close())

  const create = (payload: unknown) =>
    app.inject({ method: 'POST', url: '/api/meeting-types', payload: payload as object })

  const valid = {
    id: 'intro',
    name: 'Знакомство',
    description: 'Короткий звонок',
    durationMinutes: 30,
  }

  it('starts with no meeting types', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/meeting-types' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([])
  })

  it('creates a meeting type and lists it', async () => {
    const created = await create(valid)

    expect(created.statusCode).toBe(201)
    expect(created.json()).toEqual(valid)
    const list = await app.inject({ method: 'GET', url: '/api/meeting-types' })
    expect(list.json()).toEqual([valid])
  })

  it('trims the name and defaults the description to an empty string', async () => {
    const created = await create({ id: 'intro', name: '  Знакомство  ', durationMinutes: 15 })

    expect(created.statusCode).toBe(201)
    expect(created.json()).toEqual({
      id: 'intro',
      name: 'Знакомство',
      description: '',
      durationMinutes: 15,
    })
  })

  it('accepts boundary lengths', async () => {
    const created = await create({
      id: 'a'.repeat(50),
      name: 'н'.repeat(100),
      description: 'о'.repeat(500),
      durationMinutes: 60,
    })

    expect(created.statusCode).toBe(201)
  })

  it('rejects a repeated id and keeps the existing meeting type', async () => {
    await create(valid)

    const repeated = await create({ ...valid, name: 'Другое', durationMinutes: 60 })

    expect(repeated.statusCode).toBe(409)
    expect(repeated.json()).toEqual({
      code: 'meeting_type_id_taken',
      message: 'Тип встречи с таким id уже существует',
    })
    const list = await app.inject({ method: 'GET', url: '/api/meeting-types' })
    expect(list.json()).toEqual([valid])
  })

  it.each([
    ['empty id', { id: '' }, 'id'],
    ['uppercase id', { id: 'Intro' }, 'id'],
    ['double hyphen id', { id: 'a--b' }, 'id'],
    ['trailing hyphen id', { id: 'a-' }, 'id'],
    ['too long id', { id: 'a'.repeat(51) }, 'id'],
    ['missing name', { name: undefined }, 'name'],
    ['blank name', { name: '   ' }, 'name'],
    ['too long name', { name: 'н'.repeat(101) }, 'name'],
    ['too long description', { description: 'о'.repeat(501) }, 'description'],
    ['unsupported duration', { durationMinutes: 20 }, 'durationMinutes'],
    ['missing duration', { durationMinutes: undefined }, 'durationMinutes'],
  ])('rejects %s with a field error', async (_label, override, field) => {
    const response = await create({ ...valid, ...override })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.code).toBe('validation_error')
    expect(Object.keys(body.fields)).toEqual([field])
    expect(body.fields[field]).toMatch(/[а-я]/i)
    const list = await app.inject({ method: 'GET', url: '/api/meeting-types' })
    expect(list.json()).toEqual([])
  })
})
