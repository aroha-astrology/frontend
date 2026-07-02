# Astrology App Feature Spec — End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the horoscope/chart/matchmaking/AI-chat feature spec end-to-end, fix every broken click/field in the current app, and add the missing post-onboarding app tour.

**Architecture:** Next.js 15 frontend (this repo, deployed on Vercel) talks to the deployed Hono/Node backend (`github.com/aroha-astrology/backend`, EC2 Mumbai, v0.1.0, cloned at `backend/`). Frontend auth is client-side Firebase → `POST /v1/auth/session`. The backend astro-engine already implements most calculation layers (SAV, Kakshya, Tara Bala, Vedha, Panchaka, double transit, Ashtakoota, doshas, panchang, divisional charts) — the work is mostly wiring, aggregation (weekly/monthly/yearly), grounded LLM narration, and frontend surfaces.

**Tech Stack:** Next.js 15 / React 19 / Tailwind / framer-motion / i18next (7 langs: en, hi, bn, mr, te, ta, gu) / Playwright · Hono + zod-openapi / Drizzle / Supabase / NIM LLM client.

---

## Context — What exists, what's broken, what's missing

### Verified working today
- Home page: hero, AI chat preview, `KundliSummary` (polls `/v1/kundli` via `hooks/useKundli.ts`), `HoroscopeSlider` (12 moon-sign cards + rich detail modal matching backend `MoonSignPrediction` shape), matchmaking card, static remedies grid.
- Onboarding: 8-step chat flow → `PATCH /v1/me` → `router.replace("/")`.
- AI chat: SSE streaming to `/v1/chat` works; single "Yogi Baba" persona, **no chart grounding** (backend `chatStream` builds state without birth/chart data — `backend/src/modules/astro/astro.service.ts:446`).
- Backend engine (in `backend/src/lib/`): full daily-synthesis protocol (`astro-tools/daily-synthesis.ts` — Panchang, dasha-lord transit, SAV, Vedha, Kakshya, Tara Bala/Chandrabala, double transit, Panchaka), ashtakoota (`astro-engine/matching/ashtakoota.ts`), mangal dosha + sade sati + 6 other doshas, divisional charts (`astro-engine/charts/divisionalCharts.ts`), panchang w/ Rahu Kaal, yogas, shadbala.
- Deployed API (verified via `https://api.arohaastrology.in/openapi.json`) additionally has `/v1/kundli`, `/v1/horoscope` (personalized daily, cron-generated `{forDate, summary, model, generatedAt}`), `/internal/cron/daily-horoscopes`, `/v1/preferences`, `/v1/birth-profiles` — **the local `backend/` clone is BEHIND the deployed version; `git pull` before any backend work.**

### Broken today (crashes / dead UI — "all clicks should work")
1. **Bottom nav "Horoscope" tab → `/horoscope` — page does not exist (404).** `components/BottomNavigation.tsx:43`.
2. **Kundli page crashes on success.** `lib/swarm-api.ts` types expect a Python-era response `{requestId, metrology, findings, warnings}` but the deployed `/v1/onboarding` returns `{profileId, summary, charts, insights}` (verified in deployed OpenAPI). `app/kundli/page.tsx:222` reads `result.warnings.length` → TypeError; `result.metrology` is always undefined so results never render.
3. **Compatibility page crashes on success.** Frontend expects `compatibility: {scores[], totalScore, maxTotal}` but deployed returns `{totalScore, maxScore, kutaDetails[], compatibility: string}`. `app/compatibility/page.tsx:218` calls `compat.scores.map` on a string → TypeError.
4. **`/v1/remedies` is not on the deployed API** (it exists only in newer local backend commits) → `app/remedies/page.tsx` fetch fails.
5. Dead buttons: home "See All"/"View All" (`app/page.tsx:65,79`), Bell icon (`app/page.tsx:42`).
6. Hardcoded English strings on kundli, compatibility, ai-chat pages — violates the project i18n rule (all user-facing text must have t() keys in all 7 languages).

### Missing vs the spec
- **App tour after onboarding** (explicitly requested) — no tour/coachmark code anywhere (grep confirmed).
- Horoscope page with Daily/Weekly/Monthly/Yearly timescales (backend has only daily; no aggregation).
- Detail page technical/plain-language toggle, per-planet expandable effects, D9/D10 mini-charts, category tags, hook-driven copy (current copy is 3 canned strings per quality in `daily-synthesis.ts:368`).
- Chart diagram renderers — none exist (North/South/East Indian + Western wheel).
- Panchang strip UI (endpoint exists).
- Matchmaking: Mangal Dosha, Nadi/Bhakoot red-flag-first display, partner-consent checkbox.
- AI personas (career/love/health/general) + grounding layer + PII minimization.
- AI-generated-content disclosure line.

### Accuracy issues found (spec asked "did I miss anything")
- **Panchang timezone bug:** `astro.service.ts:236` uses `Math.round(lon/15)` — India (UTC+5:30) rounds to +5, shifting sunrise/tithi boundaries. Must use IANA tz.
- Home slider fires **12 parallel requests** (one per sign); spec cadence is "regenerate at midnight" — add a bulk endpoint + server-side day-cache.
- Moon-sign slider should be labeled "Moon Sign Horoscope" to distinguish from the personalized kundli horoscope (spec 1.2).
- `timeKnown:false` degraded kundli (schema supports it) is not surfaced in UI.
- Matchmaking second-person consent (spec 6.5) missing.
- Generated forecast text is English-only; 7-language app needs template keys (translatable) for computed text, LLM-locale generation for narrative text.

### Deployment note
Backend changes land in `backend/` (its own git repo → `github.com/aroha-astrology/backend`) and must be deployed to the EC2 box by the user/CI — frontend work is verifiable locally against the deployed API; backend phases need a deploy step before the frontend can consume them in production.

---

## Phase 0 — Fix everything broken (frontend only, ship first)

### Task 0.1: Fix compatibility page response parsing

**Files:**
- Modify: `lib/swarm-api.ts` (MatchmakingResponse types)
- Modify: `app/compatibility/page.tsx`
- Test: `e2e/compatibility.spec.ts` (new)

- [ ] **Step 1: Write failing Playwright test** (mock the API route so no real birth data is needed)

```ts
// e2e/compatibility.spec.ts
import { test, expect } from "@playwright/test";

test("compatibility result renders koota breakdown without crashing", async ({ page }) => {
  await page.route("**/v1/matchmaking", (route) =>
    route.fulfill({
      json: {
        totalScore: 24, maxScore: 36,
        kutaDetails: [
          { name: "Varna", obtained: 1, maximum: 1, description: "Spiritual compatibility" },
          { name: "Nadi", obtained: 0, maximum: 8, description: "Health of progeny" },
        ],
        compatibility: "Good",
      },
    }),
  );
  // …fill both persons' name/dob (see e2e/home.spec.ts auth helpers), click Check Compatibility
  await expect(page.getByText("24 / 36")).toBeVisible();
  await expect(page.getByText(/Nadi/)).toBeVisible();
});
```

- [ ] **Step 2: Replace the stale types in `lib/swarm-api.ts`**

```ts
export interface KutaDetail {
  name: string;
  obtained: number;
  maximum: number;
  description?: string;
}

export interface MatchmakingResponse {
  totalScore: number;
  maxScore: number;
  kutaDetails: KutaDetail[];
  compatibility: string; // e.g. "Good", "Excellent"
  recommendation?: string;
}
```
Delete `KootaScore` and `MatchmakingCompatibility`. Remove `findings`/`warnings` from the type (not in deployed schema).

- [ ] **Step 3: Update `app/compatibility/page.tsx` rendering**

Replace the `compat = result?.compatibility` derivation with:

```ts
const totalScore = result?.totalScore ?? 0;
const maxTotal = result?.maxScore ?? 36;
```
Map `result.kutaDetails` instead of `compat.scores` (fields: `name`, `obtained`, `maximum`, `description`). Show `result.compatibility` as the verdict string. Remove the `result.warnings` block. Add red-flag callout when a kuta named `Nadi` or `Bhakoot` has `obtained === 0`:

```tsx
{result.kutaDetails.filter(k => (k.name === "Nadi" || k.name === "Bhakoot") && k.obtained === 0).map(k => (
  <div key={k.name} className="mt-3 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
    ⚠ {t("compatibility.doshaFlag", { koota: k.name })}
  </div>
))}
```

- [ ] **Step 4: Run test, verify pass** — `npx playwright test e2e/compatibility.spec.ts`
- [ ] **Step 5: Commit** — `fix: parse deployed matchmaking response shape, flag Nadi/Bhakoot dosha`

### Task 0.2: Fix kundli page — use `/v1/kundli` as primary source

**Files:**
- Modify: `app/kundli/page.tsx`
- Modify: `lib/swarm-api.ts` (OnboardingResponse type)
- Reference (working field access to copy): `components/KundliSummary.tsx`, `hooks/useKundli.ts`

- [ ] **Step 1:** Rework the page: signed-in users with a complete profile see **their own kundli** from `useKundli()` (chart, dasha, yogas, doshas already in the payload — mirror `KundliSummary`'s field access, which works in production). The birth-details form moves under a "Check another chart" toggle and posts to `/v1/onboarding`.
- [ ] **Step 2:** Fix `OnboardingResponse` to the deployed shape:

```ts
export interface OnboardingResponse {
  profileId: string;
  summary: string;
  charts?: {
    planets?: PlanetPosition[];
    houses?: unknown[];
    chart?: { ascendant?: { sign?: string; signIndex?: number; degree?: number } };
    dasha?: {
      currentMahadasha?: { lord?: string; planet?: string; start: string; end: string };
      currentAntardasha?: { lord?: string; planet?: string; start: string; end: string };
    };
  };
  insights?: string[];
}
```
Render defensively (`??` fallbacks); dasha lord is `lord ?? planet`. Remove `result.warnings` usage.
- [ ] **Step 3:** If `kundli.timeKnown === false`, render an amber note (`t("kundli.timeUnknownNote")`) that the chart is sign-level (Moon-chart based).
- [ ] **Step 4:** Manual verify with `npm run dev` + real login; commit — `fix: kundli page reads deployed response shapes; own-kundli first`.

### Task 0.3: Create `/horoscope` page (v1 = Daily, personalized + 12 signs)

**Files:**
- Create: `app/horoscope/page.tsx`
- Create: `components/horoscope/ForecastDetailModal.tsx` (extract `DetailModal` + `QUALITY_BADGE` + `PLANET_EMOJI` + `ForecastData` from `components/HoroscopeSlider.tsx`; slider imports from here afterwards)
- Create: `components/horoscope/PersonalizedCard.tsx` (fetches `GET /v1/horoscope` via new `api.horoscope()`; 404 = "not generated yet" empty state)
- Modify: `lib/api.ts` — add:

```ts
/** Personalized daily horoscope (cron-generated). 404 until first cron run. */
horoscope: () =>
  request<{ forDate: string; summary: string; model: string | null; generatedAt: string }>(
    "/v1/horoscope", { auth: true }),
```

- [ ] **Step 1:** Page layout: header `t("horoscope.title")`, timescale tab bar (Daily active; Weekly/Monthly/Yearly rendered but disabled with `t("horoscope.comingSoon")` badge until Phase 2), personalized card on top (auth-gated), then "Moon Sign Horoscope" section header (`t("horoscope.moonSignSection")`) with the 12-sign grid reusing the slider's card + modal.
- [ ] **Step 2:** Wire home "See All" (`app/page.tsx:65`) → `<Link href="/horoscope">`; retitle home section to `t("home.moonSignHoroscope")`.
- [ ] **Step 3:** e2e: `e2e/horoscope.spec.ts` — nav tab navigates, 12 cards render (route-mock forecasts), modal opens/closes.
- [ ] **Step 4:** Commit — `feat: horoscope tab page (daily), fixes dead nav link`.

### Task 0.4: Dead buttons + remedies fallback

- [ ] `app/page.tsx` Bell: open a small sheet/modal listing `t("notifications.empty")` (reuse `Card`); or route to `/horoscope` is NOT acceptable — implement the empty sheet.
- [ ] "View All" remedies → `<Link href="/remedies">`.
- [ ] `app/remedies/page.tsx`: catch `ApiError` 404/network from `api.remedies()` and fall back to a static i18n'd remedies list (same 6 general remedies the backend ships — copy into `data/remedies-fallback.ts`), so the page renders content until the backend deploy catches up.
- [ ] Commit — `fix: wire dead home buttons, remedies fallback when endpoint absent`.

### Task 0.5: i18n sweep (rule: every user-facing string in all 7 languages)

**Files:** `i18n/resources.ts`, `app/kundli/page.tsx`, `app/compatibility/page.tsx`, `app/ai-chat/page.tsx`, plus new components from 0.1–0.4.

- [ ] Add key groups `kundliPage.*`, `compatibility.*`, `aiChat.*`, `horoscope.*`, `notifications.*`, `remedies.*` for every hardcoded string found (titles, placeholders, labels "Boy/Girl", buttons, verdict labels "Excellent Match/Good Match/Needs Attention", quality badge labels in `ForecastDetailModal`, suggestion chips, "Yogi Baba" greeting, error strings) in **en, hi, bn, mr, te, ta, gu**.
- [ ] Replace hardcoded strings with `t()` calls; run `npm run build` (catches missing imports); spot-check by switching language in the UI.
- [ ] Commit — `i18n: translate kundli, compatibility, ai-chat, horoscope surfaces (7 langs)`.

---

## Phase 1 — Post-onboarding App Tour (explicitly requested)

### Task 1.1: Tour engine + steps

**Files:**
- Create: `components/tour/tour-steps.ts`
- Create: `components/tour/AppTour.tsx`
- Modify: `app/page.tsx` (mount + trigger + `data-tour` attrs)
- Modify: `components/BottomNavigation.tsx` (`data-tour` attrs)
- Modify: `app/onboarding/page.tsx:286` — `router.replace("/?tour=1")`
- Modify: `i18n/resources.ts` (tour.* keys ×7)
- Test: `e2e/tour.spec.ts`

- [ ] **Step 1: Step definitions**

```ts
// components/tour/tour-steps.ts
export interface TourStep {
  id: string;
  /** matches [data-tour] attribute; null = centered welcome card */
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome",   target: null,              titleKey: "tour.welcomeTitle",   bodyKey: "tour.welcomeBody" },
  { id: "horoscope", target: "daily-horoscope", titleKey: "tour.horoscopeTitle", bodyKey: "tour.horoscopeBody" },
  { id: "kundli",    target: "kundli-summary",  titleKey: "tour.kundliTitle",    bodyKey: "tour.kundliBody" },
  { id: "askai",     target: "ask-ai",          titleKey: "tour.askAiTitle",     bodyKey: "tour.askAiBody" },
  { id: "horoscope-tab", target: "nav-horoscope", titleKey: "tour.horoscopeTabTitle", bodyKey: "tour.horoscopeTabBody" },
  { id: "remedies",  target: "nav-remedies",    titleKey: "tour.remediesTitle",  bodyKey: "tour.remediesBody" },
];

export const TOUR_DONE_KEY = "aroha_tour_completed";
```

- [ ] **Step 2: Overlay component** — `AppTour.tsx` (client): props `{ onFinish }`. For the active step: `document.querySelector('[data-tour="…"]')`, `scrollIntoView({block:"center"})`, then `getBoundingClientRect()` (recompute on `resize`/`scroll` via listener). Render a portal: full-screen `fixed inset-0 z-[200]` SVG with a dark mask (`fill-rule="evenodd"`, outer rect + rounded cutout rect padded 8px around the target) so the target stays visible and everything else dims; tooltip `Card` positioned below the cutout (above when target is in the lower half, e.g. bottom-nav steps); dots progress; buttons Back / Next / Skip (`t("tour.back")`, `t("tour.next")`, `t("tour.done")` on last, `t("tour.skip")`), framer-motion fade/slide between steps. On finish/skip: `localStorage.setItem(TOUR_DONE_KEY, "1"); onFinish()`.
- [ ] **Step 3: Trigger in `app/page.tsx`** —

```tsx
const [tourOpen, setTourOpen] = useState(false);
const searchParams = useSearchParams(); // wrap usage in <Suspense> per Next 15
const { user } = useAuth();
useEffect(() => {
  const done = localStorage.getItem(TOUR_DONE_KEY);
  if (searchParams.get("tour") === "1" && !done) setTourOpen(true);
  else if (!done && user?.profileCompletedAt) setTourOpen(true); // existing users, once
}, [searchParams, user]);
```
Add `data-tour="daily-horoscope"` on the horoscope section wrapper, `data-tour="kundli-summary"` on the KundliSummary wrapper; in `BottomNavigation.tsx` add `data-tour="ask-ai"` (FAB), `data-tour="nav-horoscope"`, `data-tour="nav-remedies"`. On finish strip the query param: `router.replace("/", { scroll: false })`.
- [ ] **Step 4: i18n keys ×7** — `tour.welcomeTitle` "Welcome to Aroha ✨" / body "Let us show you around — 30 seconds." etc. (write natural translations for hi/bn/mr/te/ta/gu, same as existing resource style).
- [ ] **Step 5: e2e** — `e2e/tour.spec.ts`: visiting `/?tour=1` (with auth mock) shows welcome card; Next advances with spotlight on slider; Skip sets localStorage and hides; revisiting `/` does not reopen.
- [ ] **Step 6: Commit** — `feat: post-onboarding app tour with spotlight coach marks`.

---

## Phase 2 — Horoscope engine: weekly/monthly/yearly + structured personalized payload (backend + frontend)

> Backend work happens in `backend/` (own repo). **First step: `git -C backend pull origin main`** — the local clone is missing the deployed kundli/horoscope modules. Expand this phase into its own detailed plan doc once the pulled code is visible (the horoscope module's storage/cron shape determines exact file paths).

### Task 2.1: Backend — extend synthesis for arbitrary dates & periods
- `daily-synthesis.ts` already accepts `asOf` — expose it through a new service:
  - `GET /v1/forecast/moon-sign/:signIndex?period=daily|weekly` — weekly runs `moonSignPrediction` for each of the next 7 days (pass `asOf`; requires threading `asOf` into `getCurrentSky()`), then aggregates: mean score → rating, best/worst day, dominant favorable houses → category tags. **Weekly must be an aggregate of daily outputs, never independent narration** (spec 1.1).
  - `GET /v1/forecast/moon-sign` (no index) — bulk all-12-signs daily payload; cache per IST day (`lib/cache` exists) so the home slider makes 1 request instead of 12.
- Personalized `/v1/horoscope?period=daily|weekly|monthly|yearly` — extend the deployed horoscope module: monthly per spec Part 7.1 = active dasha/antardasha lord transit quality (`astro-tools/transit.ts:dashaLordTransitQuality`) + SAV filter (`calculateAshtakavarga`) + Vedha (`checkAllVedha`) + double transit (`detectDoubleTransit`); yearly = mahadasha/antardasha spans in the year + Jupiter/Saturn sign-ingress dates + sade sati phase (`doshas/sadeSati.ts`). Response adds a structured block alongside `summary`:

```ts
{
  forDate, period, score,            // 1–5, from synthesis — never LLM-invented
  categories: string[],              // only houses the active dasha lord actually touches
  luckyColor, luckyNumber,
  technical: { dasha: {...}, transits: [...], sav: {...}, vedha: [...], kakshya: {...}, activeYogas: [...] },
  plain: string, hook: string        // paraphrase-only narration (Phase 6 wires LLM; template fallback first)
}
```
- Cron: extend `/internal/cron/daily-horoscopes` to also refresh weekly on Mondays and monthly on the 1st (IST).

### Task 2.2: Frontend — full horoscope detail experience
- Enable Weekly/Monthly/Yearly tabs on `/horoscope`; card structure per spec 1.3 (rating derived from `score`, hook line, category tags only when present, lucky color/number).
- Detail modal: **Technical ⇄ Plain toggle** (one dataset, two renderers — spec 2.1): technical = planet table (transit sign, house from Moon, dignity, retro flag, SAV of sign, Kakshya lord), active dasha lords with ranges, vedha status, live yogas; plain = `plain` text. Per-planet expandable rows (spec 2.2).
- D9/D10 mini-charts in the detail page with one-line "why this matters" captions (data from `/v1/kundli` chart payload; renderers from Phase 3).
- Panchang strip component (`components/horoscope/PanchangStrip.tsx`) — Tithi, Vaar, Nakshatra, Yoga, Karana, sunrise/sunset, Rahu Kaal from `api.panchang()` — shown on `/horoscope` and `/kundli`.
- All new strings ×7 languages.

### Task 2.3: Accuracy fixes (backend)
- Replace `Math.round(lon/15)` in `getPanchang` with IANA-tz offset: accept optional `tz` query param (default `Asia/Kolkata`), compute offset via `Intl.DateTimeFormat(..., {timeZone: tz})` — fixes half-hour-zone errors.
- Verify moon-sign day-cache keys on IST date so "regenerate at local midnight" holds.

---

## Phase 3 — Four chart-style renderers (frontend)

**One canonical data structure, four SVG renderers (spec Part 3) — never recompute per style.**

- Create `lib/chart-data.ts`: `normalizeChart(kundliChart): CanonicalChart` where

```ts
interface ChartHouse { house: number; signIndex: number; planets: { name: string; retro: boolean; degree?: number }[] }
interface CanonicalChart { ascendantSignIndex: number; houses: ChartHouse[] } // houses.length === 12
```
- Create `components/charts/NorthIndianChart.tsx` (fixed diamond, house 1 top, signs rotate), `SouthIndianChart.tsx` (fixed sign grid, Asc marked, house numbers rotate), `EastIndianChart.tsx` (Bengali 3×3 frame convention), `WesternWheel.tsx` (12 equal wedges) — pure SVG, theme tokens (`--gold`, `--surface`, `--border`), planet abbreviations (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke) with retro `℞` mark.
- `components/charts/ChartStyleSwitcher.tsx` — 4-way segmented control; persist choice to `GET/PATCH /v1/preferences` (endpoint exists) with localStorage fallback; i18n labels.
- Use on `/kundli` (main D1 chart + D9/D10 tabs from divisional data) and in horoscope detail minis.
- e2e: chart renders 12 houses and switching style preserves planet placements (assert same planet set per house across renderers).

---

## Phase 4 — Matchmaking upgrade (backend + frontend)

- Backend `matchmake()` (`astro.service.ts:167`): already computes metrology for both people — add per-person **Mangal Dosha** (`doshas/mangalDosha.ts`), and `flags: { nadiDosha: boolean, bhakootDosha: boolean }`; populate `recommendation` from computed results only (red flags first — spec Part 5). Additive fields = backward compatible with the deployed schema.
- Frontend: red-flag banner FIRST when nadi/bhakoot/mangal mismatch, then total score dial, then per-koota pass/partial/fail bars (obtained/maximum), then plain-language summary. Add partner-consent checkbox (`t("compatibility.consent")` — required before submit, spec 6.5). Neutralize "Boy/Girl" labels to Person 1/Person 2 (i18n'd).

---

## Phase 5 — AI chat personas + grounding (backend + frontend)

- Backend: `ChatRequestSchema` gains `persona?: "career" | "love" | "health" | "general"`. `chatStream` loads the user's stored kundli (kundli module, deployed) and injects a **domain slice** per spec 6.2 (career: D10 + 10th lord + dasha vs 10th + Saturn transit; love: D9 + 7th lord + Venus + mangal flag; health: 6/8/12 lords + explicit no-medical-advice instruction; general: summarized chart facts) into `buildChatMessages` — the injection point already exists (`scholar.ts:49-78`), it's just never populated. Four thin system prompts per spec 6.3 (role/scope → grounding instruction → structured chart facts → output style). PII rule: inject only derived facts — no name, DOB, or place string.
- Frontend `app/ai-chat/page.tsx`: persona selector chips above the thread (🧑‍💼 Career / ❤️ Love / 🌿 Health / 🔮 Yogi Baba), pass `persona` through `streamChat`; add persistent AI-disclosure footer line (`t("aiChat.disclosure")`: responses are AI-generated from traditional calculations, not a licensed astrologer). All ×7 languages.

---

## Phase 6 — Grounded content generation (backend)

- Narration service `lib/llm/narrate.ts`: prompt = synthesis JSON + hook-formula rules (spec 4.1/4.2: tension→resolution, tendency language, no invented specifics, vary openers, ≤1 hook + 1 sentence for cards / 2–3 short paragraphs for detail) + target locale. **Paraphrase-only guardrail: the prompt forbids any claim not present in the injected data.** Used to fill `hook`/`plain` in Phase 2 payloads; deterministic template fallback when the LLM is unavailable (extend the existing `QUALITY_DESC` table with per-house-theme variants so fallback text still varies).
- QA hook: log a sample of generated narrations + injected facts (feedback/log table) for fabrication review before widening rollout (spec 6.4).

---

## Phase 7 — Verification & hardening

- [ ] `npm run build` clean (frontend), `pnpm build` + vitest (backend).
- [ ] Playwright suite: auth, home, navigation (existing) + compatibility, horoscope, tour, kundli-chart (new). Run headed once to visually confirm the tour spotlight.
- [ ] Manual click-audit checklist: every button/link/field on home, onboarding (8 steps), tour, kundli, horoscope (4 tabs + modal + toggle + planet expanders), compatibility (form → result → flags), ai-chat (4 personas + chips + stream), remedies, sign-in/up, sidebar, language picker (×7), theme switch.
- [ ] Backend deploy to EC2, then re-run frontend e2e against staging URL.

## Verification (end-to-end)
1. Fresh user: sign up → onboarding 8 steps → lands on `/?tour=1` → tour runs, skippable, never reappears.
2. Home: slider labeled Moon Sign Horoscope, single bulk fetch, modal opens; See All → `/horoscope`.
3. `/horoscope`: 4 timescale tabs live, personalized card, technical/plain toggle traceable to the same numbers, panchang strip matches `drikpanchang.com` for Delhi (tithi/nakshatra/Rahu Kaal sanity check — the tz fix).
4. `/kundli`: own chart in 4 switchable styles + D9/D10, degraded notice when `timeKnown=false`.
5. `/compatibility`: 24+/36 shows Good; a Nadi-0 pair shows the red flag first; consent required.
6. `/ai-chat`: career persona references the user's actual 10th-house data; asks-for-clarification rather than inventing when data absent; disclosure visible.
7. Language switch to hi/ta/etc. leaves no English strings on any of the above.
