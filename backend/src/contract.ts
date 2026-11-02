import { readFileSync } from 'node:fs'
import type { FastifyInstance, FastifySchema } from 'fastify'
import { parse } from 'yaml'

type Json = Record<string, any>

const REF_PREFIX = '#/components/schemas/'
const ID_PREFIX = 'urn:s:'

const openapiUrl = new URL('../../api/dist/openapi.yaml', import.meta.url)

function rewriteRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewriteRefs)
  if (node === null || typeof node !== 'object') return node
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      key === '$ref' && typeof value === 'string' && value.startsWith(REF_PREFIX)
        ? ID_PREFIX + value.slice(REF_PREFIX.length)
        : rewriteRefs(value),
    ]),
  )
}

/** Registers `components.schemas` of the generated OpenAPI and returns route schemas by operationId. */
export function loadContract(app: FastifyInstance) {
  const doc = rewriteRefs(parse(readFileSync(openapiUrl, 'utf8'))) as Json

  for (const [name, schema] of Object.entries<Json>(doc.components?.schemas ?? {})) {
    app.addSchema({ ...schema, $id: ID_PREFIX + name })
  }

  return {
    routeSchema(operationId: string): FastifySchema {
      for (const pathItem of Object.values<Json>(doc.paths)) {
        for (const operation of Object.values<Json>(pathItem)) {
          if (operation.operationId !== operationId) continue
          const schema: FastifySchema = {}
          const body = operation.requestBody?.content?.['application/json']?.schema
          if (body) schema.body = body
          schema.response = Object.fromEntries(
            Object.entries<Json>(operation.responses).flatMap(([status, response]) => {
              const responseSchema = response.content?.['application/json']?.schema
              return responseSchema ? [[status, responseSchema]] : []
            }),
          )
          return schema
        }
      }
      throw new Error(`Operation ${operationId} is not in the OpenAPI document`)
    },
  }
}
