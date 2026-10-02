# Project Context

> Stable facts only. NEVER put secrets, tokens, API keys, `.env` values or private user data in any `.ai` file.

## Purpose
Aroha Astrology - a Vedic astrology app (kundli, panchang, horoscope, compatibility/matchmaking,
palm reading, Vastu, remedies, reports, gita/shlokas, AI chat "Yogi Baba / Ask Baba Ji", journal, rewards, Pass subscription).
This repository is the **web frontend**; it is also packaged as an Android app via Capacitor (see `../mobile`).

## Tech stack
- Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS 3, framer-motion
- react-three-fiber / three (3D Vastu views), recharts, react-markdown
- Firebase (auth), Capacitor plugins (firebase auth/messaging, app), PostHog analytics
- i18next / react-i18next (multi-language)
- Tests: Vitest (unit, pure logic `lib/*.test.ts`), Playwright (E2E with Firebase Auth emulator + mocked API)
- Package manager: pnpm (CI uses `pnpm install --frozen-lockfile`); an npm lockfile also exists

## Sibling projects (separate repos in the same parent folder, git-ignored here)
`../backend` (Node/TS API), `../mobile` (Capacitor Android), `../landing`, `../homespace` (separate product). Do not edit them from this workflow unless the task says so.

## Important constraints
- Do not change production/business logic unless the current task explicitly requires it.
- New features ship OFF behind a feature flag (tag `new`, `useNewFeature`), and need explicit approval before pushing.
- Never say or show "AI" in promo/marketing material; the persona is Yogi Baba.
- Windows machine; use Windows-compatible paths and shell commands.
- No secrets in the repo or in `.ai` files.

## Major modules (top-level folders)
- `app/` - routes (kundli, panchang, horoscope, compatibility, palm, vastu, ai-chat, reports, pass, admin, ...)
- `components/` - shared and per-feature UI
- `lib/` - API clients (`api.ts`, `*-api.ts`), formatting/view-model helpers and their `*.test.ts`
- `hooks/`, `providers/`, `i18n/`, `data/`, `public/`
- `e2e/` - Playwright specs and fixtures (`fixtures/mock-api.ts`, `fixtures/auth.ts`)
- `scripts/` - maintenance scripts

## Current product state
See `PROGRESS.md` for the running history and `git log` for the latest commits.
