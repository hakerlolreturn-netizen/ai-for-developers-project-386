import Fastify, { type FastifyServerOptions } from 'fastify'
import type { components } from '../../api/dist/schema.d.ts'
import { loadContract } from './contract.ts'

type Owner = components['schemas']['Owner']
type ApiError = components['schemas']['ApiError']

export type AppOptions = FastifyServerOptions & { now?: () => Date }

declare module 'fastify' {
  interface FastifyInstance {
    now: () => Date
  }
}

const OWNER: Owner = { name: 'Владелец календаря', timeZone: 'Europe/Moscow' }

export function buildApp({ now = () => new Date(), ...options }: AppOptions = {}) {
  const app = Fastify({
    ...options,
    ajv: { customOptions: { allErrors: true } },
  })
  app.decorate('now', now)

  const contract = loadContract(app)

  app.setErrorHandler((error: { statusCode?: number; validation?: unknown[] }, request, reply) => {
    if (error.validation) {
      const fields: Record<string, string> = {}
      for (const issue of error.validation as {
        instancePath: string
        params: { missingProperty?: string }
        message?: string
      }[]) {
        const path = issue.instancePath.replace(/^\//, '').replaceAll('/', '.')
        const field = issue.params.missingProperty ?? path
        fields[field] ??= issue.message ?? 'invalid'
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

  return app
}
