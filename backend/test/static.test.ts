import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.ts'

describe('static frontend', () => {
  const staticDir = mkdtempSync(join(tmpdir(), 'frontend-'))
  writeFileSync(join(staticDir, 'index.html'), '<div id="root"></div>')
  writeFileSync(join(staticDir, 'favicon.svg'), '<svg/>')
  const app = buildApp({ staticDir })

  afterAll(async () => {
    await app.close()
    rmSync(staticDir, { recursive: true })
  })

  it('serves files from the static dir', async () => {
    const response = await app.inject({ method: 'GET', url: '/favicon.svg' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toBe('<svg/>')
  })

  it.each(['/', '/meetings', '/book/abc'])('serves index.html for %s', async (url) => {
    const response = await app.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toBe('<div id="root"></div>')
  })

  it('keeps JSON 404 for unknown API routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ code: 'not_found', message: 'Не найдено' })
  })
})
