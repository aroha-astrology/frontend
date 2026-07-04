# Home "Moon Sign Horoscope" → Today / Personal / Guna tabs — design

## Goal

Replace the home page's plain "Moon Sign Horoscope" slider (`components/HoroscopeSlider.tsx`) with a
3-tab widget — **☀ Today / 🪷 Personal / ☸ Guna** — matching the reference dashboard at
`C:\Users\subir\jyotish-ai` (`apps/web/src/app/(app)/dashboard/page.tsx`), restyled to Aroha's dark/gold
cosmic theme. Includes a new "Guna Chakra" personality-radar feature (Today/Personal already exist in
some form and are being reused, not rebuilt).

## Context

- The current `HoroscopeSlider` already defaults to the user's own moon sign first (`getUserMoonSign`
  reordering) and already opens `ForecastDetailModal` on tap — both requested behaviors already exist in
  code. What's missing is the **tab structure** itself and the **Guna** concept entirely.
- `app/horoscope/page.tsx` already has a `PersonalizedCard` component (birth-chart-based reading via
  `api.horoscope(period)`) — this becomes the "Personal" tab's content, extracted into a shared component
  so the horoscope page and the home widget don't fork the logic.
- Reference "Guna" (`tabKey: 'insights'`, label `☸ Guna`) is **not** the Ashtakoot/Guna-Milan marriage
  compatibility score our `app/compatibility/page.tsx` already computes — it's a personality radar
  (leadership/communication/analytical/emotion/drive/creative/loyalty, 0–100 each) derived from planetary
  Shadbala strength (`apps/web/src/lib/guna/mapShadbalaToAxes.ts` + `components/dashboard/GunaChakraCard.tsx`
  in the reference).
- Our live backend (`backend/src/lib/astro-engine/calculations/shadbala.ts`) already exports
  `calculateShadbala(chartData: ChartData): PlanetShadbala[]` — pure math over the already-stored
  `chart.chartData`, no swisseph/WASM recomputation needed. No kundli module currently calls it.
- `PlanetShadbala` type already exists in `backend/src/lib/shared/types/astrology.ts` — no forked type
  needed when porting `mapShadbalaToAxes`.
- The reference's Guna Chakra detail page links to `/life-journey` ("See My Life"); we have no equivalent
  page — that CTA links to `/horoscope` instead (where dasha info already lives).

## Non-goals

- No change to the dedicated `/horoscope` page's own Daily/Weekly/Monthly/Yearly timescale tabs — those
  stay as-is. Only the home page widget gets the new tab structure.
- No change to the existing Ashtakoot/Guna-Milan compatibility feature (`app/compatibility`) — Guna Chakra
  is an unrelated, additive feature living alongside it.
- No mobile (Capacitor/native) shell changes — this is the Next.js frontend only.
- No DB migration — Shadbala is computed on-demand from already-stored `chartData`, not persisted.

## Backend changes (`backend/` repo)

### 1. Port `mapShadbalaToAxes`
New file `backend/src/lib/guna/mapShadbalaToAxes.ts`, ported near-verbatim from the reference, importing
`PlanetShadbala` from our own shared types instead of `@jyotish-ai/shared`. Pure function, no I/O.

### 2. New endpoint: `GET /v1/kundli/guna-chakra`
Added to the existing kundli module (`kundli.routes.ts` / `kundli.service.ts`), authed via the existing
`requireUser` middleware:
- Load the user's kundli row (existing `getKundliForUser`). If none/not ready, return 404 (same shape the
  frontend already handles for "kundli not generated yet").
- Run `calculateShadbala(row.chartData)` → `mapShadbalaToAxes(...)`, wrapped in the same `tryCompute`
  best-effort pattern used for yogas/doshas — a calculation failure returns an empty/error response rather
  than a 500.
- Response: `{ axes: GunaAxes }`.
- No caching needed (cheap pure computation); no new DB column.

## Frontend changes (repo root)

### Extract shared `PersonalizedCard`
Move the `PersonalizedCard` function out of `app/horoscope/page.tsx` into
`components/horoscope/PersonalizedCard.tsx`, same props (`period: Timescale`). `app/horoscope/page.tsx`
imports it back with no behavior change. The home widget's "Personal" tab renders
`<PersonalizedCard period="daily" />`.

### New `components/MoonSignHoroscopeTabs.tsx`
Replaces `HoroscopeSlider` on the home page (`app/page.tsx`). Local `useState<'today'|'personal'|'guna'>`
(no URL persistence — this is a home-page widget, not a full route). Pill-tab header matching existing
Aroha tab styling (see `app/horoscope/page.tsx`'s timescale tabs for the visual pattern to reuse), three
panels:
- **Today** — today's `HoroscopeSlider` card-carousel content moves here unchanged (moon-sign-first
  ordering, `ForecastDetailModal` on tap, "Select any sign to know more" hint text under the heading).
- **Personal** — `<PersonalizedCard period="daily" />`.
- **Guna** — new `GunaChakraCard` (see below).

### New `components/horoscope/GunaChakraCard.tsx`
Compact card: small `recharts` `RadarChart` (7 axes) + "Strongest trait: X · N/100" line, styled to Aroha's
dark/gold theme (`Card`, `text-gold`, `border-gold/*` — not the reference's light-parchment glass style).
Loading skeleton while `api.gunaChakra()` resolves; if no kundli yet, renders the same
"generate your kundli" prompt style already used by `KundliCard`. Entire card links to `/guna-chakra`.

### New `app/guna-chakra/page.tsx`
Full-size radar chart + a list of all 7 axes, each with its score and one-line description
(`GUNA_AXIS_DESCRIPTIONS`, ported then translated). A "See dasha & life reading →" CTA links to
`/horoscope` (in place of the reference's nonexistent `/life-journey`).

### `lib/api.ts`
Add `api.gunaChakra: () => request<{ axes: GunaAxes }>("/v1/kundli/guna-chakra", { auth: true })` and the
`GunaAxes`/`GunaAxisKey` types (mirroring the backend's `mapShadbalaToAxes.ts` shape).

### Dependency
Add `recharts` (not currently a dependency) for the radar chart, matching the reference's charting choice.

### i18n
All new strings (tab labels `☀ Today`/`🪷 Personal`/`☸ Guna`, tab headings, "Select any sign..." hint,
7 axis labels + 7 descriptions, Guna empty/loading states) added to `i18n/resources.ts` under a new
`guna.*` namespace, translated across all 7 languages (en/hi/bn/mr/te/ta/gu) — no hardcoded English left in
components, per existing project convention.

## Edge cases

- No kundli generated yet → Guna tab shows the same "generate your kundli" CTA style as `KundliCard`
  (not a broken chart).
- Shadbala/axis computation throws on malformed chart data → caught server-side, endpoint returns an
  error the frontend renders as an empty state, not a crash.
- User has a kundli but it predates this feature → no migration/backfill needed since Shadbala is computed
  live on every request from data that already exists.

## Testing

- Frontend: manual walkthrough in dev server — tab switching (Today/Personal/Guna), moon-sign-first
  ordering still works inside the Today tab, detail modal still opens on tap, Guna radar renders with real
  chart data and degrades gracefully with no kundli, i18n string coverage in English + one other language.
- Backend: manual smoke test of `GET /v1/kundli/guna-chakra` against a real user's stored chart data;
  confirm 404 behavior for a user with no kundli.
- `npm run build`/`tsc` clean in both repos before pushing.

## Deploy

Backend change (new endpoint) needs a live-backend deploy (tar-over-SSH per existing deploy steps,
`npm run build`, `pm2 reload aroha-api`, verify `/healthz`+`/readyz`) before the frontend's Guna tab will
work in production. Frontend deploys via Vercel on push to `main` as usual.
