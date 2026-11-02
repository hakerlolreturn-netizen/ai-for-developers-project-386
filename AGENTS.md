# AGENTS.md

npm workspaces: `api/` (TypeSpec contract, `api/main.tsp`), `backend/` (Fastify + TypeScript, routes in `src/app.ts` under `/api`), `frontend/` (Vite + React + Mantine, proxies `/api` to `127.0.0.1:3000`, or to `API_URL` if set) and `e2e/` (Playwright, Chromium). Node from `.nvmrc`.

## Commands

Run from the repo root.

```bash
npm ci                 # install
npm run gen            # TypeSpec -> api/dist/openapi.yaml + schema.d.ts (runs before dev, typecheck, test, build)
npm run dev            # backend :3000 + frontend :5173
npm test               # vitest (backend and frontend)
npm test -w backend -- test/health.test.ts   # single test file (run `npm run gen` first)
npm run lint           # oxlint + prettier --check
npm run format         # prettier --write
npm run typecheck      # tsc in every workspace
npm run build          # build backend and frontend
npm run e2e            # Playwright against a real backend and frontend on ports 3100/5273
npm run check          # gen, lint, typecheck, test, build, e2e in sequence, stops at the first failure
```

`npm run check` is the one command that runs all checks, locally and in CI (`.github/workflows/ci.yml`, on every push). First run `npx playwright install chromium` once. Do not edit `.github/workflows/hexlet-check.yml`.

## Generated files

`api/dist/openapi.yaml` and `api/dist/schema.d.ts` are produced by `npm run gen` from `api/main.tsp`. They are not committed and CI regenerates them. Never edit them by hand: change the TypeSpec and regenerate.

## Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`.

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `chore`.
- Breaking change: `feat!:` or a `BREAKING CHANGE:` footer.
- Summary in English, imperative mood, lowercase, no trailing period.

release-please builds `CHANGELOG.md` and the version from these messages; do not edit them by hand.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `hakerlolreturn-netizen/ai-for-developers-project-386` (`gh` CLI). See `docs/agents/issue-tracker.md`.

Коммит реализации ссылается на тикет, который он закрывает, например feat: запись на свободный слот (#12)

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
