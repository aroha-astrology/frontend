# Per-Category Horoscope Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four independently-rated categories (Overall, Health, Career, Marriage) to both the personalized (LLM) horoscope and the 12 generic zodiac-sign (deterministic) horoscope, scaling richness by period (daily < weekly < monthly = yearly), and move the personalized card to a brief-on-page / full-detail-in-modal pattern matching the existing moon-sign card.

**Architecture:** Backend: extend the deterministic `daily-synthesis.ts` engine with a house-tenancy nudge per domain (Health=6th house, Career=10th, Marriage=7th), and extend the LLM prompt in `llm/horoscope.ts` to return the same four-block shape, with `overall`'s score always server-derived as an average (never trusted from the LLM). Frontend: extract a shared `BottomSheetModal` shell (already duplicated by two existing modals), add a `CategoryRatingRow` component, and wire a new `PersonalizedDetailModal` alongside an extended `ForecastDetailModal`.

**Tech Stack:** Hono/TypeScript backend (Drizzle/Postgres, NVIDIA NIM via `lib/llm/nim-client.ts`, vitest), Next.js 15/React 19/Tailwind/framer-motion/i18next frontend.

**Spec:** `docs/superpowers/specs/2026-07-03-horoscope-category-ratings-design.md`

---

## Task 1: Shared `Category`/`CategoryReading` types (backend)

**Files:**
- Modify: `backend/src/lib/shared/types/astrology.ts`

- [ ] **Step 1: Add the shared types**

Open `backend/src/lib/shared/types/astrology.ts` and append at the end of the file:

```ts
// ============================================================
// Horoscope category ratings (Overall/Health/Career/Marriage)
// ============================================================

export type Category = 'overall' | 'health' | 'career' | 'marriage';

export interface CategoryReading {
  hook: string;
  description: string;
  advice: string;
  quality: 'good' | 'moderate' | 'challenging' | 'avoid';
  score: number; // 1-5
}
```

This file is already re-exported wholesale from `backend/src/lib/shared/index.ts` (`export * from './types/astrology'`), which is aliased as `@aroha-astrology/shared` in `tsconfig.json` and `vitest.config.ts` — so `Category`/`CategoryReading` become importable from `@aroha-astrology/shared` everywhere in the backend, matching the existing convention (e.g. `doshas/sadeSati.ts` already does `import type { SadeSati, ZodiacSign } from '@aroha-astrology/shared';`).

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit -p .`
Expected: no new errors (this is an additive export, nothing consumes it yet).

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/lib/shared/types/astrology.ts
git commit -m "feat(horoscope): add shared Category/CategoryReading types"
```

---

## Task 2: Domain-mapping helpers for the deterministic engine (TDD)

**Files:**
- Modify: `backend/src/lib/astro-tools/daily-synthesis.ts`
- Test: `backend/test/daily-synthesis-categories.spec.ts` (new)

These are pure functions (no astro-engine/network calls), so they're fast to unit-test directly.

- [ ] **Step 1: Write the failing test**

Create `backend/test/daily-synthesis-categories.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  domainNudge,
  domainQuality,
  buildDomainHook,
  DOMAIN_HOUSE_OFFSET,
  DOMAIN_THEME,
} from '../src/lib/astro-tools/daily-synthesis.js';

describe('daily-synthesis: domain category helpers', () => {
  it('maps domains to the correct house offsets (0-indexed from the sign)', () => {
    expect(DOMAIN_HOUSE_OFFSET.health).toBe(5); // 6th house
    expect(DOMAIN_HOUSE_OFFSET.marriage).toBe(6); // 7th house
    expect(DOMAIN_HOUSE_OFFSET.career).toBe(9); // 10th house
  });

  it('has a theme phrase for every domain', () => {
    expect(DOMAIN_THEME.health).toBeTruthy();
    expect(DOMAIN_THEME.career).toBeTruthy();
    expect(DOMAIN_THEME.marriage).toBeTruthy();
  });

  it('nudges +1 when a benefic tenants the domain house', () => {
    // Aries (signIndex 0), 10th house from Aries = Capricorn (signIndex 9).
    const transitSigns = { Jupiter: 9 };
    expect(domainNudge('career', 0, transitSigns)).toBe(1);
  });

  it('nudges -1 when a malefic tenants the domain house', () => {
    const transitSigns = { Saturn: 9 };
    expect(domainNudge('career', 0, transitSigns)).toBe(-1);
  });

  it('treats Sun as neutral (no nudge)', () => {
    const transitSigns = { Sun: 9 };
    expect(domainNudge('career', 0, transitSigns)).toBe(0);
  });

  it('sums nudges when multiple tracked planets share the domain house', () => {
    const transitSigns = { Jupiter: 9, Venus: 9 };
    expect(domainNudge('career', 0, transitSigns)).toBe(2);
  });

  it('returns 0 when nothing tenants the domain house', () => {
    const transitSigns = { Jupiter: 3 };
    expect(domainNudge('career', 0, transitSigns)).toBe(0);
  });

  it('buckets scores into the 4 quality levels', () => {
    expect(domainQuality(5)).toBe('good');
    expect(domainQuality(4)).toBe('good');
    expect(domainQuality(3)).toBe('moderate');
    expect(domainQuality(2)).toBe('challenging');
    expect(domainQuality(1)).toBe('avoid');
  });

  it('builds a deterministic hook that mentions the theme', () => {
    const hook = buildDomainHook('good', DOMAIN_THEME.health, 7);
    expect(hook).toContain(DOMAIN_THEME.health);
    // Same inputs always produce the same hook (traceable/cacheable).
    expect(buildDomainHook('good', DOMAIN_THEME.health, 7)).toBe(hook);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: FAIL — `domainNudge`, `domainQuality`, `buildDomainHook`, `DOMAIN_HOUSE_OFFSET`, `DOMAIN_THEME` are not exported from `daily-synthesis.ts` yet.

- [ ] **Step 3: Implement the helpers**

Open `backend/src/lib/astro-tools/daily-synthesis.ts`. Add this block immediately after the existing `QUALITY_DESC` constant (right before the `HOOK_TEMPLATES` constant, so it sits alongside the other quality/hook template tables):

```ts
// =============================================================================
// Category ratings (Overall/Health/Career/Marriage) — spec:
// docs/superpowers/specs/2026-07-03-horoscope-category-ratings-design.md
// =============================================================================

export const DOMAIN_HOUSE_OFFSET: Record<'health' | 'career' | 'marriage', number> = {
  health: 5, // 6th house from the sign
  marriage: 6, // 7th house
  career: 9, // 10th house
};

export const DOMAIN_THEME: Record<'health' | 'career' | 'marriage', string> = {
  health: 'your health and daily routine',
  career: 'your career and public standing',
  marriage: 'your relationships and marriage prospects',
};

const NATURAL_BENEFICS = new Set(['Jupiter', 'Venus']);
const NATURAL_MALEFICS = new Set(['Saturn', 'Mars', 'Rahu']);
/** The same tracked-planet set the existing keyTransits logic already uses. Sun is
 * intentionally excluded from both benefic/malefic sets — its classification varies by
 * context in classical Jyotish, and this is a lightweight heuristic, not a full dignity
 * analysis (see design doc). */
const TRACKED_PLANETS = ['Sun', 'Jupiter', 'Saturn', 'Rahu', 'Mars', 'Venus'];

/**
 * +1 per benefic (Jupiter/Venus), -1 per malefic (Saturn/Mars/Rahu) currently transiting
 * the domain's house-from-sign. Multiple tracked planets sharing that sign sum their
 * nudges (e.g. a Jupiter-Saturn conjunction there nets to 0).
 */
export function domainNudge(
  domain: 'health' | 'career' | 'marriage',
  moonSignIndex: number,
  transitSigns: Record<string, number>,
): number {
  const domainHouseSignIdx = (moonSignIndex + DOMAIN_HOUSE_OFFSET[domain]) % 12;
  let nudge = 0;
  for (const planet of TRACKED_PLANETS) {
    if (transitSigns[planet] !== domainHouseSignIdx) continue;
    if (NATURAL_BENEFICS.has(planet)) nudge += 1;
    else if (NATURAL_MALEFICS.has(planet)) nudge -= 1;
  }
  return nudge;
}

export function domainQuality(score: number): 'good' | 'moderate' | 'challenging' | 'avoid' {
  if (score >= 4) return 'good';
  if (score === 3) return 'moderate';
  if (score === 2) return 'challenging';
  return 'avoid';
}

const DOMAIN_HOOK_TEMPLATES: Record<
  'good' | 'moderate' | 'challenging' | 'avoid',
  ((theme: string) => string)[]
> = {
  good: [
    (theme) => `A strong window for ${theme}.`,
    (theme) => `Things move in your favor around ${theme} right now.`,
  ],
  moderate: [
    (theme) => `A steady, mixed stretch for ${theme} — nothing dramatic either way.`,
    (theme) => `${theme} holds roughly even for now.`,
  ],
  challenging: [
    (theme) => `Expect some friction around ${theme} — go carefully.`,
    (theme) => `${theme} needs a little extra patience right now.`,
  ],
  avoid: [
    (theme) => `A quieter window for ${theme} — let big moves wait if you can.`,
    (theme) => `${theme} is better left alone until this passes.`,
  ],
};

export function buildDomainHook(
  quality: 'good' | 'moderate' | 'challenging' | 'avoid',
  theme: string,
  variantSeed: number,
): string {
  const templates = DOMAIN_HOOK_TEMPLATES[quality];
  const fn = templates[((variantSeed % templates.length) + templates.length) % templates.length]!;
  return fn(theme);
}

const DOMAIN_ADVICE: Record<
  'health' | 'career' | 'marriage',
  Record<'good' | 'moderate' | 'challenging' | 'avoid', string>
> = {
  health: {
    good: 'Keep up whatever routine is already working — this is a good stretch to build on it.',
    moderate: 'Nothing urgent, but do not skip the basics: sleep, water, movement.',
    challenging: 'Ease up where you can and avoid pushing through fatigue this week.',
    avoid: 'Prioritize rest and avoid overexertion until this passes.',
  },
  career: {
    good: 'Good window to raise your hand for something visible or push a pending ask.',
    moderate: 'Steady progress is likely — keep showing up, no need to force a big move.',
    challenging: 'Stick to what is already committed rather than starting something new.',
    avoid: 'Avoid big career decisions right now; revisit them once this settles.',
  },
  marriage: {
    good: 'A good time for honest conversations or moving a relationship milestone forward.',
    moderate: 'Keep communication open — nothing dramatic, just stay attentive.',
    challenging: 'Give relationships a little extra patience and avoid picking fights over small things.',
    avoid: 'Avoid major relationship decisions until this phase passes.',
  },
};
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/lib/astro-tools/daily-synthesis.ts test/daily-synthesis-categories.spec.ts
git commit -m "feat(horoscope): add deterministic per-category nudge/quality/hook helpers"
```

---

## Task 3: Wire categories into daily `moonSignPrediction`

**Files:**
- Modify: `backend/src/lib/astro-tools/daily-synthesis.ts`
- Test: `backend/test/daily-synthesis-categories.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `backend/test/daily-synthesis-categories.spec.ts`:

```ts
import { moonSignPrediction } from '../src/lib/astro-tools/daily-synthesis.js';

describe('daily-synthesis: moonSignPrediction categories', () => {
  it('includes all 4 categories, each with a valid score/quality/hook/advice', async () => {
    const result = await moonSignPrediction(0, '2026-07-03T12:00:00Z');
    for (const key of ['overall', 'health', 'career', 'marriage'] as const) {
      const c = result.categories[key];
      expect(c.score).toBeGreaterThanOrEqual(1);
      expect(c.score).toBeLessThanOrEqual(5);
      expect(['good', 'moderate', 'challenging', 'avoid']).toContain(c.quality);
      expect(c.hook.length).toBeGreaterThan(0);
      expect(c.advice.length).toBeGreaterThan(0);
    }
  });

  it('derives overall.score as the average of health/career/marriage', async () => {
    const result = await moonSignPrediction(0, '2026-07-03T12:00:00Z');
    const { health, career, marriage, overall } = result.categories;
    const expected = Math.max(
      1,
      Math.min(5, Math.round((health.score + career.score + marriage.score) / 3)),
    );
    expect(overall.score).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: FAIL — `result.categories` is undefined.

- [ ] **Step 3: Add the `categories` field to `MoonSignPrediction` and wire it up**

In `backend/src/lib/astro-tools/daily-synthesis.ts`, update the `MoonSignPrediction` interface:

```ts
export interface MoonSignPrediction {
  sign: string;
  period: 'daily';
  date: string;
  transitMoonSign: string;
  transitMoonNakshatra: string | undefined;
  houseFromSign: number;
  favorable: boolean;
  isAshtamaChandra: boolean;
  quality: 'good' | 'challenging' | 'avoid';
  score: number;
  /** Short hook line (spec 4.1) — tension→resolution or specific-detail→payoff, tied to the house theme. Use for card view. */
  hook: string;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  keyTransits: { planet: string; sign: string; house: number; influence: string }[];
  /** Health/Career/Marriage + a derived Overall — see design doc 2026-07-03. */
  categories: Record<Category, CategoryReading>;
}
```

Add the import at the top of the file (alongside the existing imports):

```ts
import type { Category, CategoryReading } from '@aroha-astrology/shared';
```

Add these two helper functions right after the `DOMAIN_ADVICE` constant added in Task 2:

```ts
function buildDomainReading(
  domain: 'health' | 'career' | 'marriage',
  overallScore: number,
  moonSignIndex: number,
  transitSigns: Record<string, number>,
  variantSeed: number,
): CategoryReading {
  const nudge = domainNudge(domain, moonSignIndex, transitSigns);
  const score = Math.max(1, Math.min(5, Math.round(overallScore + nudge)));
  const quality = domainQuality(score);
  return {
    hook: buildDomainHook(quality, DOMAIN_THEME[domain], variantSeed),
    description: '', // daily: no separate paragraph, matches the card view's compactness
    advice: DOMAIN_ADVICE[domain][quality],
    quality,
    score,
  };
}

function overallReadingFrom(categories: {
  health: CategoryReading;
  career: CategoryReading;
  marriage: CategoryReading;
}): CategoryReading {
  const scores = [categories.health.score, categories.career.score, categories.marriage.score];
  const score = Math.max(1, Math.min(5, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)));
  const quality = domainQuality(score);
  return {
    hook: buildDomainHook(quality, 'the overall picture', score),
    description: '',
    advice: "Check the individual areas below for what's actually driving this.",
    quality,
    score,
  };
}
```

Now find the `moonSignPrediction` function and add the category block right before its `return` statement (after `const hook = buildHook(...)` and before `return {`):

```ts
  const domainSeed = moonSignIndex + dayOfYear;
  const health = buildDomainReading('health', qualityInfo.score, moonSignIndex, transitSigns, domainSeed);
  const career = buildDomainReading('career', qualityInfo.score, moonSignIndex, transitSigns, domainSeed + 1);
  const marriage = buildDomainReading('marriage', qualityInfo.score, moonSignIndex, transitSigns, domainSeed + 2);
  const overall = overallReadingFrom({ health, career, marriage });
```

Then add `categories: { overall, health, career, marriage },` to the returned object (right after the existing `keyTransits,` line).

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: PASS (11 tests total).

- [ ] **Step 5: Typecheck**

Run: `cd backend && npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/lib/astro-tools/daily-synthesis.ts test/daily-synthesis-categories.spec.ts
git commit -m "feat(horoscope): wire category ratings into daily moonSignPrediction"
```

---

## Task 4: Wire categories into weekly/monthly/yearly `buildPeriodic`

**Files:**
- Modify: `backend/src/lib/astro-tools/daily-synthesis.ts`
- Test: `backend/test/daily-synthesis-categories.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `backend/test/daily-synthesis-categories.spec.ts`:

```ts
import { moonSignWeeklyPrediction, moonSignMonthlyPrediction } from '../src/lib/astro-tools/daily-synthesis.js';

describe('daily-synthesis: periodic categories', () => {
  it('weekly includes all 4 categories with non-empty descriptions', async () => {
    const result = await moonSignWeeklyPrediction(0);
    for (const key of ['overall', 'health', 'career', 'marriage'] as const) {
      const c = result.categories[key];
      expect(c.score).toBeGreaterThanOrEqual(1);
      expect(c.score).toBeLessThanOrEqual(5);
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it('monthly descriptions are richer (longer) than weekly ones', async () => {
    const weekly = await moonSignWeeklyPrediction(0);
    const monthly = await moonSignMonthlyPrediction(0);
    expect(monthly.categories.career.description.length).toBeGreaterThan(
      weekly.categories.career.description.length,
    );
  }, 20_000);
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: FAIL — `result.categories` is undefined on `PeriodicMoonSignPrediction`.

- [ ] **Step 3: Add `categories` to `PeriodicMoonSignPrediction` and wire it up**

Update the `PeriodicMoonSignPrediction` interface:

```ts
export interface PeriodicMoonSignPrediction {
  sign: string;
  period: PeriodicPeriod;
  periodStart: string;
  periodEnd: string;
  /** Average of the sampled daily scores (1-5), rounded to the nearest integer for display. */
  score: number;
  quality: 'good' | 'challenging' | 'moderate';
  favorableDays: number;
  totalDaysSampled: number;
  bestDay: { date: string; score: number } | undefined;
  worstDay: { date: string; score: number } | undefined;
  hook: string;
  description: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  /** Snapshot of major-planet placements relative to this sign, taken at periodStart. */
  keyTransits: { planet: string; sign: string; house: number; influence: string }[];
  /** Health/Career/Marriage + a derived Overall, aggregated across the sampled daily predictions. */
  categories: Record<Category, CategoryReading>;
}
```

Add this function right after `buildDomainReading`/`overallReadingFrom` from Task 3 (it aggregates the daily `categories` already computed per sampled date, exactly mirroring how `buildPeriodic` already averages the top-level `score`):

```ts
function buildPeriodicDomainReading(
  domain: 'health' | 'career' | 'marriage',
  daily: MoonSignPrediction[],
  period: PeriodicPeriod,
  unit: string,
): CategoryReading {
  const scores = daily.map((d) => d.categories[domain].score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  const score = Math.max(1, Math.min(5, Math.round(avgScore)));
  const quality = domainQuality(score);
  const favorableCount = daily.filter((d) => d.categories[domain].score >= 4).length;
  const hook = buildDomainHook(quality, DOMAIN_THEME[domain], daily.length + score);

  let best: MoonSignPrediction | undefined;
  for (const d of daily) {
    if (!best || d.categories[domain].score > best.categories[domain].score) best = d;
  }

  const description =
    period === 'weekly'
      ? `${favorableCount} of the next ${daily.length} ${unit} favor ${DOMAIN_THEME[domain]}.`
      : `${favorableCount} of the ${daily.length} sampled ${unit} favor ${DOMAIN_THEME[domain]}, with the strongest point around ${
          period === 'yearly' ? `the month starting ${best?.date ?? 'n/a'}` : (best?.date ?? 'n/a')
        }.`;

  return { hook, description, advice: DOMAIN_ADVICE[domain][quality], quality, score };
}
```

Now find `buildPeriodic` (the shared function used by weekly/monthly/yearly) and add, right before its `return` statement:

```ts
  const health = buildPeriodicDomainReading('health', daily, period, unit);
  const career = buildPeriodicDomainReading('career', daily, period, unit);
  const marriage = buildPeriodicDomainReading('marriage', daily, period, unit);
  const overall = overallReadingFrom({ health, career, marriage });
```

Then add `categories: { overall, health, career, marriage },` to the returned object (right after the existing `keyTransits,` line).

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd backend && npx vitest run test/daily-synthesis-categories.spec.ts`
Expected: PASS (13 tests total).

- [ ] **Step 5: Typecheck**

Run: `cd backend && npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/lib/astro-tools/daily-synthesis.ts test/daily-synthesis-categories.spec.ts
git commit -m "feat(horoscope): wire category ratings into weekly/monthly/yearly aggregation"
```

---

## Task 5: Extend the personalized `StructuredHoroscope` type + zod schema

**Files:**
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/modules/horoscope/horoscope.schemas.ts`

- [ ] **Step 1: Extend the DB-side type**

In `backend/src/db/schema.ts`, find the `StructuredHoroscope` type and replace it:

```ts
/**
 * Rich structured reading — mirrors the shape the moon-sign forecast cards
 * already use (components/horoscope/types.ts DailyForecastData), so the
 * personalized card can reuse the same Plain-view UI. Populated on
 * daily/weekly/monthly rows only; yearly stays as an overview + monthly
 * breakdown (a 1-5 "quality score" doesn't translate well to a whole year).
 *
 * `categories` (added 2026-07-03) holds independently-rated Health/Career/
 * Marriage plus a derived Overall — see
 * docs/superpowers/specs/2026-07-03-horoscope-category-ratings-design.md.
 * The top-level hook/description/advice/quality/score fields are kept as a
 * mirror of `categories.overall` for backward compatibility with any
 * consumer still reading the old singular shape.
 */
export type StructuredHoroscope = {
  hook: string;
  description: string;
  advice: string;
  quality: 'good' | 'moderate' | 'challenging' | 'avoid';
  score: number; // 1-5
  luckyColor: string;
  luckyNumber: number;
  categories: Record<Category, CategoryReading>;
};
```

`backend/src/db/schema.ts` already imports `PanchangData` via the workspace alias (`import type { PanchangData } from '@aroha-astrology/shared';`) — extend that same import line to also pull in `Category` and `CategoryReading`:

```ts
import type { Category, CategoryReading, PanchangData } from '@aroha-astrology/shared';
```

- [ ] **Step 2: Extend the zod schema**

In `backend/src/modules/horoscope/horoscope.schemas.ts`, add a new schema right after `StructuredHoroscopeSchema` (before `DashaReadingSchema`):

```ts
export const CategoryReadingSchema = z
  .object({
    hook: z.string(),
    description: z.string(),
    advice: z.string(),
    quality: z.enum(['good', 'moderate', 'challenging', 'avoid']),
    score: z.number().int().min(1).max(5),
  })
  .openapi('CategoryReading');
```

Then update `StructuredHoroscopeSchema` to add the `categories` field:

```ts
export const StructuredHoroscopeSchema = z
  .object({
    hook: z.string(),
    description: z.string(),
    advice: z.string(),
    quality: z.enum(['good', 'moderate', 'challenging', 'avoid']),
    score: z.number().int().min(1).max(5),
    luckyColor: z.string(),
    luckyNumber: z.number().int().min(1).max(9),
    categories: z.object({
      overall: CategoryReadingSchema,
      health: CategoryReadingSchema,
      career: CategoryReadingSchema,
      marriage: CategoryReadingSchema,
    }),
  })
  .openapi('StructuredHoroscope');
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit -p .`
Expected: errors in `llm/horoscope.ts` (it constructs `StructuredHoroscope`/parses responses without `categories` yet) — that's expected, fixed in Task 6.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/db/schema.ts src/modules/horoscope/horoscope.schemas.ts
git commit -m "feat(horoscope): add categories field to StructuredHoroscope type + schema"
```

---

## Task 6: Update the LLM prompt + parsing for 4-category output

**Files:**
- Modify: `backend/src/lib/llm/horoscope.ts`
- Test: `backend/test/horoscope-categories.spec.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `backend/test/horoscope-categories.spec.ts` — this tests the pure parsing/override logic without calling the real LLM:

```ts
import { describe, it, expect } from 'vitest';
import { parseStructuredResponse } from '../src/lib/llm/horoscope.js';

const VALID_CATEGORY = {
  hook: 'Test hook',
  description: 'Test description that is long enough.',
  advice: 'Test advice.',
  quality: 'good',
  score: 5,
};

function validRaw(overallScore = 1) {
  return JSON.stringify({
    health: { ...VALID_CATEGORY, score: 4 },
    career: { ...VALID_CATEGORY, score: 2 },
    marriage: { ...VALID_CATEGORY, score: 3 },
    // overall's score here is deliberately wrong/inconsistent (1) to prove
    // the server overrides it rather than trusting the model.
    overall: { ...VALID_CATEGORY, score: overallScore },
  });
}

describe('horoscope: parseStructuredResponse category handling', () => {
  it('parses all 4 categories from valid JSON', () => {
    const result = parseStructuredResponse(validRaw());
    expect(result).not.toBeNull();
    expect(result!.categories.health.score).toBe(4);
    expect(result!.categories.career.score).toBe(2);
    expect(result!.categories.marriage.score).toBe(3);
  });

  it("overrides overall.score/quality with the average of health/career/marriage, ignoring the model's own overall score", () => {
    const result = parseStructuredResponse(validRaw(1));
    // average(4, 2, 3) = 3
    expect(result!.categories.overall.score).toBe(3);
    expect(result!.categories.overall.quality).toBe('moderate');
    // The model's narrative text for overall is still kept.
    expect(result!.categories.overall.hook).toBe('Test hook');
  });

  it('mirrors categories.overall onto the legacy top-level fields', () => {
    const result = parseStructuredResponse(validRaw(1));
    expect(result!.score).toBe(result!.categories.overall.score);
    expect(result!.quality).toBe(result!.categories.overall.quality);
    expect(result!.hook).toBe(result!.categories.overall.hook);
  });

  it('returns null when a category block is missing', () => {
    const raw = JSON.stringify({ health: VALID_CATEGORY, career: VALID_CATEGORY });
    expect(parseStructuredResponse(raw)).toBeNull();
  });

  it('returns null on unparseable JSON', () => {
    expect(parseStructuredResponse('not json')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd backend && npx vitest run test/horoscope-categories.spec.ts`
Expected: FAIL — `parseStructuredResponse` isn't exported yet, and doesn't understand the new shape.

- [ ] **Step 3: Update the prompt and parsing in `llm/horoscope.ts`**

Replace the `STRUCTURED_JSON_RULE` constant:

```ts
const STRUCTURED_JSON_RULE = `Return STRICT JSON only, no markdown fences, in this exact shape:
{"health": <block>, "career": <block>, "marriage": <block>, "overall": <block>}
where each <block> is: {"hook": string, "description": string, "advice": string, "quality": "good"|"moderate"|"challenging"|"avoid", "score": 1-5}

Write FOUR independent blocks — health, career, marriage, and overall — each covering that
specific life area (overall = your holistic read considering all three together, not just
a repeat of one of them).

"hook": one punchy headline sentence naming that block's most relevant theme (this is the
lead the user sees first — make it count, never generic filler like "Today is a good day
for you").
"description": plain-language supporting detail for that block — what's going on and why it
matters.
"advice": 1-2 concrete, actionable sentences for that specific area.
"quality"/"score": your honest read for that area — "good"/4-5 for a genuinely strong
window, "moderate"/3 for a steady/mixed one, "challenging"/2 for friction to navigate
carefully, "avoid"/1 only for a real caution — do not inflate every block to "good".`;
```

Also add, right after `STRUCTURED_JSON_RULE`, a shared block that still needs a `luckyColor`/`luckyNumber` pair (kept top-level, not per-category — these are a single fun fact per reading, not a life-domain metric):

```ts
const LUCKY_ELEMENTS_RULE = `Also include at the top level (sibling to health/career/marriage/overall): "luckyColor": a single color name, and "luckyNumber": an integer 1-9.`;
```

Update each of the 3 per-period system prompts (`HOROSCOPE_SYSTEM.daily`/`.weekly`/`.monthly`) to append `${LUCKY_ELEMENTS_RULE}` after `${STRUCTURED_JSON_RULE}`, and adjust the word-budget line per period to apply "per block" instead of once — for example the daily prompt becomes:

```ts
  daily: `You are writing a short personalized daily Vedic astrology horoscope for a mobile app.

${GROUNDING_RULE}
${PLAIN_LANGUAGE_RULE}

${STRUCTURED_JSON_RULE}
${LUCKY_ELEMENTS_RULE}
Keep each block's "hook" under 20 words and "description" under 40 words. ${STYLE_RULE}`,
```

Apply the same pattern to `weekly` (`description` under 70 words per block) and `monthly` (`description` under 100 words per block, mentioning how the theme develops across the month) — yearly reuses the monthly budget per the design doc (no separate yearly structured block exists today; yearly only has `monthlyBreakdown`, unchanged).

Now replace `parseStructuredResponse` and the code that calls it:

```ts
export function parseStructuredResponse(raw: string): StructuredHoroscope | null {
  try {
    const data = JSON.parse(raw) as {
      health?: unknown;
      career?: unknown;
      marriage?: unknown;
      overall?: unknown;
      luckyColor?: unknown;
      luckyNumber?: unknown;
    };

    const health = parseCategoryBlock(data.health);
    const career = parseCategoryBlock(data.career);
    const marriage = parseCategoryBlock(data.marriage);
    const overallRaw = parseCategoryBlock(data.overall);
    if (!health || !career || !marriage || !overallRaw) return null;
    if (typeof data.luckyColor !== 'string' || !data.luckyColor.trim()) return null;
    if (typeof data.luckyNumber !== 'number') return null;

    // Overall's score/quality is always server-derived — never trust the model's own
    // number for it, only its narrative text (see design doc).
    const overallScore = Math.max(
      1,
      Math.min(5, Math.round((health.score + career.score + marriage.score) / 3)),
    );
    const overall: CategoryReading = {
      ...overallRaw,
      score: overallScore,
      quality: scoreToQuality(overallScore),
    };

    return {
      // Legacy top-level fields mirror categories.overall.
      hook: overall.hook,
      description: overall.description,
      advice: overall.advice,
      quality: overall.quality,
      score: overall.score,
      luckyColor: data.luckyColor.trim(),
      luckyNumber: Math.min(9, Math.max(1, Math.round(data.luckyNumber))),
      categories: { overall, health, career, marriage },
    };
  } catch {
    return null;
  }
}

function scoreToQuality(score: number): 'good' | 'moderate' | 'challenging' | 'avoid' {
  if (score >= 4) return 'good';
  if (score === 3) return 'moderate';
  if (score === 2) return 'challenging';
  return 'avoid';
}

function parseCategoryBlock(block: unknown): CategoryReading | null {
  if (typeof block !== 'object' || block === null) return null;
  const b = block as Partial<CategoryReading>;
  if (
    typeof b.hook !== 'string' ||
    !b.hook.trim() ||
    typeof b.description !== 'string' ||
    !b.description.trim() ||
    typeof b.advice !== 'string' ||
    !b.advice.trim() ||
    typeof b.score !== 'number'
  ) {
    return null;
  }
  const quality = QUALITIES.includes(b.quality as (typeof QUALITIES)[number])
    ? (b.quality as (typeof QUALITIES)[number])
    : 'moderate';
  return {
    hook: b.hook.trim(),
    description: b.description.trim(),
    advice: b.advice.trim(),
    quality,
    score: Math.min(5, Math.max(1, Math.round(b.score))),
  };
}
```

Delete the old `parseStructuredResponse` implementation this replaces (the one keyed on a single flat `{hook, description, advice, quality, score, luckyColor, luckyNumber}` shape). Add the import at the top of the file:

```ts
import type { Category, CategoryReading } from '@aroha-astrology/shared';
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd backend && npx vitest run test/horoscope-categories.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck the whole backend**

Run: `cd backend && npx tsc --noEmit -p .`
Expected: no errors referencing `chat-grounding.ts`, `daily-synthesis.ts`, `horoscope.ts`, `horoscope.schemas.ts`, or `schema.ts` (pre-existing unrelated errors in `scripts/stress-test/seed.ts` etc. are not in scope for this plan).

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/lib/llm/horoscope.ts test/horoscope-categories.spec.ts
git commit -m "feat(horoscope): LLM prompt + parsing for 4-category structured output"
```

---

## Task 7: Frontend shared types

**Files:**
- Modify: `components/horoscope/types.ts`
- Modify: `lib/api.ts`

- [ ] **Step 1: Add `Category`/`CategoryReading` and extend the forecast types**

In `components/horoscope/types.ts`, add right after the `KeyTransit` interface:

```ts
export type Category = "overall" | "health" | "career" | "marriage";

export interface CategoryReading {
  hook: string;
  description: string;
  advice: string;
  quality: "good" | "moderate" | "challenging" | "avoid";
  score: number; // 1-5
}
```

Add `categories: Record<Category, CategoryReading>;` to both `DailyForecastData` and `PeriodicForecastData` interfaces (each already lists `keyTransits: KeyTransit[];` as their last field — add the new field right after it).

- [ ] **Step 2: Extend `StructuredHoroscope` in `lib/api.ts`**

Find the `StructuredHoroscope` interface in `lib/api.ts` and add the `categories` field:

```ts
export interface StructuredHoroscope {
  hook: string;
  description: string;
  advice: string;
  quality: "good" | "moderate" | "challenging" | "avoid";
  score: number; // 1-5
  luckyColor: string;
  luckyNumber: number;
  categories: Record<Category, CategoryReading>;
}
```

`lib/api.ts` currently has a single top-level import (`import { getFirebaseAuth } from "./firebase";` at line 9). Add the new import directly below it:

```ts
import type { Category, CategoryReading } from "@/components/horoscope/types";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: errors in `app/horoscope/page.tsx` and `components/horoscope/ForecastDetailModal.tsx` (they render the old shape) — expected, fixed in Tasks 9–11.

- [ ] **Step 4: Commit**

```bash
git add components/horoscope/types.ts lib/api.ts
git commit -m "feat(horoscope): add Category/CategoryReading types to frontend"
```

---

## Task 8: Extract the shared `BottomSheetModal` shell

**Files:**
- Create: `components/ui/BottomSheetModal.tsx`
- Modify: `components/horoscope/MonthlyBreakdownModal.tsx`

- [ ] **Step 1: Create the shared shell**

`ForecastDetailModal.tsx` and `MonthlyBreakdownModal.tsx` currently duplicate the same backdrop/sheet/header/scroll/close-button markup almost verbatim. Extract it:

```tsx
// components/ui/BottomSheetModal.tsx
"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function BottomSheetModal({
  onClose,
  header,
  children,
  closeLabel,
}: {
  onClose: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  closeLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-card border border-gold/20 rounded-t-3xl sm:rounded-2xl shadow-2xl"
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-gold/10 px-5 py-4 flex items-center justify-between z-10">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {/* Bottom padding for mobile */}
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Refactor `MonthlyBreakdownModal` onto it (no visual change)**

Replace the entire contents of `components/horoscope/MonthlyBreakdownModal.tsx`:

```tsx
"use client";

import { useTranslation } from "react-i18next";
import type { MonthlyBreakdownEntry } from "@/lib/api";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

export default function MonthlyBreakdownModal({
  year,
  overview,
  months,
  onClose,
}: {
  year: string;
  overview: string;
  months: MonthlyBreakdownEntry[];
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <h2 className="text-lg font-semibold font-display text-foreground truncate">
          {t("horoscope.monthByMonthTitle", { year })}
        </h2>
      }
    >
      <p className="text-sm text-foreground/90 leading-relaxed mb-5">{overview}</p>

      <div className="space-y-3">
        {months.map((m) => (
          <div key={m.month} className="p-3.5 rounded-xl border border-gold/10 bg-surface">
            <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-1">
              {m.monthLabel}
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{m.summary}</p>
          </div>
        ))}
      </div>
    </BottomSheetModal>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors on these two files.

- [ ] **Step 4: Manual visual check**

Start the dev server (`npm run dev`) and open `/horoscope`, switch to the Yearly tab, tap "Month by month" — the modal should look and behave identically to before (spring-in sheet, sticky header, X button, scrollable months list).

- [ ] **Step 5: Commit**

```bash
git add components/ui/BottomSheetModal.tsx components/horoscope/MonthlyBreakdownModal.tsx
git commit -m "refactor(horoscope): extract shared BottomSheetModal shell"
```

---

## Task 9: `CategoryRatingRow` component

**Files:**
- Create: `components/horoscope/CategoryRatingRow.tsx`
- Modify: `i18n/resources.ts` (category labels — see Task 12 for the full 7-language addition; this task only needs the `en` keys to compile against, the rest land in Task 12)

- [ ] **Step 1: Add the `en` category labels first (needed to write/typecheck this component)**

In `i18n/resources.ts`, inside the `en.horoscope` block, find the line `worstDay: "Toughest Day",` (inside `detail: {...}`) and add a new sibling block right after `detail`'s closing `},` and before `dasha: {`:

```ts
        category: {
          overall: "Overall",
          health: "Health",
          career: "Career",
          marriage: "Marriage",
        },
```

Also find `viewMonthByMonth: "Month by month",` (near the top of `en.horoscope`) and add right after it:

```ts
        viewFullReading: "View Full Reading",
```

- [ ] **Step 2: Create the component**

```tsx
// components/horoscope/CategoryRatingRow.tsx
"use client";

import { Star, Sparkles, HeartPulse, Briefcase, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Category, CategoryReading } from "./types";

const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  overall: <Sparkles size={16} />,
  health: <HeartPulse size={16} />,
  career: <Briefcase size={16} />,
  marriage: <Heart size={16} />,
};

export default function CategoryRatingRow({
  category,
  reading,
}: {
  category: Category;
  reading: CategoryReading;
}) {
  const { t } = useTranslation();

  return (
    <div className="p-3.5 rounded-xl border border-gold/10 bg-surface/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-foreground text-sm font-semibold">
          <span className="text-gold">{CATEGORY_ICON[category]}</span>
          {t(`horoscope.category.${category}`)}
        </div>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={13}
              className={i < reading.score ? "fill-gold text-gold" : "text-gold/20"}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-gold/90 font-medium leading-snug mb-1">{reading.hook}</p>
      {reading.description && (
        <p className="text-xs text-foreground/80 leading-relaxed mb-1.5">{reading.description}</p>
      )}
      <p className="text-xs text-muted leading-relaxed">{reading.advice}</p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors on this file.

- [ ] **Step 4: Commit**

```bash
git add components/horoscope/CategoryRatingRow.tsx i18n/resources.ts
git commit -m "feat(horoscope): add CategoryRatingRow component + en category labels"
```

---

## Task 10: Extend `ForecastDetailModal` with the category breakdown

**Files:**
- Modify: `components/horoscope/ForecastDetailModal.tsx`

- [ ] **Step 1: Rebuild on `BottomSheetModal` and add the category section**

Replace the entire contents of `components/horoscope/ForecastDetailModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Star, Moon, Sparkles, Palette, Hash, ArrowRight, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isDaily, type ForecastData, PLANET_EMOJI, QUALITY_BADGE_KEYS } from "./types";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import CategoryRatingRow from "./CategoryRatingRow";

type ViewMode = "plain" | "technical";
const CATEGORY_ORDER = ["overall", "health", "career", "marriage"] as const;

export default function ForecastDetailModal({
  forecast,
  sign,
  onClose,
}: {
  forecast: ForecastData;
  sign: { name: string; symbol: string; dates: string };
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>("plain");
  const badgeKey = QUALITY_BADGE_KEYS[forecast.quality] ?? QUALITY_BADGE_KEYS.moderate;
  const daily = isDaily(forecast);

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full border-2 border-gold/40 flex items-center justify-center text-2xl shrink-0">
            {sign.symbol}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold font-display text-foreground">{sign.name}</h2>
            <p className="text-xs text-muted truncate">
              {daily ? forecast.date : `${forecast.periodStart} – ${forecast.periodEnd}`} &middot; {sign.dates}
            </p>
          </div>
        </div>
      }
    >
      {/* Technical / Plain toggle — same underlying data, two renderers */}
      <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40 mb-4">
        {(["plain", "technical"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              view === mode ? "bg-gold text-[#1a0e00]" : "text-muted"
            }`}
          >
            {t(`horoscope.toggle.${mode}`)}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {/* Score + Quality — shown in both views */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={18} className={i < forecast.score ? "fill-gold text-gold" : "text-gold/20"} />
            ))}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
            {t(badgeKey.i18nKey)}
          </span>
        </div>

        {view === "plain" ? (
          <>
            {/* Hook — the one-line lead, spec 4.1 */}
            <p className="text-base text-gold font-semibold leading-snug">{forecast.hook}</p>

            {/* Supporting explanation */}
            <p className="text-sm text-foreground/90 leading-relaxed">{forecast.description}</p>

            {/* Advice */}
            <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
                <Sparkles size={14} />
                {t("horoscope.detail.todaysAdvice")}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{forecast.advice}</p>
            </div>

            {/* Per-category breakdown — new 2026-07-03 */}
            <div className="space-y-2.5">
              {CATEGORY_ORDER.map((category) => (
                <CategoryRatingRow key={category} category={category} reading={forecast.categories[category]} />
              ))}
            </div>

            {/* Lucky Elements — light, low-stakes addition per spec 1.3 */}
            <div className="flex gap-3">
              <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                <Palette size={16} className="text-gold mx-auto mb-1" />
                <p className="text-xs text-muted">{t("horoscope.detail.luckyColor")}</p>
                <p className="text-sm text-foreground font-medium">{forecast.luckyColor}</p>
              </div>
              <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
                <Hash size={16} className="text-gold mx-auto mb-1" />
                <p className="text-xs text-muted">{t("horoscope.detail.luckyNumber")}</p>
                <p className="text-sm text-foreground font-medium">{forecast.luckyNumber}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Technical facts — traceable to the calculation, never invented */}
            {daily ? (
              <div className="bg-surface/50 border border-gold/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
                  <Moon size={14} />
                  {t("horoscope.detail.moonTransit")}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted text-xs">{t("horoscope.detail.transitSign")}</p>
                    <p className="text-foreground font-medium">{forecast.transitMoonSign}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("horoscope.detail.nakshatra")}</p>
                    <p className="text-foreground font-medium">{forecast.transitMoonNakshatra ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("horoscope.detail.houseFromSign")}</p>
                    <p className="text-foreground font-medium">{t("horoscope.detail.nthHouse", { n: forecast.houseFromSign })}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("horoscope.detail.ashtamaChandra")}</p>
                    <p className={`font-medium ${forecast.isAshtamaChandra ? "text-red-400" : "text-emerald-400"}`}>
                      {forecast.isAshtamaChandra ? `${t("common.yes")} ⚠️` : `${t("common.no")} ✓`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface/50 border border-gold/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider">
                  <Calendar size={14} />
                  {t("horoscope.detail.periodSample")}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted text-xs">{t("horoscope.detail.favorableDays")}</p>
                    <p className="text-foreground font-medium">{forecast.favorableDays} / {forecast.totalDaysSampled}</p>
                  </div>
                  {forecast.bestDay && (
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.bestDay")}</p>
                      <p className="text-emerald-400 font-medium">{forecast.bestDay.date} ({forecast.bestDay.score}/5)</p>
                    </div>
                  )}
                  {forecast.worstDay && (
                    <div>
                      <p className="text-muted text-xs">{t("horoscope.detail.worstDay")}</p>
                      <p className="text-amber-400 font-medium">{forecast.worstDay.date} ({forecast.worstDay.score}/5)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key Transits */}
            {forecast.keyTransits?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
                  <ArrowRight size={14} />
                  {t("horoscope.detail.keyTransits")}
                </div>
                <div className="space-y-2">
                  {forecast.keyTransits.map((transit) => (
                    <div key={transit.planet} className="flex items-center gap-3 bg-surface/30 border border-gold/5 rounded-lg px-3 py-2.5">
                      <span className="text-lg">{PLANET_EMOJI[transit.planet] ?? "🪐"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">
                          {t("horoscope.detail.planetInSign", { planet: transit.planet, sign: transit.sign })}
                          <span className="text-muted font-normal"> · {t("horoscope.detail.nthHouse", { n: transit.house })}</span>
                        </p>
                        <p className="text-xs text-muted truncate">{transit.influence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheetModal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors on this file (assuming Task 7's type extensions landed).

- [ ] **Step 3: Manual visual check**

`npm run dev`, open `/horoscope`, tap any of the 12 zodiac cards — the modal should open with the Technical/Plain toggle intact, and the "Plain" view should now show a Health/Career/Marriage/Overall breakdown between the advice box and the lucky-elements tiles. Confirm it scrolls cleanly with no overlap at a narrow (360px) viewport.

- [ ] **Step 4: Commit**

```bash
git add components/horoscope/ForecastDetailModal.tsx
git commit -m "feat(horoscope): add category breakdown to the moon-sign detail modal"
```

---

## Task 11: Personalized card — brief view + `PersonalizedDetailModal`

**Files:**
- Create: `components/horoscope/PersonalizedDetailModal.tsx`
- Modify: `app/horoscope/page.tsx`

- [ ] **Step 1: Create the modal**

```tsx
// components/horoscope/PersonalizedDetailModal.tsx
"use client";

import { Palette, Hash, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PersonalizedHoroscope } from "@/lib/api";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import CategoryRatingRow from "./CategoryRatingRow";

const CATEGORY_ORDER = ["overall", "health", "career", "marriage"] as const;

export default function PersonalizedDetailModal({
  data,
  onClose,
}: {
  data: PersonalizedHoroscope;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const s = data.structured;

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} className="text-gold shrink-0" />
          <h2 className="text-lg font-semibold font-display text-foreground truncate">
            {t("horoscope.personalizedTitle")}
          </h2>
        </div>
      }
    >
      {s ? (
        <div className="space-y-2.5">
          {CATEGORY_ORDER.map((category) => (
            <CategoryRatingRow key={category} category={category} reading={s.categories[category]} />
          ))}

          <div className="flex gap-3 pt-1">
            <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
              <Palette size={16} className="text-gold mx-auto mb-1" />
              <p className="text-xs text-muted">{t("horoscope.detail.luckyColor")}</p>
              <p className="text-sm text-foreground font-medium">{s.luckyColor}</p>
            </div>
            <div className="flex-1 bg-surface/50 border border-gold/10 rounded-xl p-3 text-center">
              <Hash size={16} className="text-gold mx-auto mb-1" />
              <p className="text-xs text-muted">{t("horoscope.detail.luckyNumber")}</p>
              <p className="text-sm text-foreground font-medium">{s.luckyNumber}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
      )}

      <p className="text-[10px] text-muted text-center mt-4">{data.forDate}</p>
    </BottomSheetModal>
  );
}
```

- [ ] **Step 2: Wire it into `PersonalizedCard`**

In `app/horoscope/page.tsx`, add the import at the top:

```tsx
import PersonalizedDetailModal from "@/components/horoscope/PersonalizedDetailModal";
```

Inside the `PersonalizedCard` function, add a new piece of state right after the existing `showMonths` state:

```tsx
  const [showDetail, setShowDetail] = useState(false);
```

Find the JSX block that currently renders the full structured content inline (the `{s && badgeKey ? (<div className="space-y-4">...` block containing the stars/hook/description/advice-box/lucky-tiles). Replace that entire inner `<div className="space-y-4">...</div>` block with a brief summary, and make the whole `<Card>` tappable:

```tsx
        {s && badgeKey ? (
          <button onClick={() => setShowDetail(true)} className="w-full text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < s.categories.overall.score ? "fill-gold text-gold" : "text-gold/20"} />
                ))}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
                {t(badgeKey.i18nKey)}
              </span>
            </div>

            <p className="text-base text-gold font-semibold leading-snug">{s.categories.overall.hook}</p>

            <div className="flex items-center gap-1 text-[11px] font-medium text-gold">
              {t("horoscope.viewFullReading")}
              <ChevronRight size={12} />
            </div>
          </button>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed">{data.summary}</p>
        )}
```

(`badgeKey` should now be derived from `s.categories.overall.quality` instead of `s.quality` — update the line above the return statement: `const badgeKey = s ? (QUALITY_BADGE_KEYS[s.categories.overall.quality] ?? QUALITY_BADGE_KEYS.moderate) : null;`)

Add the modal render, alongside the existing `MonthlyBreakdownModal` `AnimatePresence` block:

```tsx
      <AnimatePresence>
        {showDetail && s && (
          <PersonalizedDetailModal data={data} onClose={() => setShowDetail(false)} />
        )}
      </AnimatePresence>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Manual visual check**

`npm run dev`, sign in, open `/horoscope`. The personalized card should show only the overall stars/hook/badge and a "View Full Reading" affordance — tapping it opens the new modal with all 4 categories, scrollable, and the existing yearly month-by-month button should still work from wherever it's now reachable. Check at a 360px viewport for overlap/scroll issues.

- [ ] **Step 5: Commit**

```bash
git add components/horoscope/PersonalizedDetailModal.tsx app/horoscope/page.tsx
git commit -m "feat(horoscope): personalized card brief view + full-detail modal"
```

---

## Task 12: i18n — remaining 6 languages

**Files:**
- Modify: `i18n/resources.ts`

Task 9 already added the `en` keys. This task adds the same two additions (`category: {...}` block and `viewFullReading` key) to the other 6 languages, at the exact anchors below (verified against the current file).

- [ ] **Step 1: Hindi (`hi`)** — insert after `viewMonthByMonth: "महीने दर महीने",` (~line 387):

```ts
        viewFullReading: "पूरी जानकारी देखें",
```

and after `worstDay: "सबसे कठिन दिन",` / before the following `dasha: {` (~line 416-418), insert:

```ts
          category: {
            overall: "समग्र",
            health: "स्वास्थ्य",
            career: "करियर",
            marriage: "विवाह",
          },
```

- [ ] **Step 2: Bengali (`bn`)** — after `viewMonthByMonth: "মাসে মাসে",` (~line 691):

```ts
        viewFullReading: "সম্পূর্ণ পাঠ দেখুন",
```

after `worstDay: "সবচেয়ে কঠিন দিন",` (~line 720):

```ts
          category: {
            overall: "সামগ্রিক",
            health: "স্বাস্থ্য",
            career: "কর্মজীবন",
            marriage: "বিবাহ",
          },
```

- [ ] **Step 3: Marathi (`mr`)** — after `viewMonthByMonth: "महिन्यानुसार",` (~line 995):

```ts
        viewFullReading: "संपूर्ण वाचन पहा",
```

after `worstDay: "सर्वात कठीण दिवस",` (~line 1024):

```ts
          category: {
            overall: "एकूण",
            health: "आरोग्य",
            career: "करिअर",
            marriage: "विवाह",
          },
```

- [ ] **Step 4: Telugu (`te`)** — after `viewMonthByMonth: "నెలవారీగా",` (~line 1299):

```ts
        viewFullReading: "పూర్తి రీడింగ్ చూడండి",
```

after `worstDay: "కష్టతరమైన రోజు",` (~line 1328):

```ts
          category: {
            overall: "మొత్తం",
            health: "ఆరోగ్యం",
            career: "కెరీర్",
            marriage: "వివాహం",
          },
```

- [ ] **Step 5: Tamil (`ta`)** — after `viewMonthByMonth: "மாதம் வாரியாக",` (~line 1603):

```ts
        viewFullReading: "முழு விளக்கத்தைப் பார்க்க",
```

after `worstDay: "கடினமான நாள்",` (~line 1632):

```ts
          category: {
            overall: "ஒட்டுமொத்தம்",
            health: "ஆரோக்கியம்",
            career: "தொழில்",
            marriage: "திருமணம்",
          },
```

- [ ] **Step 6: Gujarati (`gu`)** — after `viewMonthByMonth: "મહિનાવાર",` (~line 1907):

```ts
        viewFullReading: "સંપૂર્ણ વાંચન જુઓ",
```

after `worstDay: "સૌથી મુશ્કેલ દિવસ",` (~line 1936):

```ts
          category: {
            overall: "એકંદર",
            health: "આરોગ્ય",
            career: "કારકિર્દી",
            marriage: "લગ્ન",
          },
```

- [ ] **Step 7: Verify line-number drift didn't break anything**

The line numbers above are from before Task 9's `en` edit shifted everything after it by a few lines — use the anchor **text** (`viewMonthByMonth:`/`worstDay:` values), not the line numbers, to locate each insertion point; re-run:

```bash
grep -n "worstDay:\|viewMonthByMonth:\|category: {" i18n/resources.ts
```

Expected: exactly 7 `viewMonthByMonth:` lines, 7 `worstDay:` lines, and 7 `category: {` lines (one set per language).

- [ ] **Step 8: Typecheck + build**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 9: Manual language-switch check**

`npm run dev`, open `/horoscope`, switch the language picker through all 7 languages, and confirm the new category labels and "view full reading" text render translated (no leftover English) on both the personalized card and a moon-sign detail modal.

- [ ] **Step 10: Commit**

```bash
git add i18n/resources.ts
git commit -m "i18n: category labels + view-full-reading string in all 7 languages"
```

---

## Task 13: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend test suite**

Run: `cd backend && npm test`
Expected: all tests pass, including the new `daily-synthesis-categories.spec.ts` and `horoscope-categories.spec.ts`.

- [ ] **Step 2: Full backend typecheck + build**

Run: `cd backend && npx tsc --noEmit -p . && npm run build`
Expected: build succeeds (pre-existing unrelated errors in `scripts/stress-test/seed.ts` are not introduced by this plan and are out of scope).

- [ ] **Step 3: Full frontend typecheck + build**

Run: `npx tsc --noEmit -p . && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual end-to-end click-through**

With both dev servers running (`cd backend && npm run dev`, and `npm run dev` at the repo root), sign in and:
1. Open `/horoscope`, confirm all 4 timescale tabs load.
2. Tap the personalized card → modal opens with 4 category rows, scrolls cleanly, closes on backdrop tap or the X button.
3. Tap a zodiac sign card → modal opens, Plain view shows the 4-category breakdown between advice and lucky elements, Technical toggle still works.
4. Repeat at a 360px-wide viewport (or a real phone) — confirm no horizontal overflow or content clipping in either modal.
5. Switch language to Hindi and Tamil, spot-check both modals for untranslated strings.

- [ ] **Step 5: Push**

```bash
git push origin main
cd backend && git push origin main
```

(Propagate to `dev`/`staging` on both repos the same way this session already did — `git push origin main:dev` / `git push origin main:staging` — and redeploy the backend to EC2 per the steps in the `aroha-backend-architecture` memory, since this plan changes `daily-synthesis.ts` and `llm/horoscope.ts`.)
