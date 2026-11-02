import Fastify, { type FastifyServerOptions } from 'fastify'
import type { components } from '../../api/dist/schema.d.ts'
import { loadContract } from './contract.ts'
import { createStore } from './store.ts'

type Owner = components['schemas']['Owner']
type ApiError = components['schemas']['ApiError']
type MeetingType = components['schemas']['MeetingType']
type CreateMeetingType = components['schemas']['CreateMeetingType']

const VALIDATION_MESSAGES: Record<string, string> = {
  required: 'Обязательное поле',
  minLength: 'Обязательное поле',
  maxLength: 'Слишком длинное значение',
  pattern: 'Неверный формат',
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

  app.post<{ Body: CreateMeetingType }>(
    '/api/meeting-types',
    { schema: contract.routeSchema('MeetingTypesApi_createMeetingType') },
    async (request, reply) => {
      const { id, name, description = '', durationMinutes } = request.body
      const meetingType: MeetingType = { id, name: name.trim(), description, durationMinutes }
      if (!app.store.addMeetingType(meetingType)) {
        return reply.code(409).send({
          code: 'meeting_type_id_taken',
          message: 'Тип встречи с таким id уже существует',
        })
      }
      return reply.code(201).send(meetingType)
    },
  )

  return app
}
