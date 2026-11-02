import Fastify, { type FastifyServerOptions } from 'fastify'
import type { components } from '../../api/dist/schema.d.ts'
import { loadContract } from './contract.ts'
import { formatOwnerTime, freeSlots } from './slots.ts'
import { createStore } from './store.ts'

type Owner = components['schemas']['Owner']
type ApiError = components['schemas']['ApiError']
type MeetingType = components['schemas']['MeetingType']
type Slot = components['schemas']['Slot']
type CreateMeetingType = components['schemas']['CreateMeetingType']
type Meeting = components['schemas']['Meeting']
type CreateMeeting = components['schemas']['CreateMeeting']

const VALIDATION_MESSAGES: Record<string, string> = {
  required: 'Обязательное поле',
  minLength: 'Обязательное поле',
  maxLength: 'Слишком длинное значение',
  pattern: 'Неверный формат',
  format: 'Неверный формат',
  enum: 'Недопустимое значение',
  type: 'Неверный тип значения',
}

export type AppOptions = FastifyServerOptions & { now?: () => Date }

declare module 'fastify' {
  interface FastifyInstance {
    now: () => Date
    store: ReturnType<typeof createStore>
  }
}

/** Trims a string body field before schema validation, so length rules apply to the trimmed value. */
const trimBodyField = (field: string) => async (request: { body?: unknown }) => {
  const body = request.body as Record<string, unknown> | undefined
  if (typeof body?.[field] === 'string') body[field] = body[field].trim()
}

const OWNER: Owner = { name: 'Владелец календаря', timeZone: 'Europe/Moscow' }

export function buildApp({ now = () => new Date(), ...options }: AppOptions = {}) {
  const app = Fastify({
    ...options,
    ajv: { customOptions: { allErrors: true } },
  })
  app.decorate('now', now)
  app.decorate('store', createStore())

  const contract = loadContract(app)

  app.setErrorHandler((error: { statusCode?: number; validation?: unknown[] }, request, reply) => {
    if (error.validation) {
      const fields: Record<string, string> = {}
      for (const issue of error.validation as {
        instancePath: string
        params: { missingProperty?: string }
        keyword: string
      }[]) {
        const path = issue.instancePath.replace(/^\//, '').replaceAll('/', '.')
        const field = issue.params.missingProperty ?? path
        fields[field] ??= VALIDATION_MESSAGES[issue.keyword] ?? 'Некорректное значение'
      }
      return reply
        .code(400)
        .send({ code: 'validation_error', message: 'Проверьте введённые данные', fields })
    }
    const status = error.statusCode ?? 500
    if (status >= 500) {
      request.log.error(error)
      return reply
        .code(500)
        .send({ code: 'internal_error', message: 'Внутренняя ошибка сервера' } satisfies ApiError)
    }
    return reply
      .code(status)
      .send({ code: 'bad_request', message: 'Некорректный запрос' } satisfies ApiError)
  })

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ code: 'not_found', message: 'Не найдено' } satisfies ApiError),
  )

  app.get('/api/health', async () => ({ status: 'ok' }))

  app.get(
    '/api/owner',
    { schema: contract.routeSchema('OwnerApi_getOwner') },
    async (): Promise<Owner> => OWNER,
  )

  app.get(
    '/api/meeting-types',
    { schema: contract.routeSchema('MeetingTypesApi_listMeetingTypes') },
    async (): Promise<MeetingType[]> => app.store.listMeetingTypes(),
  )

  app.get<{ Params: { id: string } }>(
    '/api/meeting-types/:id',
    { schema: contract.routeSchema('MeetingTypesApi_getMeetingType') },
    async (request, reply) => {
      const meetingType = app.store.getMeetingType(request.params.id)
      if (!meetingType) {
        return reply
          .code(404)
          .send({ code: 'meeting_type_not_found', message: 'Тип встречи не найден' })
      }
      return meetingType
    },
  )

  app.get<{ Params: { id: string } }>(
    '/api/meeting-types/:id/slots',
    { schema: contract.routeSchema('MeetingTypesApi_listSlots') },
    async (request, reply): Promise<Slot[] | undefined> => {
      const meetingType = app.store.getMeetingType(request.params.id)
      if (!meetingType) {
        return reply
          .code(404)
          .send({ code: 'meeting_type_not_found', message: 'Тип встречи не найден' })
      }
      const slots = freeSlots({
        durationMinutes: meetingType.durationMinutes,
        busy: app.store.busyIntervals(),
        now: app.now(),
      })
      return slots.map(({ start, end }) => ({
        start: formatOwnerTime(start),
        end: formatOwnerTime(end),
      }))
    },
  )

  app.post<{ Body: CreateMeetingType }>(
    '/api/meeting-types',
    {
      schema: contract.routeSchema('MeetingTypesApi_createMeetingType'),
      preValidation: trimBodyField('name'),
    },
    async (request, reply) => {
      const { id, name, description = '', durationMinutes } = request.body
      const meetingType: MeetingType = { id, name, description, durationMinutes }
      if (!app.store.addMeetingType(meetingType)) {
        return reply.code(409).send({
          code: 'meeting_type_id_taken',
          message: 'Тип встречи с таким id уже существует',
        })
      }
      return reply.code(201).send(meetingType)
    },
  )

  app.get(
    '/api/meetings',
    { schema: contract.routeSchema('MeetingsApi_listUpcomingMeetings') },
    async (): Promise<Meeting[]> => {
      const current = app.now().getTime()
      return app.store
        .listMeetings()
        .filter((meeting) => new Date(meeting.end).getTime() > current)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    },
  )

  app.post<{ Body: CreateMeeting }>(
    '/api/meetings',
    {
      schema: contract.routeSchema('MeetingsApi_createMeeting'),
      preValidation: trimBodyField('guestName'),
    },
    async (request, reply) => {
      const { meetingTypeId, start, guestName, guestEmail } = request.body
      const meetingType = app.store.getMeetingType(meetingTypeId)
      if (!meetingType) {
        return reply
          .code(404)
          .send({ code: 'meeting_type_not_found', message: 'Тип встречи не найден' })
      }
      const result = app.store.bookMeeting(
        meetingType,
        { guestName, guestEmail },
        new Date(start),
        app.now(),
      )
      if ('error' in result) {
        if (result.error === 'slot_taken') {
          return reply
            .code(409)
            .send({ code: 'slot_taken', message: 'Это время уже занято. Выберите другой слот' })
        }
        return reply
          .code(422)
          .send({ code: 'slot_unavailable', message: 'Это время недоступно для записи' })
      }
      return reply.code(201).send(result.meeting)
    },
  )

  return app
}
