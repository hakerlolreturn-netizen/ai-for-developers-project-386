# AGENTS.md

npm workspaces: `backend/` (Fastify + TypeScript, routes in `src/app.ts` under `/api`) and `frontend/` (Vite + React + Mantine, proxies `/api` to `127.0.0.1:3000`). Node from `.nvmrc`.

## Commands

Run from the repo root.

```bash
npm ci                 # install
npm run dev            # backend :3000 + frontend :5173
npm test               # vitest (backend)
npm test -w backend -- test/health.test.ts   # single test file
npm run lint           # oxlint + prettier --check
npm run format         # prettier --write
npm run typecheck      # tsc in both workspaces
npm run build          # build both workspaces
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and build on every push. Do not edit `.github/workflows/hexlet-check.yml`.

## Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`.

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `chore`.
- Breaking change: `feat!:` or a `BREAKING CHANGE:` footer.
- Summary in English, imperative mood, lowercase, no trailing period.

release-please builds `CHANGELOG.md` and the version from these messages; do not edit them by hand.
