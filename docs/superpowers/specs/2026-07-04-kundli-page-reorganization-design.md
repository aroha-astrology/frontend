# Kundli Page Reorganization — Design

**Status:** Approved by user 2026-07-04, ready for implementation planning.

## Context

The user shared screenshots of a well-organized, novice-friendly Kundli/birth-chart page
(header with name/Asc/Moon/Sun/Nakshatra pills, a Current Dasha strip, Yogas/Doshas/
Strongest/Weakest stat tiles, Lucky Factors, Personality Profile, and life-area prediction
cards) and asked for the live `/kundli` page to be reorganized similarly, readable by
someone with zero astrology knowledge, with a Plain/Technical toggle at the top matching the
one already used elsewhere in the app (`DashaChapterCard`, `ForecastDetailModal`).

Investigation traced the screenshots to `jyotish-backend/apps/api/src/app/(app)/kundli/[id]/
page.tsx` — an old, **undeployed** Next.js+Supabase product (see `aroha-backend-architecture`
memory: `apps/api` is a dead branch of this codebase, not wired to the live TS backend or
this frontend). Its lucky-factors/personality/predictions features do not exist anywhere in
the live backend (`jyotish-backend` `src/modules/kundli/*` on `main`/`dev`/`staging` — the
locally checked-out `develop` branch is missing this folder entirely, a live example of the
branch-drift issue in that memory).

**User decision:** this round reorganizes the live page using **only data the live backend
already returns** (chart, dasha, yogas, doshas). Lucky Factors, Personality Profile, and
life-area Predictions are explicitly deferred — they'd require new backend/LLM work.

### Root-cause findings (why the page needs more than a visual reskin)

The current `app/kundli/page.tsx` was built against the swarm `/v1/onboarding` response
shape and is largely non-functional against the shape returning users actually see
(`useKundli()` → REST `/v1/kundli`):

1. **Dasha never renders for returning users.** `normalizeChart` reads
   `chart.vimshottariDasha ?? chart.dasha` where `chart = source.chart` (the *rashi chart*
   object — planets/houses/ascendant). But dasha data is a **sibling** of `chart`, at
   `kundli.dasha.vimshottari.{mahadashas,currentMahadasha,currentAntardasha,
   currentPratyantardasha}` — nested one level deeper than the fallback checks. Result:
   `dasha` normalizes to `null` and `<DashaTimeline>` silently never mounts.
2. **Yogas/Doshas are always empty.** The page filters `source.findings` by `f.kind`, but
   neither response shape (REST or swarm) has ever had a `findings` array — REST returns
   separate `yogas: { yogas: Yoga[] }` and `doshas: DoshaAnalysis` (a **keyed object**:
   `{mangal, kaalSarp, sadeSati, pitra, kemDruma, grahan, guruChandal}`, not a list).
   `YogaCard`/`DoshaCard` additionally expect a third, unrelated shape
   (`{id, kind, claim, evidence}`) that matches none of the above — these two components
   need a full rewrite, not a data-shape patch.
3. **Large parts of the page render with invisible/default text color.** `PlanetsTable`,
   `HouseDetails`, `DashaTimeline`, `YogaCard`, `DoshaCard` all use `text-primary`,
   `bg-primary/…`, `text-accent`, `text-text-secondary` — none of which exist in
   `tailwind.config.ts` (only `background/foreground/surface/card/fab/muted/gold/border/
   secondary` are defined). These classes silently emit no CSS. Home/horoscope components
   (`DashaChapterCard`, `ForecastDetailModal`, `KundliSummary`) already use the real token
   set (`text-gold`, `text-muted`, `bg-surface`, `border-gold/10`).

Fixing (1) and (2) is required for the reorganized page to show real data at all; fixing (3)
is required for it to be legible. All three are frontend-only — no backend/API changes.

## Goals

- Every returning user sees a correctly populated, organized, plain-language-first Kundli
  page built entirely from the existing `/v1/kundli` response.
- A page-level **Plain / Technical** toggle, visually matching the existing toggle pattern
  (gold pill, two buttons, `horoscope.toggle.plain`/`technical` i18n keys — reused as-is,
  no new keys needed since the strings are identical and already translated in all 7
  languages).
- No astrology jargon left unexplained in Plain mode.
- All new/rewritten components adopt the real design tokens (`gold`/`muted`/`surface`/
  `foreground`/`border`), matching the rest of the app.
- All new user-facing strings added to `i18n/resources.ts` across all 7 languages (en, hi,
  bn, mr, te, ta, gu), per this project's i18n convention.

## Non-goals / explicitly deferred

- Lucky Factors (numbers/colors/days/directions/gemstone/metal).
- Personality Profile / ascendant traits.
- Life-area predictions (Education/Marriage/Career/Health).
- "Strongest/Weakest planet" stat — real Shadbala isn't computed by the live backend; a
  dignity-only approximation would be labeled misleadingly. Can be proposed as its own
  follow-up spec if wanted.
- Any change to the fresh-generation form (bottom of the current page, shown only when no
  kundli exists yet) beyond passing its result through the same fixed normalizer.
- Any backend/API change. Everything here reads fields the live `/v1/kundli` DTO already
  returns (`chart`, `dasha`, `yogas`, `doshas`).

## Data layer (fixed normalizer)

Replace `normalizeChart` with a function that reads each response shape correctly. The two
sources are NOT symmetric — REST nests dasha one level deeper than the swarm/onboarding
response, and the swarm response's own TS type (`OnboardingCharts` in `lib/swarm-api.ts`)
declares `planets`/`houses` at the top level (siblings of `chart`), `chart.ascendant`
nested, and a dasha field typed as `{currentMahadasha, currentAntardasha,
mahadashaSequence}` — note `mahadashaSequence`, not `mahadashas`, which is the field
`DashaTimeline` actually reads. This is exactly the kind of drift called out above; resolve
it against the real wire response, not the type, and either normalize the field name in the
mapper or confirm the backend truly emits `mahadashas` and the type is stale.

```ts
function normalizeKundli(source: KundliReady | OnboardingResponse) {
  const isRest = "chart" in source; // KundliReady: chart/dasha/yogas/doshas siblings
  const chart = isRest ? source.chart : source.charts;
  const planets = chart?.planets ?? [];
  const houses = chart?.houses ?? [];
  const ascendant = chart?.ascendant ?? chart?.chart?.ascendant ?? null;

  const vimshottari = isRest ? source.dasha?.vimshottari : source.charts?.dasha;
  const yogaList: Yoga[] = isRest ? (source.yogas?.yogas ?? []) : []; // confirm swarm shape at implementation time
  const doshaAnalysis: DoshaAnalysis | null = isRest ? source.doshas : null;
  ...
}
```

- `planets` / `houses` / `ascendant` — same fields the current code already reads
  successfully; kept as-is, just resolved from the correct branch.
- `vimshottari` — now correctly reaches `{mahadashas, currentMahadasha, currentAntardasha,
  currentPratyantardasha}` on the REST path, the exact shape `DashaTimeline` already expects.
- `yogaList` — array of `Yoga {name, type, present, strength, description, planets, houses,
  activationPeriod?}`. Filter `present === true` for the count and the rendered list. The
  swarm/onboarding response's yoga/dosha shape isn't confirmed by any TS type in this repo —
  check the real response during implementation; if it's genuinely absent from that path,
  the yoga/dosha section simply renders empty for a freshly-generated chart until the page
  is reloaded (which then hits the REST path), which is an acceptable interim gap since
  fresh-generation is the rarer path.
- Dosha "present" flags differ per key (confirmed from `@aroha-astrology/shared` types):
  `mangal.present`, `kaalSarp.present`, `sadeSati.active` (not `present`), `pitra.present`,
  `kemDruma.present`, `grahan.present && grahan.type !== 'none'`, `guruChandal.present`.
  A small `DOSHA_CHECKS` map drives both the count and the list, one entry per key.
- Before implementation starts: hit the live `/v1/kundli` endpoint (or the swagger docs at
  the URL in `lib/api.ts`'s header comment) with a real session to confirm these exact key
  names — the hand-written TS interfaces in this codebase have drifted from reality before
  (see the dasha/findings bugs above), so trust the wire response over the types during
  implementation.

## Page structure

1. **Header card** — name, DOB/time/place; Ascendant/Moon/Sun/Nakshatra as pills (reuses the
   `kundli.ascendant`/`moonSign`/`sunSign` i18n keys already in `resources.ts`; adds a
   Nakshatra pill). Sourced from `chart.ascendant` and the Moon `PlanetPosition`.
2. **Plain / Technical toggle** — sticky under the header. Governs sections 3, 4, and 6.
3. **Current Dasha card** — Plain: a one-line plain-English reading of the current
   Mahadasha(+Antardasha) pairing (reuse the sentence-template approach already established
   in `DashaChapterCard`/`horoscope.dasha.*` keys — same planet-period copy, adapted to a
   natal-chart framing rather than a horoscope-period framing). Technical: existing
   `DashaTimeline` (retokenized, see below).
4. **Yogas & Doshas** — a compact stat row ("N Yogas found", "M Doshas found", tap to
   expand). Plain: de-jargoned one-liners — port the old apps/api's regex-based
   `YOGA_JARGON` replacement table (pure string cleanup, e.g. "kendra houses" → "key life
   areas"; no backend, no AI) applied to each `Yoga.description`, plus a plain-language
   dosha blurb per present dosha keyed off its `severity`. Technical: full list — name,
   strength, houses, planets for yogas; the existing structured fields (severity, phase,
   etc.) for doshas. `YogaCard`/`DoshaCard` are rewritten (new props matching the real
   `Yoga[]`/`DoshaAnalysis` shapes; real tokens).
5. **Chart** — unchanged, visible in both modes (existing North/South toggle,
   `NorthIndianChart`/`SouthIndianChart`).
6. **Planets & Houses** — Technical: existing `PlanetsTable`/`HouseDetails`, retokenized.
   Plain: a simple "planet in sign, house N" pill row (same pattern as
   `KundliSummary`'s `PlanetPill`), no table.
7. **Divisional charts (D9, etc.)** — Technical-only, unchanged (`VargaChartTabs`); no plain
   equivalent — too advanced a concept to simplify meaningfully.

## Component changes

- `app/kundli/page.tsx`: restructured per above; adopts `gold`/`muted`/`surface`/
  `foreground` tokens; drops the `var(--...)` inline-style approach in favor of the same
  Tailwind classes `DashaChapterCard`/`KundliSummary` already use.
- `components/ui/YogaCard.tsx`, `components/ui/DoshaCard.tsx`: rewritten for the real
  `Yoga[]`/`DoshaAnalysis` shapes, real tokens, Plain/Technical-aware rendering.
- `components/ui/DashaTimeline.tsx`, `components/ui/PlanetsTable.tsx`,
  `components/ui/HouseDetails.tsx`: token-only fix (`text-primary`→`text-gold`,
  `bg-primary/x`→`bg-gold/x`, `text-accent`→`text-gold`, `text-text-secondary`→`text-muted`,
  `bg-card`→`bg-surface` for consistency). No structural/prop changes.
- New: a small `PlainYogaLine`/`PlainDoshaLine` helper (or inline in the yoga/dosha card) for
  the jargon-cleanup + severity-based dosha blurb described above.
- `lib/kundli-helpers.ts`: extend or add `normalizeKundli` per the Data layer section;
  existing `readNested`/`readString` helpers may already cover part of this.

## i18n

New keys needed (all 7 languages): the Yogas/Doshas stat-row labels and count strings, the
plain-language dosha severity blurbs, the "Planets at a glance" plain-mode heading, and any
new header labels (e.g. Nakshatra pill label — `kundli.nakshatra` doesn't exist yet, check
before adding). Reuse existing keys wherever possible: `horoscope.toggle.plain/technical`,
`kundli.ascendant/moonSign/sunSign`, `horoscope.dasha.title/mahadasha/antardasha/
activeUntil`.

## Verification

- Manual dev-server pass with a real signed-in user who has an existing (non-fresh) kundli —
  this is the path that's currently broken, so it's the one that matters most. Confirm
  dasha, yogas, and doshas all render with real data, in both Plain and Technical mode.
- Also test the fresh-generation path (right after onboarding) to confirm the same
  normalizer handles both response shapes without regressing that flow.
- Narrow-viewport (360px) pass, and a language switch to confirm no leftover English strings
  and no layout breakage from longer translated strings.
- `npm run build` / `tsc --noEmit` clean before considering any implementation task done.
