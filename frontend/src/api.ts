import createClient from 'openapi-fetch'
import type { paths } from '../../api/dist/schema.d.ts'

export const api = createClient<paths>({
  baseUrl: globalThis.location.origin,
  // Resolve fetch per call so tests can stub globalThis.fetch.
  fetch: (request) => globalThis.fetch(request),
})
