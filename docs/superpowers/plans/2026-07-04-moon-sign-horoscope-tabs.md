# Home Moon-Sign-Horoscope Today/Personal/Guna Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page's "Moon Sign Horoscope" slider with a ☀ Today / 🪷 Personal / ☸ Guna tab
widget, adding a new Guna Chakra personality-radar feature backed by the live backend's existing (but
unused) Shadbala calculation.

**Architecture:** Two repos change. `backend/` gets one new pure-function module
(`mapShadbalaToAxes`) and one new read-only endpoint (`GET /v1/kundli/guna-chakra`) computed on demand
from already-stored chart data — no DB migration. The frontend repo root extracts the existing
`PersonalizedCard` into its own file, adds a new `GunaChakraCard` + `/guna-chakra` detail page (both using
`recharts`), and replaces `HoroscopeSlider` with a new `MoonSignHoroscopeTabs` component that hosts all
three tabs.

**Tech Stack:** Next.js/React/TypeScript/Tailwind/framer-motion/react-i18next (frontend), Hono +
`@hono/zod-openapi` + Drizzle + vitest (backend), `recharts` (new frontend dependency).

**Spec:** `docs/superpowers/specs/2026-07-04-moon-sign-horoscope-tabs-design.md`

---

## File Structure

**Backend (`backend/` repo):**
- Create: `backend/src/lib/guna/mapShadbalaToAxes.ts` — pure Shadbala→personality-axes mapping.
- Create: `backend/test/guna-chakra.spec.ts` — unit tests for the mapping function.
- Modify: `backend/src/modules/kundli/kundli.schemas.ts` — add `GunaChakraSchema`.
- Modify: `backend/src/modules/kundli/kundli.service.ts` — add `getGunaChakraForUser`.
- Modify: `backend/src/modules/kundli/kundli.routes.ts` — add `GET /kundli/guna-chakra` route.

**Frontend (repo root):**
- Modify: `package.json` — add `recharts`.
- Modify: `lib/api.ts` — add `GunaAxes`/`GunaAxisKey`/`GUNA_AXIS_ORDER` + `api.gunaChakra()`.
- Create: `components/horoscope/PersonalizedCard.tsx` — extracted from `app/horoscope/page.tsx`.
- Modify: `app/horoscope/page.tsx` — import the extracted `PersonalizedCard` instead of defining it inline.
- Modify: `i18n/resources.ts` — add a `guna` namespace to all 7 language blocks.
- Create: `components/horoscope/GunaChakraCard.tsx` — compact radar preview, links to `/guna-chakra`.
- Create: `components/MoonSignHoroscopeTabs.tsx` — the 3-tab shell; absorbs `HoroscopeSlider`'s content as
  its "Today" panel.
- Delete: `components/HoroscopeSlider.tsx` — fully absorbed into `MoonSignHoroscopeTabs`.
- Modify: `app/page.tsx` — swap `HoroscopeSlider` for `MoonSignHoroscopeTabs`.
- Create: `app/guna-chakra/page.tsx` — full radar + per-axis breakdown detail page.

---

## Task 1: Port `mapShadbalaToAxes` (backend, TDD)

**Files:**
- Create: `backend/src/lib/guna/mapShadbalaToAxes.ts`
- Test: `backend/test/guna-chakra.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/test/guna-chakra.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapShadbalaToAxes, GUNA_AXIS_ORDER } from '../src/lib/guna/mapShadbalaToAxes.js';
import type { PlanetShadbala } from '../src/lib/shared/index.js';

function mkShadbala(planet: string, totalVirupas: number, requiredVirupas: number): PlanetShadbala {
  return {
    planet: planet as PlanetShadbala['planet'],
    sthanaBala: 0,
    digBala: 0,
    kalaBala: 0,
    cheshtaBala: 0,
    naisargikaBala: 0,
    drikBala: 0,
    totalVirupas,
    requiredVirupas,
    isStrong: totalVirupas >= requiredVirupas,
  };
}

describe('mapShadbalaToAxes', () => {
  it('scores every axis between 0 and 100 for planets at exactly their requirement', () => {
    const shadbala = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map((p) =>
      mkShadbala(p, 300, 300),
    );
    const axes = mapShadbalaToAxes(shadbala);
    for (const key of GUNA_AXIS_ORDER) {
      expect(axes[key]).toBeGreaterThanOrEqual(0);
      expect(axes[key]).toBeLessThanOrEqual(100);
    }
  });

  it('weights contributing planets per axis rather than just averaging', () => {
    // `communication` is Mercury 0.8 + Moon 0.2. Mercury at 2x its requirement
    // clamps to 100; Moon at 0 virupas scores 0. Weighted: 100*0.8 + 0*0.2 = 80.
    const shadbala = [mkShadbala('Mercury', 840, 420), mkShadbala('Moon', 0, 360)];
    const axes = mapShadbalaToAxes(shadbala);
    expect(axes.communication).toBe(80);
  });

  it('returns 0 for an axis whose planets are entirely missing from the input', () => {
    const axes = mapShadbalaToAxes([mkShadbala('Sun', 390, 390)]);
    // `emotion` is Moon 0.7 + Venus 0.3 — neither is present in the input.
    expect(axes.emotion).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `npx vitest run test/guna-chakra.spec.ts`
Expected: FAIL — `Cannot find module '../src/lib/guna/mapShadbalaToAxes.js'`

- [ ] **Step 3: Write the implementation**

Create `backend/src/lib/guna/mapShadbalaToAxes.ts`:

```ts
import type { PlanetShadbala } from '@aroha-astrology/shared';

export type GunaAxisKey =
  | 'leadership'
  | 'communication'
  | 'analytical'
  | 'emotion'
  | 'drive'
  | 'creative'
  | 'loyalty';

export type GunaAxes = Record<GunaAxisKey, number>;

// Loyalty draws from Saturn (commitment, perseverance), Jupiter (dharma, faith),
// and Moon (emotional bond) — the three classical karakas of steadfastness.
const AXIS_WEIGHTS: Record<GunaAxisKey, Partial<Record<string, number>>> = {
  leadership: { Sun: 0.6, Mars: 0.4 },
  communication: { Mercury: 0.8, Moon: 0.2 },
  analytical: { Mercury: 0.6, Saturn: 0.4 },
  emotion: { Moon: 0.7, Venus: 0.3 },
  drive: { Mars: 0.7, Sun: 0.3 },
  creative: { Venus: 0.6, Jupiter: 0.4 },
  loyalty: { Saturn: 0.5, Jupiter: 0.3, Moon: 0.2 },
};

export const GUNA_AXIS_ORDER: GunaAxisKey[] = [
  'leadership',
  'communication',
  'analytical',
  'emotion',
  'drive',
  'creative',
  'loyalty',
];

// requiredVirupas is the *minimum* threshold — treat it as the full 100-point mark
// so a planet at exactly minimum strength scores 100. Anything above is clamped.
function planetScore(p: PlanetShadbala): number {
  if (!p.requiredVirupas) return 0;
  return Math.max(0, Math.min(100, (p.totalVirupas / p.requiredVirupas) * 100));
}

export function mapShadbalaToAxes(shadbala: PlanetShadbala[]): GunaAxes {
  const byPlanet = new Map<string, PlanetShadbala>();
  for (const p of shadbala) byPlanet.set(p.planet, p);

  const axes = {} as GunaAxes;
  for (const key of GUNA_AXIS_ORDER) {
    const weights = AXIS_WEIGHTS[key];
    let totalWeight = 0;
    let weighted = 0;
    for (const [planet, w] of Object.entries(weights)) {
      const data = byPlanet.get(planet);
      if (!data || w === undefined) continue;
      weighted += planetScore(data) * w;
      totalWeight += w;
    }
    axes[key] = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  }
  return axes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/guna-chakra.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/guna/mapShadbalaToAxes.ts backend/test/guna-chakra.spec.ts
git -C backend add src/lib/guna/mapShadbalaToAxes.ts test/guna-chakra.spec.ts
git -C backend commit -m "feat(guna): add Shadbala-to-personality-axes mapping"
```

---

## Task 2: `GunaChakraSchema` (backend)

**Files:**
- Modify: `backend/src/modules/kundli/kundli.schemas.ts`

- [ ] **Step 1: Add the schema**

At the end of `backend/src/modules/kundli/kundli.schemas.ts`, add:

```ts
/** 200 — Guna Chakra personality-radar axes, derived from planetary Shadbala. */
export const GunaChakraSchema = z
  .object({
    axes: z.object({
      leadership: z.number(),
      communication: z.number(),
      analytical: z.number(),
      emotion: z.number(),
      drive: z.number(),
      creative: z.number(),
      loyalty: z.number(),
    }),
  })
  .openapi('GunaChakra');

export type GunaChakraDto = z.infer<typeof GunaChakraSchema>;
```

- [ ] **Step 2: Typecheck**

Run (from `backend/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git -C backend add src/modules/kundli/kundli.schemas.ts
git -C backend commit -m "feat(guna): add GunaChakra response schema"
```

---

## Task 3: `getGunaChakraForUser` service function (backend)

**Files:**
- Modify: `backend/src/modules/kundli/kundli.service.ts`

- [ ] **Step 1: Add imports**

At the top of `backend/src/modules/kundli/kundli.service.ts`, change:

```ts
import {
  calculateChart,
  calculateVimshottariDasha,
  detectAllYogas,
  analyzeAllDoshas,
} from '../../lib/astro-engine/index.js';
```

to:

```ts
import {
  calculateChart,
  calculateVimshottariDasha,
  calculateShadbala,
  detectAllYogas,
  analyzeAllDoshas,
} from '../../lib/astro-engine/index.js';
import { mapShadbalaToAxes, type GunaAxes } from '../../lib/guna/mapShadbalaToAxes.js';
import type { ChartData } from '@aroha-astrology/shared';
```

- [ ] **Step 2: Add the service function**

At the end of `backend/src/modules/kundli/kundli.service.ts`, add:

```ts
export type GunaChakraResult =
  | { ok: true; axes: GunaAxes }
  | { ok: false; reason: 'not_found' | 'computation_failed' };

/**
 * Computes the user's Guna Chakra (personality-radar) axes on demand from
 * their already-stored kundli chart data. Shadbala is pure math over
 * already-computed planet positions — no swisseph recomputation, no caching
 * needed, and no backfill required for kundlis generated before this feature
 * existed.
 */
export async function getGunaChakraForUser(userId: string): Promise<GunaChakraResult> {
  const row = await getKundliForUser(userId);
  if (!row || row.status !== 'ready' || !row.chartData) {
    return { ok: false, reason: 'not_found' };
  }
  try {
    const shadbala = calculateShadbala(row.chartData as unknown as ChartData);
    const axes = mapShadbalaToAxes(shadbala);
    return { ok: true, axes };
  } catch (err) {
    logger.error({ err, userId }, 'guna chakra computation failed');
    return { ok: false, reason: 'computation_failed' };
  }
}
```

- [ ] **Step 3: Typecheck**

Run (from `backend/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/modules/kundli/kundli.service.ts
git -C backend commit -m "feat(guna): compute Guna Chakra axes on demand from stored chart data"
```

---

## Task 4: `GET /v1/kundli/guna-chakra` route (backend)

**Files:**
- Modify: `backend/src/modules/kundli/kundli.routes.ts`

- [ ] **Step 1: Add imports**

Change:

```ts
import { KundliMissingParamsSchema, KundliSchema, KundliStatusSchema } from './kundli.schemas.js';
import {
  birthInputsForUser,
  getKundliForUser,
  isStaleGenerating,
  missingKundliParams,
  regenerateKundli,
  requestKundliGeneration,
  toKundliDto,
  type KundliRequiredField,
} from './kundli.service.js';
```

to:

```ts
import { GunaChakraSchema, KundliMissingParamsSchema, KundliSchema, KundliStatusSchema } from './kundli.schemas.js';
import {
  birthInputsForUser,
  getGunaChakraForUser,
  getKundliForUser,
  isStaleGenerating,
  missingKundliParams,
  regenerateKundli,
  requestKundliGeneration,
  toKundliDto,
  type KundliRequiredField,
} from './kundli.service.js';
```

- [ ] **Step 2: Add the route**

At the end of `backend/src/modules/kundli/kundli.routes.ts` (after the `regenerateRoute` handler), add:

```ts
/* -------------------------------------------------------------------------- */
/* GET /v1/kundli/guna-chakra                                                 */
/* -------------------------------------------------------------------------- */

const gunaChakraRoute = createRoute({
  method: 'get',
  path: '/kundli/guna-chakra',
  tags: ['Kundli'],
  summary: 'Get the current user’s Guna Chakra personality-radar axes',
  description:
    'Derived from planetary Shadbala (six-fold strength) computed on demand ' +
    'from the user’s already-stored kundli chart data. 404 if no ready kundli exists yet.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Guna Chakra axes',
      content: { 'application/json': { schema: GunaChakraSchema } },
    },
    404: errorResponse('No ready kundli available yet'),
    401: errorResponse('Unauthorized'),
  },
});

kundliRouter.openapi(gunaChakraRoute, async (c) => {
  const user = c.get('user');
  const result = await getGunaChakraForUser(user.id);

  if (!result.ok) {
    return c.json(
      {
        error: {
          code: result.reason === 'not_found' ? 'kundli_not_found' : 'computation_failed',
          message:
            result.reason === 'not_found'
              ? 'No kundli available yet.'
              : 'Could not compute Guna Chakra for this chart.',
        },
      },
      404,
    );
  }
  return c.json({ axes: result.axes }, 200);
});
```

- [ ] **Step 3: Build and typecheck**

Run (from `backend/`): `npm run build`
Expected: builds clean, no TS errors.

- [ ] **Step 4: Manual smoke test**

Run (from `backend/`): `npm run dev` (or however the dev server is started locally), then in another
shell, with a real Firebase ID token for a test user who already has a ready kundli:

```bash
curl -s http://localhost:3000/v1/kundli/guna-chakra -H "Authorization: Bearer <ID_TOKEN>" | jq
```

Expected: `{"axes":{"leadership":<0-100>,"communication":<0-100>,...}}` with all 7 keys.
Then test a user with no kundli yet — expect `404` with `{"error":{"code":"kundli_not_found",...}}`.

- [ ] **Step 5: Commit**

```bash
git -C backend add src/modules/kundli/kundli.routes.ts
git -C backend commit -m "feat(guna): expose GET /v1/kundli/guna-chakra"
```

---

## Task 5: Add `recharts` dependency (frontend)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run (from repo root): `npm install recharts`
Expected: `package.json` and `package-lock.json` updated with `recharts` under `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for the Guna Chakra radar chart"
```

---

## Task 6: `GunaAxes` types + `api.gunaChakra()` (frontend)

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add types**

In `lib/api.ts`, after the `PersonalizedHoroscope` interface (around line 175, right before
`// ─── Panchang ───`), add:

```ts
// ─── Guna Chakra ─────────────────────────────────────────────────────────────

export type GunaAxisKey =
  | "leadership"
  | "communication"
  | "analytical"
  | "emotion"
  | "drive"
  | "creative"
  | "loyalty";

export type GunaAxes = Record<GunaAxisKey, number>;

export const GUNA_AXIS_ORDER: GunaAxisKey[] = [
  "leadership",
  "communication",
  "analytical",
  "emotion",
  "drive",
  "creative",
  "loyalty",
];
```

- [ ] **Step 2: Add the endpoint**

In the `api` object in `lib/api.ts`, right after the `horoscope: (...) => ...` entry, add:

```ts
  /**
   * Guna Chakra personality-radar axes, derived from planetary Shadbala.
   * Throws ApiError(404) when the user has no ready kundli yet — callers
   * should treat that as an empty state, same convention as `horoscope()`.
   */
  gunaChakra: () => request<{ axes: GunaAxes }>("/v1/kundli/guna-chakra", { auth: true }),
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat(guna): add GunaAxes types and api.gunaChakra()"
```

---

## Task 7: Extract `PersonalizedCard` into its own file (frontend)

**Files:**
- Create: `components/horoscope/PersonalizedCard.tsx`
- Modify: `app/horoscope/page.tsx`

- [ ] **Step 1: Create the extracted component**

Create `components/horoscope/PersonalizedCard.tsx` with the exact content of the current
`PersonalizedCard` function from `app/horoscope/page.tsx` (lines 17-153), converted to a standalone
module:

```tsx
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Hash, Palette, Sparkles, Star } from "lucide-react";
import { api, ApiError, type PersonalizedHoroscope } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import MonthlyBreakdownModal from "@/components/horoscope/MonthlyBreakdownModal";
import DashaChapterCard from "@/components/horoscope/DashaChapterCard";
import Card from "@/components/ui/Card";
import type { Timescale } from "@/components/horoscope/types";
import { QUALITY_BADGE_KEYS } from "@/components/horoscope/types";

export default function PersonalizedCard({ period }: { period: Timescale }) {
  const { t } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [data, setData] = useState<PersonalizedHoroscope | null>(null);
  const [showMonths, setShowMonths] = useState(false);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    setState("loading");
    setShowMonths(false);

    api
      .horoscope(period)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setState("empty");
        else setState("error");
      });

    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, period]);

  if (state === "loading") {
    return (
      <Card className="p-5 border-gold/10 animate-pulse">
        <div className="h-4 w-40 rounded bg-gold/10 mb-3" />
        <div className="h-3 w-full rounded bg-gold/5 mb-1.5" />
        <div className="h-3 w-3/4 rounded bg-gold/5" />
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="p-5 border-gold/10 text-center text-sm text-muted">
        {t("horoscope.personalizedEmpty")}
      </Card>
    );
  }

  if (state === "error" || !data) return null;

  const hasMonths = period === "yearly" && !!data.monthlyBreakdown?.length;
  const year = data.forDate.slice(0, 4);
  const s = data.structured;
  const badgeKey = s ? (QUALITY_BADGE_KEYS[s.quality] ?? QUALITY_BADGE_KEYS.moderate) : null;

  return (
    <>
      <Card initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 border-gold/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-3">
          <Sparkles size={14} />
          {t("horoscope.personalizedTitle")}
        </div>

        {s && badgeKey ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className={i < s.score ? "fill-gold text-gold" : "text-gold/20"} />
                ))}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeKey.bg} ${badgeKey.text}`}>
                {t(badgeKey.i18nKey)}
              </span>
            </div>

            <p className="text-base text-gold font-semibold leading-snug">{s.hook}</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{s.description}</p>

            <div className="bg-gold/5 border border-gold/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
                <Sparkles size={14} />
                {t("horoscope.detail.todaysAdvice")}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{s.advice}</p>
            </div>

            <div className="flex gap-3">
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

        {data.dasha && (
          <div className="mt-4">
            <DashaChapterCard dasha={data.dasha} />
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <p className="text-[10px] text-muted">{data.forDate}</p>
          {hasMonths && (
            <button
              onClick={() => setShowMonths(true)}
              className="flex items-center gap-0.5 text-[11px] font-medium text-gold hover:text-gold-light transition-colors"
            >
              {t("horoscope.viewMonthByMonth")}
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showMonths && hasMonths && (
          <MonthlyBreakdownModal
            year={year}
            overview={data.summary}
            months={data.monthlyBreakdown!}
            onClose={() => setShowMonths(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Update `app/horoscope/page.tsx` to import it**

In `app/horoscope/page.tsx`:
1. Delete the entire inline `PersonalizedCard` function (lines 17-153).
2. Delete now-unused imports that only `PersonalizedCard` needed: `ChevronRight, Hash, Palette, Sparkles`
   from the `lucide-react` import (keep `Star`, which the moon-sign grid below still uses), and
   `MonthlyBreakdownModal`, `DashaChapterCard`, `QUALITY_BADGE_KEYS`.
3. Add `import PersonalizedCard from "@/components/horoscope/PersonalizedCard";`.

The top of the file should read:

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { useMoonSignForecasts } from "@/hooks/useMoonSignForecasts";
import ForecastDetailModal from "@/components/horoscope/ForecastDetailModal";
import PersonalizedCard from "@/components/horoscope/PersonalizedCard";
import Card from "@/components/ui/Card";
import type { Timescale } from "@/components/horoscope/types";

const TIMESCALES: Timescale[] = ["daily", "weekly", "monthly", "yearly"];

export default function HoroscopePage() {
```

(the rest of `HoroscopePage` — the timescale tabs, the `<PersonalizedCard period={timescale} />` usage,
the moon-sign grid, and the `ForecastDetailModal` at the bottom — is unchanged; `useEffect` is no longer
imported at the page level since only `PersonalizedCard` used it).

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no errors, no unused-import warnings.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, visit `/horoscope`, confirm the personalized card still renders identically across
all four timescale tabs (daily/weekly/monthly/yearly) and the month-by-month modal (yearly) still opens.

- [ ] **Step 5: Commit**

```bash
git add components/horoscope/PersonalizedCard.tsx app/horoscope/page.tsx
git commit -m "refactor(horoscope): extract PersonalizedCard into its own component"
```

---

## Task 8: `guna` i18n namespace — all 7 languages (frontend)

**Files:**
- Modify: `i18n/resources.ts`

Each of the 7 language blocks (`en`, `hi`, `bn`, `mr`, `te`, `ta`, `gu`) gets an identical-shaped `guna`
object inserted between the `home: { ... }` block and the `nav: { ... }` line. Do all 7 edits in this
task; each `old_string` below is unique in the file (it includes that language's own translated text).

- [ ] **Step 1: English (`en`)**

Old:
```
        matchMakingDesc: "Discover compatibility based on Vedic astrology.",
        remediesForYou: "Remedies For You",
      },
      nav: { home: "Home", kundli: "Kundli", askAI: "Ask AI", horoscope: "Horoscope", remedies: "Remedies", panchang: "Panchang" },
```

New:
```
        matchMakingDesc: "Discover compatibility based on Vedic astrology.",
        remediesForYou: "Remedies For You",
      },
      guna: {
        tabToday: "☀ Today",
        tabPersonal: "🪷 Personal",
        tabGuna: "☸ Guna",
        tabPersonalPlain: "Personal",
        headingToday: "Your Daily Horoscope",
        headingPersonal: "From Your Astrologer",
        headingGuna: "Guna Chakra",
        selectSignHint: "Select any sign to know more",
        personalizedHintPre: "This is a generalised prediction based on the moon sign. For an accurate reading based on your birth chart, tap",
        chakraSubtitle: "Your personality radar",
        strongestTrait: "Strongest trait: {{trait}} · {{score}}/100",
        loadingLabel: "Loading your Guna Chakra…",
        errorGeneric: "Could not load your Guna Chakra right now.",
        detailTitle: "Your Guna Chakra",
        detailSubtitle: "A personality radar derived from your planetary strengths (Shadbala).",
        seeDashaCta: "See dasha & life reading",
        axis: {
          leadership: "Leadership",
          communication: "Communication",
          analytical: "Analytical",
          emotion: "Emotion",
          drive: "Drive",
          creative: "Creative",
          loyalty: "Loyalty",
        },
        axisDesc: {
          leadership: "Confidence, courage, taking initiative.",
          communication: "Clear thinking, expressing yourself, listening.",
          analytical: "Logic, focus, working through detail.",
          emotion: "Empathy, warmth, emotional steadiness.",
          drive: "Energy, ambition, follow-through.",
          creative: "Imagination, aesthetic sense, openness.",
          loyalty: "Steadfastness, devotion, keeping commitments.",
        },
      },
      nav: { home: "Home", kundli: "Kundli", askAI: "Ask AI", horoscope: "Horoscope", remedies: "Remedies", panchang: "Panchang" },
```

- [ ] **Step 2: Hindi (`hi`)**

Old:
```
        matchMakingDesc: "वैदिक ज्योतिष के आधार पर अनुकूलता जानें।",
        remediesForYou: "आपके लिए उपाय",
      },
      nav: { home: "होम", kundli: "कुंडली", askAI: "AI पूछें", horoscope: "राशिफल", remedies: "उपाय", panchang: "पंचांग" },
```

New:
```
        matchMakingDesc: "वैदिक ज्योतिष के आधार पर अनुकूलता जानें।",
        remediesForYou: "आपके लिए उपाय",
      },
      guna: {
        tabToday: "☀ आज",
        tabPersonal: "🪷 व्यक्तिगत",
        tabGuna: "☸ गुण",
        tabPersonalPlain: "व्यक्तिगत",
        headingToday: "आपका दैनिक राशिफल",
        headingPersonal: "आपके ज्योतिषी की ओर से",
        headingGuna: "गुण चक्र",
        selectSignHint: "अधिक जानने के लिए कोई भी राशि चुनें",
        personalizedHintPre: "यह चंद्र राशि पर आधारित एक सामान्य भविष्यवाणी है। अपनी जन्म कुंडली पर आधारित सटीक विवरण के लिए टैप करें",
        chakraSubtitle: "आपका व्यक्तित्व रडार",
        strongestTrait: "सबसे मजबूत गुण: {{trait}} · {{score}}/100",
        loadingLabel: "आपका गुण चक्र लोड हो रहा है…",
        errorGeneric: "अभी आपका गुण चक्र लोड नहीं हो सका।",
        detailTitle: "आपका गुण चक्र",
        detailSubtitle: "आपकी ग्रह शक्तियों (षड्बल) से बना एक व्यक्तित्व रडार।",
        seeDashaCta: "दशा और जीवन विवरण देखें",
        axis: {
          leadership: "नेतृत्व",
          communication: "संचार",
          analytical: "विश्लेषणात्मक",
          emotion: "भावना",
          drive: "ऊर्जा",
          creative: "रचनात्मकता",
          loyalty: "निष्ठा",
        },
        axisDesc: {
          leadership: "आत्मविश्वास, साहस, पहल करना।",
          communication: "स्पष्ट सोच, खुद को व्यक्त करना, सुनना।",
          analytical: "तर्क, एकाग्रता, विवरण पर काम करना।",
          emotion: "सहानुभूति, गर्मजोशी, भावनात्मक स्थिरता।",
          drive: "ऊर्जा, महत्वाकांक्षा, दृढ़ता।",
          creative: "कल्पनाशीलता, सौंदर्यबोध, खुलापन।",
          loyalty: "दृढ़ता, समर्पण, वचन निभाना।",
        },
      },
      nav: { home: "होम", kundli: "कुंडली", askAI: "AI पूछें", horoscope: "राशिफल", remedies: "उपाय", panchang: "पंचांग" },
```

- [ ] **Step 3: Bengali (`bn`)**

Old:
```
        matchMakingDesc: "বৈদিক জ্যোতিষের ভিত্তিতে সামঞ্জস্য আবিষ্কার করুন।",
        remediesForYou: "আপনার জন্য প্রতিকার",
      },
      nav: { home: "হোম", kundli: "কুণ্ডলী", askAI: "AI জিজ্ঞাসা", horoscope: "রাশিফল", remedies: "প্রতিকার", panchang: "পঞ্চাঙ্গ" },
```

New:
```
        matchMakingDesc: "বৈদিক জ্যোতিষের ভিত্তিতে সামঞ্জস্য আবিষ্কার করুন।",
        remediesForYou: "আপনার জন্য প্রতিকার",
      },
      guna: {
        tabToday: "☀ আজ",
        tabPersonal: "🪷 ব্যক্তিগত",
        tabGuna: "☸ গুণ",
        tabPersonalPlain: "ব্যক্তিগত",
        headingToday: "আপনার দৈনিক রাশিফল",
        headingPersonal: "আপনার জ্যোতিষীর তরফ থেকে",
        headingGuna: "গুণ চক্র",
        selectSignHint: "আরও জানতে যেকোনো রাশি নির্বাচন করুন",
        personalizedHintPre: "এটি চন্দ্র রাশির উপর ভিত্তি করে একটি সাধারণ ভবিষ্যদ্বাণী। আপনার জন্ম কুণ্ডলীর উপর ভিত্তি করে সঠিক বিবরণের জন্য ট্যাপ করুন",
        chakraSubtitle: "আপনার ব্যক্তিত্ব রাডার",
        strongestTrait: "সবচেয়ে শক্তিশালী গুণ: {{trait}} · {{score}}/100",
        loadingLabel: "আপনার গুণ চক্র লোড হচ্ছে…",
        errorGeneric: "এখন আপনার গুণ চক্র লোড করা যায়নি।",
        detailTitle: "আপনার গুণ চক্র",
        detailSubtitle: "আপনার গ্রহের শক্তি (ষড়বল) থেকে তৈরি একটি ব্যক্তিত্ব রাডার।",
        seeDashaCta: "দশা ও জীবন বিবরণ দেখুন",
        axis: {
          leadership: "নেতৃত্ব",
          communication: "যোগাযোগ",
          analytical: "বিশ্লেষণাত্মক",
          emotion: "আবেগ",
          drive: "উদ্যম",
          creative: "সৃজনশীলতা",
          loyalty: "আনুগত্য",
        },
        axisDesc: {
          leadership: "আত্মবিশ্বাস, সাহস, উদ্যোগ নেওয়া।",
          communication: "স্পষ্ট চিন্তা, নিজেকে প্রকাশ করা, শোনা।",
          analytical: "যুক্তি, মনোযোগ, খুঁটিনাটি নিয়ে কাজ করা।",
          emotion: "সহানুভূতি, উষ্ণতা, মানসিক স্থিরতা।",
          drive: "শক্তি, উচ্চাকাঙ্ক্ষা, অবিচলতা।",
          creative: "কল্পনাশক্তি, নান্দনিক বোধ, উন্মুক্ততা।",
          loyalty: "অবিচলতা, নিষ্ঠা, প্রতিশ্রুতি রক্ষা।",
        },
      },
      nav: { home: "হোম", kundli: "কুণ্ডলী", askAI: "AI জিজ্ঞাসা", horoscope: "রাশিফল", remedies: "প্রতিকার", panchang: "পঞ্চাঙ্গ" },
```

- [ ] **Step 4: Marathi (`mr`)**

Old:
```
        matchMakingDesc: "वैदिक ज्योतिषावर आधारित सुसंगतता शोधा.",
        remediesForYou: "तुमच्यासाठी उपाय",
      },
      nav: { home: "होम", kundli: "कुंडली", askAI: "AI विचारा", horoscope: "राशीभविष्य", remedies: "उपाय", panchang: "पंचांग" },
```

New:
```
        matchMakingDesc: "वैदिक ज्योतिषावर आधारित सुसंगतता शोधा.",
        remediesForYou: "तुमच्यासाठी उपाय",
      },
      guna: {
        tabToday: "☀ आज",
        tabPersonal: "🪷 वैयक्तिक",
        tabGuna: "☸ गुण",
        tabPersonalPlain: "वैयक्तिक",
        headingToday: "तुमचे दैनिक राशीभविष्य",
        headingPersonal: "तुमच्या ज्योतिषाकडून",
        headingGuna: "गुण चक्र",
        selectSignHint: "अधिक जाणून घेण्यासाठी कोणतीही रास निवडा",
        personalizedHintPre: "हे चंद्र राशीवर आधारित सर्वसाधारण भाकीत आहे. तुमच्या जन्मकुंडलीवर आधारित अचूक माहितीसाठी टॅप करा",
        chakraSubtitle: "तुमचा व्यक्तिमत्व रडार",
        strongestTrait: "सर्वात बलवान गुण: {{trait}} · {{score}}/100",
        loadingLabel: "तुमचे गुण चक्र लोड होत आहे…",
        errorGeneric: "सध्या तुमचे गुण चक्र लोड होऊ शकले नाही.",
        detailTitle: "तुमचे गुण चक्र",
        detailSubtitle: "तुमच्या ग्रहबळावर (षड्बल) आधारित व्यक्तिमत्व रडार.",
        seeDashaCta: "दशा आणि जीवन वाचन पहा",
        axis: {
          leadership: "नेतृत्व",
          communication: "संवाद",
          analytical: "विश्लेषणात्मक",
          emotion: "भावना",
          drive: "उत्साह",
          creative: "सर्जनशीलता",
          loyalty: "निष्ठा",
        },
        axisDesc: {
          leadership: "आत्मविश्वास, धैर्य, पुढाकार घेणे.",
          communication: "स्पष्ट विचार, स्वतःला व्यक्त करणे, ऐकणे.",
          analytical: "तर्क, एकाग्रता, तपशीलावर काम करणे.",
          emotion: "सहानुभूती, ऊब, भावनिक स्थिरता.",
          drive: "ऊर्जा, महत्त्वाकांक्षा, सातत्य.",
          creative: "कल्पकता, सौंदर्यदृष्टी, मोकळेपणा.",
          loyalty: "स्थिरता, समर्पण, वचनपूर्ती.",
        },
      },
      nav: { home: "होम", kundli: "कुंडली", askAI: "AI विचारा", horoscope: "राशीभविष्य", remedies: "उपाय", panchang: "पंचांग" },
```

- [ ] **Step 5: Telugu (`te`)**

Old:
```
        matchMakingDesc: "వేద జ్యోతిషం ఆధారంగా అనుకూలతను కనుగొనండి.",
        remediesForYou: "మీ కోసం పరిహారాలు",
      },
      nav: { home: "హోమ్", kundli: "కుండలి", askAI: "AI అడగండి", horoscope: "రాశిఫలం", remedies: "పరిహారాలు", panchang: "పంచాంగం" },
```

New:
```
        matchMakingDesc: "వేద జ్యోతిషం ఆధారంగా అనుకూలతను కనుగొనండి.",
        remediesForYou: "మీ కోసం పరిహారాలు",
      },
      guna: {
        tabToday: "☀ ఈరోజు",
        tabPersonal: "🪷 వ్యక్తిగత",
        tabGuna: "☸ గుణ",
        tabPersonalPlain: "వ్యక్తిగత",
        headingToday: "మీ దైనిక రాశిఫలం",
        headingPersonal: "మీ జ్యోతిష్కుడి నుండి",
        headingGuna: "గుణ చక్రం",
        selectSignHint: "మరింత తెలుసుకోవడానికి ఏదైనా రాశిని ఎంచుకోండి",
        personalizedHintPre: "ఇది చంద్ర రాశి ఆధారంగా సాధారణ అంచనా. మీ జన్మ కుండలి ఆధారంగా ఖచ్చితమైన వివరాల కోసం నొక్కండి",
        chakraSubtitle: "మీ వ్యక్తిత్వ రాడార్",
        strongestTrait: "బలమైన లక్షణం: {{trait}} · {{score}}/100",
        loadingLabel: "మీ గుణ చక్రం లోడ్ అవుతోంది…",
        errorGeneric: "ప్రస్తుతం మీ గుణ చక్రాన్ని లోడ్ చేయలేకపోయాము.",
        detailTitle: "మీ గుణ చక్రం",
        detailSubtitle: "మీ గ్రహ బలాల (షడ్బల) నుండి రూపొందించిన వ్యక్తిత్వ రాడార్.",
        seeDashaCta: "దశ మరియు జీవిత వివరాలు చూడండి",
        axis: {
          leadership: "నాయకత్వం",
          communication: "సంభాషణ",
          analytical: "విశ్లేషణాత్మక",
          emotion: "భావోద్వేగం",
          drive: "చొరవ",
          creative: "సృజనాత్మకత",
          loyalty: "విధేయత",
        },
        axisDesc: {
          leadership: "ఆత్మవిశ్వాసం, ధైర్యం, చొరవ తీసుకోవడం.",
          communication: "స్పష్టమైన ఆలోచన, తనను తాను వ్యక్తపరచడం, వినడం.",
          analytical: "తర్కం, ఏకాగ్రత, వివరాలతో పనిచేయడం.",
          emotion: "సానుభూతి, వెచ్చదనం, భావోద్వేగ స్థిరత్వం.",
          drive: "శక్తి, ఆశయం, పట్టుదల.",
          creative: "ఊహాశక్తి, సౌందర్య దృష్టి, నిష్కాపట్యం.",
          loyalty: "స్థిరత్వం, అంకితభావం, మాట నిలబెట్టుకోవడం.",
        },
      },
      nav: { home: "హోమ్", kundli: "కుండలి", askAI: "AI అడగండి", horoscope: "రాశిఫలం", remedies: "పరిహారాలు", panchang: "పంచాంగం" },
```

- [ ] **Step 6: Tamil (`ta`)**

Old:
```
        matchMakingDesc: "வேத ஜோதிடத்தின் அடிப்படையில் பொருத்தத்தை கண்டறியுங்கள்.",
        remediesForYou: "உங்களுக்கான பரிகாரங்கள்",
      },
      nav: { home: "முகப்பு", kundli: "ஜாதகம்", askAI: "AI கேள்", horoscope: "ராசிபலன்", remedies: "பரிகாரம்", panchang: "பஞ்சாங்கம்" },
```

New:
```
        matchMakingDesc: "வேத ஜோதிடத்தின் அடிப்படையில் பொருத்தத்தை கண்டறியுங்கள்.",
        remediesForYou: "உங்களுக்கான பரிகாரங்கள்",
      },
      guna: {
        tabToday: "☀ இன்று",
        tabPersonal: "🪷 தனிப்பட்ட",
        tabGuna: "☸ குணம்",
        tabPersonalPlain: "தனிப்பட்ட",
        headingToday: "உங்கள் தினசரி ராசிபலன்",
        headingPersonal: "உங்கள் ஜோதிடரிடமிருந்து",
        headingGuna: "குண சக்கரம்",
        selectSignHint: "மேலும் அறிய எந்த ராசியையும் தேர்ந்தெடுக்கவும்",
        personalizedHintPre: "இது சந்திர ராசியை அடிப்படையாகக் கொண்ட பொதுவான கணிப்பு. உங்கள் ஜாதகத்தை அடிப்படையாகக் கொண்ட துல்லியமான விவரங்களுக்கு தட்டவும்",
        chakraSubtitle: "உங்கள் ஆளுமை ரேடார்",
        strongestTrait: "வலிமையான பண்பு: {{trait}} · {{score}}/100",
        loadingLabel: "உங்கள் குண சக்கரம் ஏற்றப்படுகிறது…",
        errorGeneric: "இப்போது உங்கள் குண சக்கரத்தை ஏற்ற முடியவில்லை.",
        detailTitle: "உங்கள் குண சக்கரம்",
        detailSubtitle: "உங்கள் கிரக பலங்களிலிருந்து (ஷட்பலம்) உருவாக்கப்பட்ட ஆளுமை ரேடார்.",
        seeDashaCta: "தசை மற்றும் வாழ்க்கை விவரங்களைப் பார்க்கவும்",
        axis: {
          leadership: "தலைமைத்துவம்",
          communication: "தொடர்பு",
          analytical: "பகுப்பாய்வு",
          emotion: "உணர்ச்சி",
          drive: "உந்துசக்தி",
          creative: "படைப்பாற்றல்",
          loyalty: "விசுவாசம்",
        },
        axisDesc: {
          leadership: "தன்னம்பிக்கை, தைரியம், முன்முயற்சி.",
          communication: "தெளிவான சிந்தனை, தன்னை வெளிப்படுத்துதல், கேட்டல்.",
          analytical: "தர்க்கம், கவனம், நுணுக்கமாக செயல்படுதல்.",
          emotion: "பச்சாத்தாபம், அன்பு, உணர்ச்சி நிலைத்தன்மை.",
          drive: "ஆற்றல், லட்சியம், தொடர்ச்சி.",
          creative: "கற்பனை, அழகியல் உணர்வு, திறந்த மனப்பான்மை.",
          loyalty: "உறுதிப்பாடு, அர்ப்பணிப்பு, வாக்குறுதியைக் காத்தல்.",
        },
      },
      nav: { home: "முகப்பு", kundli: "ஜாதகம்", askAI: "AI கேள்", horoscope: "ராசிபலன்", remedies: "பரிகாரம்", panchang: "பஞ்சாங்கம்" },
```

- [ ] **Step 7: Gujarati (`gu`)**

Old:
```
        matchMakingDesc: "વૈદિક જ્યોતિષના આધારે સુસંગતતા શોધો.",
        remediesForYou: "તમારા માટે ઉપાય",
      },
      nav: { home: "હોમ", kundli: "કુંડળી", askAI: "AI પૂછો", horoscope: "રાશિફળ", remedies: "ઉપાય", panchang: "પંચાંગ" },
```

New:
```
        matchMakingDesc: "વૈદિક જ્યોતિષના આધારે સુસંગતતા શોધો.",
        remediesForYou: "તમારા માટે ઉપાય",
      },
      guna: {
        tabToday: "☀ આજે",
        tabPersonal: "🪷 વ્યક્તિગત",
        tabGuna: "☸ ગુણ",
        tabPersonalPlain: "વ્યક્તિગત",
        headingToday: "તમારું દૈનિક રાશિફળ",
        headingPersonal: "તમારા જ્યોતિષી તરફથી",
        headingGuna: "ગુણ ચક્ર",
        selectSignHint: "વધુ જાણવા માટે કોઈપણ રાશિ પસંદ કરો",
        personalizedHintPre: "આ ચંદ્ર રાશિ પર આધારિત સામાન્ય આગાહી છે. તમારી જન્મકુંડળી પર આધારિત ચોક્કસ વિગતો માટે ટેપ કરો",
        chakraSubtitle: "તમારો વ્યક્તિત્વ રડાર",
        strongestTrait: "સૌથી મજબૂત ગુણ: {{trait}} · {{score}}/100",
        loadingLabel: "તમારું ગુણ ચક્ર લોડ થઈ રહ્યું છે…",
        errorGeneric: "અત્યારે તમારું ગુણ ચક્ર લોડ થઈ શક્યું નથી.",
        detailTitle: "તમારું ગુણ ચક્ર",
        detailSubtitle: "તમારી ગ્રહ શક્તિઓ (ષડ્બલ) પરથી બનેલો વ્યક્તિત્વ રડાર.",
        seeDashaCta: "દશા અને જીવન વાંચન જુઓ",
        axis: {
          leadership: "નેતૃત્વ",
          communication: "સંવાદ",
          analytical: "વિશ્લેષણાત્મક",
          emotion: "લાગણી",
          drive: "ઉત્સાહ",
          creative: "સર્જનાત્મકતા",
          loyalty: "વફાદારી",
        },
        axisDesc: {
          leadership: "આત્મવિશ્વાસ, હિંમત, પહેલ કરવી.",
          communication: "સ્પષ્ટ વિચારસરણી, પોતાને વ્યક્ત કરવું, સાંભળવું.",
          analytical: "તર્ક, ધ્યાન કેન્દ્રિત કરવું, વિગતો પર કામ કરવું.",
          emotion: "સહાનુભૂતિ, હૂંફ, ભાવનાત્મક સ્થિરતા.",
          drive: "ઊર્જા, મહત્વાકાંક્ષા, સાતત્ય.",
          creative: "કલ્પનાશક્તિ, સૌંદર્ય દૃષ્ટિ, ખુલ્લાપણું.",
          loyalty: "સ્થિરતા, સમર્પણ, વચન પાળવું.",
        },
      },
      nav: { home: "હોમ", kundli: "કુંડળી", askAI: "AI પૂછો", horoscope: "રાશિફળ", remedies: "ઉપાય", panchang: "પંચાંગ" },
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this file is a plain object literal — a syntax mistake in any language block will
surface here immediately).

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(i18n): add guna namespace across all 7 languages"
```

---

## Task 9: `GunaChakraCard` component (frontend)

**Files:**
- Create: `components/horoscope/GunaChakraCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import Card from "@/components/ui/Card";
import { api, ApiError, GUNA_AXIS_ORDER, type GunaAxes, type GunaAxisKey } from "@/lib/api";

type State = "loading" | "ready" | "empty" | "error";

/** Compact Guna Chakra preview for the home widget's "Guna" tab — full radar + link to /guna-chakra. */
export default function GunaChakraCard() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>("loading");
  const [axes, setAxes] = useState<GunaAxes | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    api
      .gunaChakra()
      .then((res) => {
        if (cancelled) return;
        setAxes(res.axes);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.status === 404 ? "empty" : "error");
      });

    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <Card className="p-5 border-gold/10 animate-pulse">
        <div className="flex gap-4 items-center">
          <div className="w-[110px] h-[110px] rounded-full bg-gold/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-gold/10" />
            <div className="h-3 w-full rounded bg-gold/5" />
          </div>
        </div>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="p-5 border-gold/10 text-center text-sm text-muted">
        {t("horoscope.personalizedEmpty")}
      </Card>
    );
  }

  if (state === "error" || !axes) {
    return (
      <Card className="p-5 border-gold/10 text-center text-sm text-muted">
        {t("guna.errorGeneric")}
      </Card>
    );
  }

  const radarData = GUNA_AXIS_ORDER.map((key) => ({
    axis: t(`guna.axis.${key}`),
    score: axes[key],
  }));

  const topKey = GUNA_AXIS_ORDER.reduce((a: GunaAxisKey, b: GunaAxisKey) => (axes[a] >= axes[b] ? a : b));
  const topScore = Math.round(axes[topKey]);

  return (
    <Link href="/guna-chakra" className="block">
      <Card className="p-5 border-gold/20 hover:border-gold/40 transition-colors active:scale-[0.98]">
        <div className="flex gap-4 items-center">
          <div className="w-[110px] h-[110px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="rgba(223,181,100,0.2)" />
                <PolarAngleAxis dataKey="axis" tick={false} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="#dfb564" fill="#dfb564" fillOpacity={0.35} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold mb-1">
              {t("guna.chakraSubtitle")}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {t("guna.strongestTrait", { trait: t(`guna.axis.${topKey}`), score: topScore })}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/horoscope/GunaChakraCard.tsx
git commit -m "feat(guna): add compact Guna Chakra preview card"
```

---

## Task 10: `MoonSignHoroscopeTabs` — replaces `HoroscopeSlider` (frontend)

**Files:**
- Create: `components/MoonSignHoroscopeTabs.tsx`
- Delete: `components/HoroscopeSlider.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the new component**

Create `components/MoonSignHoroscopeTabs.tsx`. The `TodayPanel` function below is
`HoroscopeSlider`'s existing content, with the hint text from the reference added and an `onSwitchTab`
prop wired to the "Personal" link:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Card from "@/components/ui/Card";
import ForecastDetailModal from "@/components/horoscope/ForecastDetailModal";
import PersonalizedCard from "@/components/horoscope/PersonalizedCard";
import GunaChakraCard from "@/components/horoscope/GunaChakraCard";
import { useMoonSignForecasts } from "@/hooks/useMoonSignForecasts";
import { useKundli } from "@/hooks/useKundli";
import { getUserMoonSign } from "@/lib/kundli-helpers";

type Tab = "today" | "personal" | "guna";
const TABS: Tab[] = ["today", "personal", "guna"];

function SkeletonCard() {
  return (
    <Card className="min-w-[160px] max-w-[160px] p-4 border-gold/10 flex-shrink-0 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gold/10" />
        <div className="space-y-1.5">
          <div className="h-3 w-14 rounded bg-gold/10" />
          <div className="h-2 w-20 rounded bg-gold/5" />
        </div>
      </div>
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-gold/10" />
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full rounded bg-gold/5" />
        <div className="h-2 w-3/4 rounded bg-gold/5" />
      </div>
    </Card>
  );
}

function TodayPanel({ onSwitchTab }: { onSwitchTab: (tab: Tab) => void }) {
  const { t } = useTranslation();
  const { forecasts, loading } = useMoonSignForecasts();
  const { kundli } = useKundli();
  const [selected, setSelected] = useState<number | null>(null);

  const userMoonSign = getUserMoonSign(kundli);

  // Lead with the user's own moon sign when we know it, so "your" horoscope
  // is the first thing seen rather than always starting at Aries.
  const orderedForecasts = useMemo(() => {
    if (!userMoonSign) return forecasts;
    const idx = forecasts.findIndex((f) => f.name.toLowerCase() === userMoonSign.toLowerCase());
    if (idx <= 0) return forecasts;
    return [forecasts[idx]!, ...forecasts.slice(0, idx), ...forecasts.slice(idx + 1)];
  }, [forecasts, userMoonSign]);

  const selectedForecast = selected !== null ? orderedForecasts[selected] : null;

  return (
    <>
      <p className="text-sm font-semibold text-foreground mb-1">{t("guna.selectSignHint")}</p>
      <p className="text-xs text-muted mb-3">
        {t("guna.personalizedHintPre")}{" "}
        <button
          onClick={() => onSwitchTab("personal")}
          className="text-gold underline underline-offset-2 cursor-pointer"
        >
          {t("guna.tabPersonalPlain")}
        </button>
        .
      </p>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-5">
          {orderedForecasts.map((sign, index) => {
            const isUserSign = !!userMoonSign && sign.name.toLowerCase() === userMoonSign.toLowerCase();
            return (
              <Card
                key={sign.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`min-w-[160px] max-w-[160px] p-4 flex-shrink-0 cursor-pointer active:scale-95 transition-transform ${
                  isUserSign ? "border-gold/50" : "border-gold/10 hover:border-gold/30"
                }`}
                onClick={() => setSelected(index)}
              >
                {isUserSign && (
                  <span className="inline-block text-[9px] font-semibold text-gold uppercase tracking-wider mb-1.5">
                    {t("home.yourSign")}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold drop-shadow-[0_0_5px_rgba(223,181,100,0.3)]">
                    <span className="text-lg">{sign.symbol}</span>
                  </div>
                  <div>
                    <h3 className="text-foreground text-sm font-semibold tracking-wide font-display">
                      {sign.name}
                    </h3>
                    <p className="text-[9px] text-muted leading-tight">{sign.dates}</p>
                  </div>
                </div>

                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} className={i < sign.rating ? "fill-gold text-gold" : "text-gold/20"} />
                  ))}
                </div>

                <p className="text-xs text-muted leading-relaxed line-clamp-3">{sign.text}</p>
              </Card>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedForecast?.raw && (
          <ForecastDetailModal
            forecast={selectedForecast.raw}
            sign={{ name: selectedForecast.name, symbol: selectedForecast.symbol, dates: selectedForecast.dates }}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function MoonSignHoroscopeTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("today");

  const tabLabel: Record<Tab, string> = {
    today: t("guna.tabToday"),
    personal: t("guna.tabPersonal"),
    guna: t("guna.tabGuna"),
  };
  const heading: Record<Tab, string> = {
    today: t("guna.headingToday"),
    personal: t("guna.headingPersonal"),
    guna: t("guna.headingGuna"),
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 pr-5">
        {TABS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border text-center transition-colors ${
              tab === key ? "border-gold/50 bg-gold/10 text-gold" : "border-gold/10 text-muted hover:border-gold/30"
            }`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2 pr-5">
        <h3 className="text-sm font-semibold text-gold flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
          {heading[tab]}
        </h3>
        <p className="text-[10px] text-muted">
          {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      </div>

      {tab === "today" && <TodayPanel onSwitchTab={setTab} />}
      {tab === "personal" && (
        <div className="pr-5">
          <PersonalizedCard period="daily" />
        </div>
      )}
      {tab === "guna" && (
        <div className="pr-5">
          <GunaChakraCard />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the home page**

In `app/page.tsx`, change the import:

```tsx
import HoroscopeSlider from "@/components/HoroscopeSlider";
```

to:

```tsx
import MoonSignHoroscopeTabs from "@/components/MoonSignHoroscopeTabs";
```

And change the usage (currently inside the "Daily Horoscopes" section):

```tsx
        {/* Daily Horoscopes — Moon-sign (rashi-only), distinct from the personalized kundli horoscope */}
        <div className="pl-5 pr-0 mt-8" data-tour="daily-horoscope">
          <div className="flex justify-between items-center pr-5 mb-4">
            <h2 className="text-lg font-display text-foreground">{t("home.moonSignHoroscope")}</h2>
            <Link href="/horoscope" className="text-gold text-sm flex items-center gap-1">
              {t("common.seeAll")} <span className="text-[10px]">▶</span>
            </Link>
          </div>
          <HoroscopeSlider />
        </div>
```

to:

```tsx
        {/* Daily Horoscopes — Moon-sign (rashi-only), distinct from the personalized kundli horoscope */}
        <div className="pl-5 pr-0 mt-8" data-tour="daily-horoscope">
          <div className="flex justify-between items-center pr-5 mb-4">
            <h2 className="text-lg font-display text-foreground">{t("home.moonSignHoroscope")}</h2>
            <Link href="/horoscope" className="text-gold text-sm flex items-center gap-1">
              {t("common.seeAll")} <span className="text-[10px]">▶</span>
            </Link>
          </div>
          <MoonSignHoroscopeTabs />
        </div>
```

- [ ] **Step 3: Delete the now-unused old component**

```bash
git rm components/HoroscopeSlider.tsx
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no errors — confirms nothing else imports the deleted `HoroscopeSlider.tsx`.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, visit `/`, confirm:
- The "Moon Sign Horoscope" section now shows 3 pill tabs (Today/Personal/Guna).
- "Today" (default) shows the same reordered rashi carousel as before, with the "your sign" badge and the
  hint text; tapping "Personal" in the hint text switches tabs.
- Tapping a sign card still opens `ForecastDetailModal`.
- "Personal" tab shows the same content as `/horoscope`'s personalized card.
- "Guna" tab shows the radar (or empty/error state if the test account has no kundli yet).

- [ ] **Step 6: Commit**

```bash
git add components/MoonSignHoroscopeTabs.tsx app/page.tsx
git commit -m "feat(home): replace HoroscopeSlider with Today/Personal/Guna tabs"
```

---

## Task 11: `/guna-chakra` detail page (frontend)

**Files:**
- Create: `app/guna-chakra/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import Card from "@/components/ui/Card";
import { api, ApiError, GUNA_AXIS_ORDER, type GunaAxes } from "@/lib/api";

type State = "loading" | "ready" | "empty" | "error";

export default function GunaChakraPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>("loading");
  const [axes, setAxes] = useState<GunaAxes | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .gunaChakra()
      .then((res) => {
        if (cancelled) return;
        setAxes(res.axes);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setState(err instanceof ApiError && err.status === 404 ? "empty" : "error");
      });
    return () => { cancelled = true; };
  }, []);

  const radarData = axes ? GUNA_AXIS_ORDER.map((key) => ({ axis: t(`guna.axis.${key}`), score: axes[key] })) : [];

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <h1 className="text-3xl font-bold text-center text-gold font-display">{t("guna.detailTitle")}</h1>
        <p className="text-xs text-muted text-center mt-2 mb-6">{t("guna.detailSubtitle")}</p>

        {state === "loading" && <Card className="p-5 border-gold/10 animate-pulse h-64" />}

        {state === "empty" && (
          <Card className="p-5 border-gold/10 text-center text-sm text-muted">
            {t("horoscope.personalizedEmpty")}
          </Card>
        )}

        {state === "error" && (
          <Card className="p-5 border-gold/10 text-center text-sm text-muted">{t("guna.errorGeneric")}</Card>
        )}

        {state === "ready" && axes && (
          <>
            <Card className="p-4 border-gold/20 mb-6">
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="rgba(223,181,100,0.2)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="score" stroke="#dfb564" fill="#dfb564" fillOpacity={0.35} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              {GUNA_AXIS_ORDER.map((key) => (
                <Card key={key} className="p-4 border-gold/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground font-display">{t(`guna.axis.${key}`)}</p>
                    <p className="text-xs text-muted mt-0.5">{t(`guna.axisDesc.${key}`)}</p>
                  </div>
                  <span className="text-lg font-semibold text-gold flex-shrink-0">{Math.round(axes[key])}</span>
                </Card>
              ))}
            </div>

            <Link
              href="/horoscope"
              className="mt-6 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gold/15 border border-gold/40 text-gold text-sm font-medium hover:bg-gold/25 transition-colors"
            >
              {t("guna.seeDashaCta")} <ChevronRight size={14} />
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, click through from the home page's Guna tab into `/guna-chakra`, confirm the full
radar + all 7 axis rows render with descriptions and scores, and the CTA links to `/horoscope`.

- [ ] **Step 4: Commit**

```bash
git add app/guna-chakra/page.tsx
git commit -m "feat(guna): add /guna-chakra detail page"
```

---

## Task 12: Full verification pass (both repos)

- [ ] **Step 1: Backend build + tests**

Run (from `backend/`): `npm run build && npx vitest run test/guna-chakra.spec.ts`
Expected: clean build, 3 passing tests.

- [ ] **Step 2: Frontend build**

Run (from repo root): `npx tsc --noEmit && npm run build`
Expected: clean build.

- [ ] **Step 3: Full manual walkthrough**

With `npm run dev` running against a real signed-in test account:
1. Home page → Today/Personal/Guna tabs all render and switch correctly.
2. Today tab: moon-sign-first ordering intact, "your sign" badge shows, tapping a card opens the detail
   modal, tapping "Personal" in the hint text switches to the Personal tab.
3. Personal tab: identical output to what `/horoscope`'s daily view already showed pre-refactor.
4. Guna tab → compact radar renders (or empty/error state for an account without a ready kundli) → tap
   through to `/guna-chakra` → full radar + 7 axis rows + working CTA.
5. Switch language (e.g. to Hindi) via the existing language picker and re-check steps 1-4 — no raw
   `guna.xxx` keys visible anywhere, no English fallback text.
6. `/horoscope` page (daily/weekly/monthly/yearly tabs) still works exactly as before the
   `PersonalizedCard` extraction.

- [ ] **Step 4: Report to user**

Summarize what was verified and note that the backend endpoint (`GET /v1/kundli/guna-chakra`) needs a
live-backend deploy (tar-over-SSH, `npm run build`, `pm2 reload aroha-api`, verify `/healthz`+`/readyz`,
per existing deploy steps) before the Guna tab works against production — this is a separate step from
implementation, requiring the user's PEM key.

---

## Plan Self-Review Notes

- **Spec coverage:** Every section of the design spec has a corresponding task — backend endpoint (Tasks
  1-4), `recharts`/api client (Tasks 5-6), `PersonalizedCard` extraction (Task 7), i18n (Task 8),
  `GunaChakraCard` (Task 9), home tab restructure + `HoroscopeSlider` removal (Task 10), detail page
  (Task 11), verification (Task 12).
- **No DB migration**, confirmed consistent across spec and Tasks 1-4 (`calculateShadbala` takes only
  `chartData`, computed on demand).
- **Type consistency:** `GunaAxisKey`/`GunaAxes`/`GUNA_AXIS_ORDER` are defined once per repo (backend:
  `mapShadbalaToAxes.ts`; frontend: `lib/api.ts`) and every later task (`GunaChakraCard`, `guna-chakra`
  page, `MoonSignHoroscopeTabs`) imports from that single source rather than redefining.
- **`/life-journey` non-goal:** confirmed no such route exists in this repo; Task 11's CTA links to
  `/horoscope` instead, matching the spec's stated substitution.
