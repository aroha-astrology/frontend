# Architecture

## Frontend
- Next.js App Router in `app/`. Each feature has a route folder; UI pieces live in `components/<feature>/`.
- `lib/api.ts` is the base HTTP client; feature clients (`bonds-api.ts`, `palm-api.ts`, `pass-api.ts`, ...) build on it.
  The API base URL comes from `NEXT_PUBLIC_API_BASE_URL` (value not recorded here).
- Pure formatting/view-model logic is kept in `lib/*.ts` with sibling `*.test.ts` unit tests.
- `lib/firebase.ts` sets up Firebase Auth; in E2E it connects to the auth emulator.
- `providers/` wraps app-wide context (theme, i18n, auth, analytics).
- `components/FeatureGuard.tsx` / `NewFeatureGuard.tsx` gate features; `lib/feature-filter.ts` filters by flag.

## Backend (separate repo `../backend`)
Node/TypeScript API consumed over HTTPS with Firebase ID tokens. Frontend never talks to the database directly.

## Data flow
UI component -> `lib/*-api.ts` -> backend API (auth token attached) -> JSON -> `lib/*-view.ts`/format helpers -> React state -> render.

## Testing
- `pnpm test` -> Vitest (`vitest run`)
- `pnpm exec tsc --noEmit` -> typecheck (also run in CI)
- `pnpm lint` -> `next lint`
- `pnpm test:e2e` -> Playwright against a production build on port 3100 (auth emulator + mock API; never reaches real backend)
- `pnpm build` -> Next production build

## Conventions
- TypeScript strict; path alias `@/*` -> `./*`.
- Tests sit next to the code (`lib/x.ts` + `lib/x.test.ts`); each bug fix gets a test.
- Match surrounding style, comment density and naming. Edit files with LF/CRLF preserved.
- Conventional-commit style messages (commitlint in sibling repos).

## Hybrid AI workflow (this folder's tooling)
Cloud planner -> `.ai/*.md` handoff files -> MCP tool `run_local_coder` (`tools/local_agent/mcp_server.py`)
-> Antigravity SDK local agent -> Ollama `qwen3:8b` -> same workspace -> `.ai/LOCAL_RESULT.md` -> cloud planner verifies via git diff + tests.
