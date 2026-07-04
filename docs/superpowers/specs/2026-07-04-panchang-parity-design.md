# Panchang feature parity with jyotish-ai — design

## Goal

Bring Aroha's web Panchang page (`app/panchang/page.tsx`) up to feature parity with the reference implementation at `C:\Users\subir\jyotish-ai` (apps/web), including the "Planning to Buy" purchase-muhurta-timing feature. Web only — mobile app is out of scope for this pass.

## Context

- Aroha's live product is two repos: this frontend (Next.js, root of this checkout) and `backend/` (nested, gitignored checkout of the separate `aroha-astrology/backend` repo, Hono + Drizzle + Postgres, deployed to EC2 via pm2, current branch `main`).
- The backend repo also carries a **dormant third generation**, `backend/apps/api` — an old Next.js + Supabase app that is *not* wired to production but is, file-for-file, the same codebase as `jyotish-ai` (differs only in package name: `@jyotish-ai/shared` → `@aroha-astrology/shared`). It already has a complete, working implementation of everything we need to port, including the purchase-plan feature end to end (Supabase-flavored).
- The live backend's `astro-engine` fork already exports `calculateChoghadiya`/`calculateHora` (`backend/src/lib/astro-engine/panchang/index.ts:20-21`) but `astro.service.ts#getPanchang` never calls them — today's `/panchang` response is missing both.
- There is no live "credits/wallet" enforcement (`creditTransactions` table exists but is unused dead schema — billing is a stub per prior architecture research). The dormant app's 5-Dhanam charge for a purchase-plan analysis has no live equivalent to hook into.

## Non-goals

- Mobile app parity (separate future pass).
- Standing up a real credits/wallet system — out of scope; this feature ships free with a rate-limit cap instead.
- Any change to the Python `swarm` system or the dormant `apps/api` app itself (read-only reference).

## Backend changes (`backend/` repo)

### 1. Extend `GET /panchang`
In `astro.service.ts#getPanchang`, after computing `sun`/`moon` longitudes and calling `calculateFullPanchang`, also call `calculateChoghadiya(date, sunrise, sunset, dayOfWeek)` and `calculateHora(date, sunrise, dayOfWeek)` (exact signatures per existing exports) and merge `choghadiya`/`hora` into the returned object. Update the Zod response schema in `astro.routes.ts` (`panchangRoute`) to document the two new optional fields. This is additive — no breaking change to existing consumers.

### 2. New `GET /panchang/month`
Query params: `year`, `month` (1-12), `lat`, `lng` (optional, default to the same reference point as `/panchang`). For each day in the month, return `{ day, tithi, tithiName, tithiNumber, paksha, nakshatra, nakshatraName, vara, isFullMoon, isNewMoon, isEkadashi }`. Reuse the existing `panchangCache` table (`forDate, refKey, lat, lon, data jsonb`, unique on `(forDate, refKey)`) — check cache per day, compute+cache misses via the same engine calls as `/panchang`, do not overwrite an existing full-day cache row with the lighter month-view shape (mirrors the dormant app's caching caveat). No new table needed.

### 3. `purchase_plans` table (Drizzle + migration)
```
purchase_plans
  id                     uuid PK default gen_random_uuid()
  user_id                uuid NOT NULL -> users.id ON DELETE CASCADE
  chart_id               uuid NULL -> kundlis.id ON DELETE SET NULL
  category               purchase_plan_category enum ('vehicle','home','commercial','other')
  metadata               jsonb NOT NULL default '{}'
  cost_bracket           text NULL
  booking_date           date NULL
  delivery_date          date NULL
  resolved_booking_date  date NOT NULL
  resolved_delivery_date date NOT NULL
  panchang_date          date NOT NULL
  language               text NOT NULL default 'en'
  status                 purchase_plan_status enum ('pending','processing','done','error') default 'pending'
  analysis               jsonb NULL
  error_message          text NULL
  created_at             timestamptz NOT NULL default now()
  completed_at           timestamptz NULL

  index (user_id, created_at desc)
  index (status) where status in ('pending','processing')
```
Modeled directly on the existing `precomputeJobs` status-enum pattern already used for horoscope precompute jobs — same lifecycle shape, so no new async-job idiom is introduced.

### 4. Purchase-plan routes (new module, e.g. `modules/purchase-plan/`)
- `POST /v1/purchase-plan/analyze` (authed via existing `requireUser`/`requireConsent` middleware):
  - Validate body: `{ category, metadata?, costBracket?, bookingDate?, deliveryDate?, panchangDate?, language? }`, at least one of booking/delivery date required.
  - Resolve both dates (booking+5d if only delivery given, clamp-to-yesterday logic if only booking given) — port `resolveDates()` verbatim, it's pure logic.
  - Rate limit: max 3 pending/completed analyses per user per rolling 24h (reuse the existing in-memory rate limiter convention) — replaces the dormant app's credit debit.
  - Look up the user's latest `kundlis` row for chart context (chartData/dashaData jsonb) — analog of the dormant app's `kundli_charts` lookup.
  - Insert a `pending` row, return `{ planId }` immediately.
  - Fire-and-forget an async function (no `await`) that: sets `processing`, computes panchang for both resolved dates via the in-process panchang function (no HTTP self-call, unlike the dormant app), builds the LLM prompt (ported verbatim from `buildPrompt()`), calls `nim-client.ts` with a new `PURCHASE_PLAN_PROFILE` (`jsonMode: true, temperature: 0.3, maxTokens: 4096`), parses JSON leniently (store `{ raw, parseError: true }` on parse failure rather than failing the row), updates the row to `done`/`error`. Safe under the current single-instance (`pm2 -i 1`) deployment; revisit if the app ever moves to cluster mode.
- `GET /v1/purchase-plan` — last 10 plans for the current user.
- `GET /v1/purchase-plan/:id` — single plan, 404 if not owned (poll target, 5s interval client-side).

### 5. LLM profile
Add `PURCHASE_PLAN_PROFILE` to `config/llm.ts` alongside the existing horoscope profiles — needs a larger `maxTokens` (4096) than any current profile (existing max is 900) and should use a longer effective timeout than the default `GENERATE_TIMEOUT_MS` (60s) given prompt complexity; since this runs in the fire-and-forget path (not blocking a request), a longer timeout here is low-risk.

## Frontend changes (repo root)

### Page rebuild — `app/panchang/page.tsx`
Keep existing dual reference-vs-user-location fetching (`useGeolocation`, side-by-side reference/mine panchang). Add:
- Five-limb cards get a design pass (icon + description) but keep existing `Card`/gold styling, not jyotish-ai's glass theme.
- Sunrise/Sunset, Rahu/Gulika/Yamaganda + Abhijit Muhurta cards gain the dormant app's dual-location display and live "active now" state (pure client-side time comparison, no new data needed).
- New **Choghadiya** and **Hora** sections, collapsible (closed by default), using `framer-motion` (already a dependency).
- New **regional calendar + Adhik Maas** info card (region selector, month/paksha/year, Adhik Maas warning badge) — ported from the dormant app's inline JSX, restyled.
- New **`MonthlyPanchangCalendar`** component, ported logic (month grid, festival/Adhik Maas/paksha cell styling, "key dates this month" summary) driven by the new `/panchang/month` endpoint, restyled onto `Card`/gold tokens.
- New **"Planning to Buy"** section: category cards + `PurchasePlanModal` (3-step wizard: pick category → form → submitted) + `PurchasePlanResults` (polls `GET /v1/purchase-plan/:id` every 5s, renders defensively via `getStr/getNum/getStrArr`-style accessors since the LLM JSON isn't schema-validated).

### New files
- `components/panchang/MonthlyPanchangCalendar.tsx`
- `components/panchang/PurchasePlanModal.tsx`
- `components/panchang/PurchasePlanResults.tsx`
- `lib/panchang/hindu-festivals.ts` (ported data, 2025-2027 festival map)
- `lib/panchang/adhik-maas-ranges.ts` (ported data)
- `lib/panchang/regions.ts` (region metadata: label, calendar name, Adhik Maas name per region)

### `lib/api.ts`
- Extend `PanchangData` with `choghadiya?: { day: ChoghadiyaSlot[]; night: ChoghadiyaSlot[] }` and `hora?: HoraSlot[]`.
- Add `api.panchangMonth(year, month, lat?, lon?)`, `api.purchasePlanAnalyze(body)`, `api.purchasePlanList()`, `api.purchasePlanGet(id)`.

### i18n
All new user-facing strings (section titles, category labels, form fields, result labels, empty/error states) go into `i18n/resources.ts` under a `horoscope.panchang.*` / new `purchasePlan.*` namespace, translated across all 7 languages (en/hi/bn/mr/te/ta/gu) — no hardcoded English left in components, per existing project convention.

## Design-system mapping (jyotish-ai → Aroha)

| jyotish-ai | Aroha |
|---|---|
| `glass-1/2/3` inline styles, `rgba(212,175,55,...)` | `Card` component, `border-gold/10`–`/35` |
| `var(--primary)`, `var(--text)`, `var(--text-secondary)` | `text-gold`, `text-foreground`, `text-muted` |
| `font-[family-name:var(--font-serif)]` | `font-display` / `font-serif` |
| `Button`/`Badge`/`Input`/`Select` (shadcn-style) | Inline styled buttons matching existing OTP/tour patterns, or new small additions to `components/ui/` only if a reusable need emerges — no wholesale import of a new component library |
| Hardcoded English strings | `t("...")` via `react-i18next`, all 7 languages |

## Testing

- Backend: unit test `resolveDates()`, the choghadiya/hora merge into `/panchang`, and the `/panchang/month` cache-hit/miss paths. Manual smoke test of `/v1/purchase-plan/analyze` end-to-end against NIM in dev.
- Frontend: manual walkthrough in dev server — monthly calendar navigation, region switch, purchase-plan modal happy path + validation errors, i18n string coverage (no raw keys visible) in at least English + one other language.
- `npm run build`/`tsc` clean in both repos before pushing.

## Deploy

Per user instruction: after implementation and verification, push frontend to `main` (Vercel auto-deploys) and push backend to `dev` → `staging` → `main`, then deploy to EC2 (`tar`-over-SSH per existing deploy steps, `npm ci` if deps changed, `npm run build`, run the new Drizzle migration, `pm2 reload aroha-api`, verify `/healthz`+`/readyz`).
