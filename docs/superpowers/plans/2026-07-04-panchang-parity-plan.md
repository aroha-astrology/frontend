# Panchang Feature Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Aroha's web Panchang page to feature parity with the jyotish-ai reference — choghadiya, hora, monthly calendar with festivals/Adhik Maas, regional calendar info, and a new LLM-backed "Planning to Buy" purchase-timing feature — then push to dev/staging/main in both repos and deploy to EC2.

**Architecture:** Two separate git repos are touched. `backend/` (nested checkout of `aroha-astrology/backend`, on `main`, Hono + Drizzle + Postgres + NVIDIA NIM) gets three additions: choghadiya/hora merged into the existing `/panchang` response, a new `/panchang/month` endpoint, and a new `purchase_plans` table + `/v1/purchase-plan/*` routes. The repo root (`aroha-astrology/frontend`, Next.js) gets new components and a page rewrite consuming those endpoints, restyled onto Aroha's existing gold/dark design system rather than jyotish-ai's glass theme.

**Tech Stack:** Hono, `@hono/zod-openapi`, Drizzle ORM, Postgres, NVIDIA NIM (via existing `nim-client.ts`), vitest; Next.js 15, React 19, Tailwind, react-i18next, framer-motion, lucide-react.

**Reference spec:** `docs/superpowers/specs/2026-07-04-panchang-parity-design.md`

---

## Backend Phase (all paths relative to `backend/`)

### Task 1: Merge choghadiya + hora into the panchang engine output

**Files:**
- Modify: `src/lib/shared/types/astrology.ts:389-402` (PanchangData interface)
- Modify: `src/lib/astro-engine/panchang/index.ts` (calculateFullPanchang)
- Test: `test/panchang-choghadiya-hora.test.ts`

- [ ] **Step 1: Add the two new optional fields to `PanchangData`**

In `src/lib/shared/types/astrology.ts`, change:
```ts
export interface PanchangData {
  tithi: Tithi;
  nakshatra: NakshatraData;
  yoga: PanchangYoga;
  karana: Karana;
  vara: string; // weekday
  rahuKaal: { start: string; end: string };
  gulikaKaal: { start: string; end: string };
  yamagandaKaal: { start: string; end: string };
  abhijitMuhurta: { start: string; end: string };
  sunriseTime: string;
  sunsetTime: string;
  regionalMonths?: Record<RegionId, RegionalMonth>;
}
```
to:
```ts
export interface PanchangData {
  tithi: Tithi;
  nakshatra: NakshatraData;
  yoga: PanchangYoga;
  karana: Karana;
  vara: string; // weekday
  rahuKaal: { start: string; end: string };
  gulikaKaal: { start: string; end: string };
  yamagandaKaal: { start: string; end: string };
  abhijitMuhurta: { start: string; end: string };
  sunriseTime: string;
  sunsetTime: string;
  regionalMonths?: Record<RegionId, RegionalMonth>;
  /** 8 day + 8 night periods, cycling through 7 named types by weekday. */
  choghadiya?: { day: Choghadiya[]; night: Choghadiya[] };
  /** All 24 planetary hours for the day, starting at sunrise. */
  hora?: Hora[];
}
```
(`Choghadiya` and `Hora` are already declared further down in this same file — order doesn't matter for TS interfaces in the same module.)

- [ ] **Step 2: Compute and merge choghadiya/hora inside `calculateFullPanchang`**

In `src/lib/astro-engine/panchang/index.ts`, add imports at the top (this file already re-exports both, just add them to the local import list used inside the function):
```ts
import { calculateTithi } from './tithi';
import { calculateNakshatra } from './nakshatra';
import { calculatePanchangYoga } from './yoga';
import { calculateKarana } from './karana';
import { calculateRahuKaal, calculateGulikaKaal, calculateYamagandaKaal } from './rahuKaal';
import { calculateRegionalMonths } from './regional';
import { calculateChoghadiya } from './choghadiya';
import { calculateHora } from './hora';
```

Add this helper near `parseTimeToMin`/`formatMinToTime` (bottom of the file):
```ts
/** All 24 hora slots for the day, one hour each, starting at sunrise. */
function buildHoraList(sunrise: string, dayOfWeek: number) {
  const sunriseMin = parseTimeToMin(sunrise);
  const list = [];
  for (let i = 0; i < 24; i++) {
    const slotTime = formatMinToTime(sunriseMin + i * 60);
    list.push(calculateHora(sunrise, slotTime, dayOfWeek));
  }
  return list;
}
```

Inside `calculateFullPanchang`, right after the existing `abhijitStart`/`abhijitEnd` block and before the `return`, add:
```ts
  const choghadiyaAll = calculateChoghadiya(sunrise, sunset, dayOfWeek);
  const hora = buildHoraList(sunrise, dayOfWeek);
```

Then extend the return object (it currently ends with `regionalMonths,`) to:
```ts
  return {
    tithi,
    nakshatra,
    yoga,
    karana,
    vara: WEEKDAY_NAMES[dayOfWeek],
    rahuKaal,
    gulikaKaal,
    yamagandaKaal,
    abhijitMuhurta: {
      start: formatMinToTime(abhijitStart),
      end: formatMinToTime(abhijitEnd),
    },
    sunriseTime: sunrise,
    sunsetTime: sunset,
    regionalMonths,
    choghadiya: { day: choghadiyaAll.slice(0, 8), night: choghadiyaAll.slice(8, 16) },
    hora,
  };
```

- [ ] **Step 3: Write the test**

Create `test/panchang-choghadiya-hora.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calculateFullPanchang } from '../src/lib/astro-engine/panchang/index';

describe('calculateFullPanchang choghadiya/hora', () => {
  it('splits choghadiya into 8 day + 8 night periods', () => {
    const date = new Date('2026-07-04T12:00:00Z');
    const result = calculateFullPanchang(date, 28.6139, 77.209, 100, 200, 5.5);
    expect(result.choghadiya?.day).toHaveLength(8);
    expect(result.choghadiya?.night).toHaveLength(8);
  });

  it('returns 24 hora slots starting at sunrise with the weekday lord first', () => {
    const date = new Date('2026-07-04T12:00:00Z'); // Saturday
    const result = calculateFullPanchang(date, 28.6139, 77.209, 100, 200, 5.5);
    expect(result.hora).toHaveLength(24);
    expect(result.hora?.[0]?.planet).toBe('Saturn'); // Saturday's weekday lord
    expect(result.hora?.[0]?.startTime).toBe(result.sunriseTime);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `cd backend && npm test -- panchang-choghadiya-hora`
Expected: both assertions pass. If the weekday-lord assertion fails, check `date.getDay()` for 2026-07-04 (it is a Saturday) against `WEEKDAY_LORDS` in `hora.ts`.

- [ ] **Step 5: Update the OpenAPI response schema**

In `src/modules/astro/astro.routes.ts`, inside `panchangRoute`'s 200 response schema, add two lines after `regionalMonths: z.any().optional(),`:
```ts
            regionalMonths: z.any().optional(),
            choghadiya: z.any().optional(),
            hora: z.any().optional(),
```

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/lib/shared/types/astrology.ts src/lib/astro-engine/panchang/index.ts src/modules/astro/astro.routes.ts test/panchang-choghadiya-hora.test.ts
git commit -m "feat(panchang): include choghadiya and hora in GET /panchang"
```

---

### Task 2: `GET /panchang/month` — lightweight per-day calendar summaries

**Files:**
- Modify: `src/modules/astro/astro.service.ts` (add `classifyTithiForCalendar` + `getPanchangMonth`)
- Modify: `src/modules/astro/astro.routes.ts` (add route)
- Test: `test/panchang-month-classify.test.ts`

- [ ] **Step 1: Write the test for the pure classification helper**

Create `test/panchang-month-classify.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { classifyTithiForCalendar } from '../src/modules/astro/astro.service';

describe('classifyTithiForCalendar', () => {
  it('flags tithi 15 as full moon', () => {
    expect(classifyTithiForCalendar(15)).toEqual({ isFullMoon: true, isNewMoon: false, isEkadashi: false });
  });
  it('flags tithi 30 as new moon', () => {
    expect(classifyTithiForCalendar(30)).toEqual({ isFullMoon: false, isNewMoon: true, isEkadashi: false });
  });
  it('flags tithi 11 and 26 as Ekadashi', () => {
    expect(classifyTithiForCalendar(11).isEkadashi).toBe(true);
    expect(classifyTithiForCalendar(26).isEkadashi).toBe(true);
  });
  it('flags an ordinary tithi as none of the above', () => {
    expect(classifyTithiForCalendar(3)).toEqual({ isFullMoon: false, isNewMoon: false, isEkadashi: false });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails** (the function doesn't exist yet)

Run: `cd backend && npm test -- panchang-month-classify`
Expected: FAIL — `classifyTithiForCalendar is not a function` (or import error).

- [ ] **Step 3: Implement `classifyTithiForCalendar` and `getPanchangMonth`**

In `src/modules/astro/astro.service.ts`, add after the `getPanchang` function (before `PanchangWarmupResult`):
```ts
/**
 * Full moon = tithi 15 (end of Shukla Paksha), new moon = tithi 30 (end of
 * Krishna Paksha), Ekadashi = the 11th tithi of either paksha (11 or 26) —
 * see calculateTithi's 1-30 numbering in lib/astro-engine/panchang/tithi.ts.
 */
export function classifyTithiForCalendar(
  tithiNumber: number,
): { isFullMoon: boolean; isNewMoon: boolean; isEkadashi: boolean } {
  return {
    isFullMoon: tithiNumber === 15,
    isNewMoon: tithiNumber === 30,
    isEkadashi: tithiNumber === 11 || tithiNumber === 26,
  };
}

export interface PanchangMonthDay {
  day: number;
  isoDate: string;
  tithiName: string;
  tithiNumber: number;
  paksha: string;
  nakshatraName: string;
  vara: string;
  isFullMoon: boolean;
  isNewMoon: boolean;
  isEkadashi: boolean;
}

/**
 * Lightweight per-day summaries for a calendar month view. Reuses getPanchang
 * per day (which already caches per reference point), fetched in parallel —
 * no separate month-cache table needed. A non-reference lat/lon (e.g. an
 * exact GPS fix) recomputes fresh for every day; acceptable for a
 * once-per-navigation calendar view, not a hot path.
 */
export async function getPanchangMonth(
  year: number,
  month: number,
  lat: number,
  lon: number,
): Promise<PanchangMonthDay[]> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return Promise.all(
    dayNumbers.map(async (day) => {
      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const panchang = await getPanchang(lat, lon, isoDate);
      const { isFullMoon, isNewMoon, isEkadashi } = classifyTithiForCalendar(panchang.tithi.number);
      return {
        day,
        isoDate,
        tithiName: panchang.tithi.name,
        tithiNumber: panchang.tithi.number,
        paksha: panchang.tithi.paksha,
        nakshatraName: panchang.nakshatra.name,
        vara: panchang.vara ?? '',
        isFullMoon,
        isNewMoon,
        isEkadashi,
      };
    }),
  );
}
```

- [ ] **Step 4: Run the classify test again — confirm it passes**

Run: `cd backend && npm test -- panchang-month-classify`
Expected: PASS (all 4 assertions).

- [ ] **Step 5: Add the route**

In `src/modules/astro/astro.routes.ts`, add right after the `panchangRoute`/`astroRouter.openapi(panchangRoute, ...)` block (before the chat route section):
```ts
/* -------------------------------------------------------------------------- */
/* GET /panchang/month                                                   */
/* -------------------------------------------------------------------------- */

const PanchangMonthQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number)
    .openapi({ param: { name: 'year', in: 'query' }, example: '2026' }),
  month: z
    .string()
    .regex(/^(1[0-2]|[1-9])$/)
    .transform(Number)
    .openapi({ param: { name: 'month', in: 'query' }, example: '7', description: '1-12' }),
  lat: z
    .string()
    .optional()
    .default('28.6139')
    .transform(Number)
    .pipe(z.number().min(-90).max(90))
    .openapi({ param: { name: 'lat', in: 'query' } }),
  lon: z
    .string()
    .optional()
    .default('77.209')
    .transform(Number)
    .pipe(z.number().min(-180).max(180))
    .openapi({ param: { name: 'lon', in: 'query' } }),
});

const panchangMonthRoute = createRoute({
  method: 'get',
  path: '/panchang/month',
  tags: ['Astro'],
  summary: 'Get lightweight per-day panchang summaries for a calendar month (public)',
  request: { query: PanchangMonthQuerySchema },
  responses: {
    200: {
      description: 'Per-day panchang summaries',
      content: {
        'application/json': {
          schema: z.object({ year: z.number(), month: z.number(), days: z.array(z.any()) }),
        },
      },
    },
    422: errorResponse('Validation failed'),
  },
});

astroRouter.openapi(panchangMonthRoute, async (c) => {
  const { year, month, lat, lon } = c.req.valid('query');
  const days = await astroService.getPanchangMonth(year, month, lat, lon);
  return c.json({ year, month, days }, 200);
});
```

- [ ] **Step 6: Manual smoke test**

Run: `cd backend && npm run dev` (in one terminal), then in another:
```bash
curl "http://localhost:3000/v1/panchang/month?year=2026&month=7"
```
Expected: JSON with `"days"` array of 31 entries, each with `day`, `isoDate`, `tithiName`, `paksha`, `nakshatraName`, `vara`, `isFullMoon`/`isNewMoon`/`isEkadashi` booleans.

- [ ] **Step 7: Commit**

```bash
git add src/modules/astro/astro.service.ts src/modules/astro/astro.routes.ts test/panchang-month-classify.test.ts
git commit -m "feat(panchang): add GET /panchang/month for calendar views"
```

---

### Task 3: `purchase_plans` table

**Files:**
- Modify: `src/db/schema.ts`
- Generate: `src/db/migrations/000N_*.sql` (via drizzle-kit, not hand-written)

- [ ] **Step 1: Add the enums and table**

In `src/db/schema.ts`, add this block after the `panchang_cache` section at the end of the file:
```ts
/* -------------------------------------------------------------------------- */
/* purchase_plans — Vedic timing analysis for major purchases                  */
/* -------------------------------------------------------------------------- */

export const purchasePlanCategoryEnum = pgEnum('purchase_plan_category', [
  'vehicle',
  'home',
  'commercial',
  'other',
]);

export const purchasePlanStatusEnum = pgEnum('purchase_plan_status', [
  'pending',
  'processing',
  'done',
  'error',
]);

export const purchasePlans = pgTable(
  'purchase_plans',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chartId: uuid('chart_id').references(() => kundlis.id, { onDelete: 'set null' }),
    category: purchasePlanCategoryEnum('category').notNull(),
    metadata: jsonb('metadata').notNull().default({}).$type<Record<string, string>>(),
    costBracket: text('cost_bracket'),
    bookingDate: date('booking_date'),
    deliveryDate: date('delivery_date'),
    resolvedBookingDate: date('resolved_booking_date').notNull(),
    resolvedDeliveryDate: date('resolved_delivery_date').notNull(),
    panchangDate: date('panchang_date').notNull(),
    language: text('language').notNull().default('en'),
    status: purchasePlanStatusEnum('status').notNull().default('pending'),
    analysis: jsonb('analysis').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    userCreatedIdx: index('purchase_plans_user_created_idx').on(table.userId, table.createdAt),
    statusIdx: index('purchase_plans_status_idx').on(table.status),
  }),
);

export type PurchasePlanRow = typeof purchasePlans.$inferSelect;
export type NewPurchasePlanRow = typeof purchasePlans.$inferInsert;
```

Note: if `drizzle-kit generate` (next step) errors on `.default({})` for the jsonb column, change it to `.default(sql\`'{}'::jsonb\`)` instead — both are valid drizzle patterns, this file uses the plain-object form first since it's simpler.

- [ ] **Step 2: Generate the migration**

Run: `cd backend && npm run db:generate`
Expected: a new file appears under `src/db/migrations/000N_<name>.sql` containing `CREATE TYPE "purchase_plan_category"...`, `CREATE TYPE "purchase_plan_status"...`, and `CREATE TABLE "purchase_plans"...` with the two indexes and the FK constraints to `users` and `kundlis`. This command only diffs `schema.ts` against the migration history on disk — it does not touch any live database, so it's safe to run regardless of what `DATABASE_URL` points to.

- [ ] **Step 3: Verify the generated SQL**

Read the new migration file and confirm it has: `CREATE TYPE "public"."purchase_plan_category" AS ENUM('vehicle', 'home', 'commercial', 'other')`, `CREATE TYPE "public"."purchase_plan_status" AS ENUM('pending', 'processing', 'done', 'error')`, the `purchase_plans` table with all 15 columns, and 2 `CREATE INDEX` statements. If the jsonb default caused an error in Step 2, fix `schema.ts` per the note above and regenerate (delete the bad migration file first).

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations/
git commit -m "feat(purchase-plan): add purchase_plans table"
```

(This migration is applied to the live database later, during the EC2 deploy step — see Task 9.)

---

### Task 4: LLM profile + prompt builder (pure, unit-tested)

**Files:**
- Modify: `src/config/llm.ts` (new profile)
- Modify: `src/lib/llm/nim-client.ts` (add optional `timeoutMs`)
- Create: `src/lib/llm/purchase-plan.ts`
- Test: `test/purchase-plan-prompt.test.ts`

- [ ] **Step 1: Add `PURCHASE_PLAN_PROFILE`**

In `src/config/llm.ts`, add after `HOROSCOPE_YEARLY_PROFILE`:
```ts
/**
 * Purchase-timing analysis ("Planning to Buy") — a single large structured
 * JSON verdict (booking + delivery date breakdowns, birth-chart insights,
 * remedies), generated once per request in a fire-and-forget background
 * task, never in a blocking request path — so a larger token ceiling than
 * any other profile is fine here.
 */
export const PURCHASE_PLAN_PROFILE: GenerationProfile = {
  name: 'purchase-plan',
  modelTier: 'structured',
  temperature: 0.3,
  jsonMode: true,
  stream: false,
  maxTokens: 4096,
};
```

- [ ] **Step 2: Add optional per-call timeout to nim-client**

In `src/lib/llm/nim-client.ts`, find the `NIMRequestOptions` interface and add one field:
```ts
interface NIMRequestOptions {
  profile: GenerationProfile;
  messages: ChatMessage[];
  /** Override the model for this request. */
  model?: string;
  /** Caller cancellation (e.g. client disconnect on an SSE stream). */
  signal?: AbortSignal | undefined;
  /** Override GENERATE_TIMEOUT_MS for this call (e.g. a large background job). */
  timeoutMs?: number;
}
```
Then in `generate()`, change the line `const abort = makeAbort(opts.signal, GENERATE_TIMEOUT_MS);` to:
```ts
    const abort = makeAbort(opts.signal, opts.timeoutMs ?? GENERATE_TIMEOUT_MS);
```

- [ ] **Step 3: Write the prompt-builder test first**

Create `test/purchase-plan-prompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPurchasePlanPrompt, parsePurchasePlanResponse } from '../src/lib/llm/purchase-plan';
import type { PanchangData } from '@aroha-astrology/shared';

const SAMPLE_PANCHANG: PanchangData = {
  tithi: { number: 5, name: 'Panchami', paksha: 'Shukla', deity: 'Naga', isAuspicious: true },
  nakshatra: { index: 3, name: 'Rohini', lord: 'Moon', pada: 1, deity: 'Brahma' },
  yoga: { index: 1, name: 'Priti', isAuspicious: true },
  karana: { index: 1, name: 'Bava', isFixed: false },
  vara: 'Shanivaar',
  rahuKaal: { start: '09:00', end: '10:30' },
  gulikaKaal: { start: '06:00', end: '07:30' },
  yamagandaKaal: { start: '13:30', end: '15:00' },
  abhijitMuhurta: { start: '11:50', end: '12:38' },
  sunriseTime: '06:00',
  sunsetTime: '18:30',
};

describe('buildPurchasePlanPrompt', () => {
  it('includes both dates, the category, and the JSON schema instruction', () => {
    const prompt = buildPurchasePlanPrompt({
      category: 'vehicle',
      metadata: { vehicleType: 'Car' },
      resolvedBookingDate: '2026-08-01',
      resolvedDeliveryDate: '2026-08-06',
      bookingDateProvided: true,
      deliveryDateProvided: false,
      bookingPanchang: SAMPLE_PANCHANG,
      deliveryPanchang: SAMPLE_PANCHANG,
      chartContext: 'Ascendant: Leo',
      language: 'en',
    });
    expect(prompt).toContain('2026-08-01');
    expect(prompt).toContain('2026-08-06');
    expect(prompt).toContain('Vehicle');
    expect(prompt).toContain('vehicleType: Car');
    expect(prompt).toContain('Ascendant: Leo');
    expect(prompt).toContain('"overallScore"');
    expect(prompt).toContain('Output ONLY a single JSON object');
  });
});

describe('parsePurchasePlanResponse', () => {
  it('parses clean JSON', () => {
    const result = parsePurchasePlanResponse('{"overallScore": 80}');
    expect(result.parseError).toBe(false);
    expect(result.analysis.overallScore).toBe(80);
  });

  it('strips markdown code fences before parsing', () => {
    const result = parsePurchasePlanResponse('```json\n{"overallScore": 80}\n```');
    expect(result.parseError).toBe(false);
    expect(result.analysis.overallScore).toBe(80);
  });

  it('falls back to a raw/parseError shape on malformed JSON', () => {
    const result = parsePurchasePlanResponse('not json at all');
    expect(result.parseError).toBe(true);
    expect(result.analysis).toHaveProperty('raw', 'not json at all');
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `cd backend && npm test -- purchase-plan-prompt`
Expected: FAIL — module `../src/lib/llm/purchase-plan` doesn't exist.

- [ ] **Step 5: Implement `src/lib/llm/purchase-plan.ts`**

```ts
import { generate } from './nim-client.js';
import { PURCHASE_PLAN_PROFILE } from '../../config/llm.js';
import type { PanchangData } from '@aroha-astrology/shared';

export interface PurchasePlanInput {
  category: 'vehicle' | 'home' | 'commercial' | 'other';
  metadata: Record<string, string>;
  costBracket?: string | undefined;
  resolvedBookingDate: string;
  resolvedDeliveryDate: string;
  bookingDateProvided: boolean;
  deliveryDateProvided: boolean;
  bookingPanchang: PanchangData;
  deliveryPanchang: PanchangData;
  chartContext: string;
  language: string;
}

const CATEGORY_LABELS: Record<PurchasePlanInput['category'], string> = {
  vehicle: 'Vehicle',
  home: 'Home',
  commercial: 'Commercial property',
  other: 'Purchase',
};

function formatPanchangBlock(label: string, date: string, p: PanchangData): string {
  return [
    `${label} (${date}):`,
    `- Tithi: ${p.tithi.name} (${p.tithi.paksha} Paksha)`,
    `- Nakshatra: ${p.nakshatra.name}`,
    `- Yoga: ${p.yoga.name}`,
    `- Karana: ${p.karana.name}`,
    `- Vara: ${p.vara}`,
    `- Rahu Kaal: ${p.rahuKaal.start}-${p.rahuKaal.end}`,
    `- Gulika Kaal: ${p.gulikaKaal.start}-${p.gulikaKaal.end}`,
    `- Yamaganda Kaal: ${p.yamagandaKaal.start}-${p.yamagandaKaal.end}`,
    `- Abhijit Muhurta: ${p.abhijitMuhurta.start}-${p.abhijitMuhurta.end}`,
    `- Sunrise/Sunset: ${p.sunriseTime} / ${p.sunsetTime}`,
  ].join('\n');
}

export function buildPurchasePlanPrompt(input: PurchasePlanInput): string {
  const categoryLabel = CATEGORY_LABELS[input.category];
  const metadataLines =
    Object.entries(input.metadata)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n') || '- (no additional details provided)';

  return `You are a Vedic astrology expert analyzing the timing of a major purchase.

PURCHASE DETAILS:
- Category: ${categoryLabel}
${metadataLines}
${input.costBracket ? `- Budget: ${input.costBracket}` : ''}

DATES TO ANALYZE:
- Booking date: ${input.resolvedBookingDate} (${input.bookingDateProvided ? 'provided by user' : 'auto-calculated'})
- Delivery/possession date: ${input.resolvedDeliveryDate} (${input.deliveryDateProvided ? 'provided by user' : 'auto-calculated'})

${formatPanchangBlock('BOOKING DATE PANCHANG', input.resolvedBookingDate, input.bookingPanchang)}

${formatPanchangBlock('DELIVERY DATE PANCHANG', input.resolvedDeliveryDate, input.deliveryPanchang)}

BIRTH CHART CONTEXT:
${input.chartContext}

ANALYSIS INSTRUCTIONS:
Evaluate both dates for auspiciousness considering: tithi suitability for new acquisitions, nakshatra quality, yoga/karana favorability, whether the date falls in Rahu Kaal/Yamaganda/an inauspicious window, and how the person's current dasha and chart placements (2nd house = wealth, 4th house = property/vehicles, 11th house = gains) interact with the timing. Recommend specific auspicious time windows within each day where possible (e.g. Abhijit Muhurta).

Respond in language: ${input.language}.

Output ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "summary": ["<hook line>", "<nuance line>", "<action line>"],
  "overallScore": <integer 1-100>,
  "overallVerdict": "<one sentence>",
  "tldr": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "bookingDate": {
    "date": "${input.resolvedBookingDate}",
    "provided": ${input.bookingDateProvided},
    "score": <integer 1-100>,
    "verdict": "<one sentence>",
    "highlights": ["<string>"],
    "warnings": ["<string>"],
    "bestTimeWindows": ["<string>"],
    "avoidTimes": ["<string>"]
  },
  "deliveryDate": {
    "date": "${input.resolvedDeliveryDate}",
    "provided": ${input.deliveryDateProvided},
    "score": <integer 1-100>,
    "verdict": "<one sentence>",
    "highlights": ["<string>"],
    "warnings": ["<string>"],
    "bestTimeWindows": ["<string>"],
    "avoidTimes": ["<string>"]
  },
  "birthChartInsights": {
    "currentDasha": "<string>",
    "dashaVerdict": "<one sentence>",
    "favorablePlanets": ["<string>"],
    "challengingFactors": ["<string>"],
    "keyHouses": "<one sentence about houses 2/4/11>"
  },
  "remedies": ["<string>"],
  "luckyColor": "<string>",
  "luckyDirection": "<string>",
  "finalAdvice": "<2-3 sentences>"
}`;
}

/** Never throws on malformed LLM JSON — callers persist the fallback shape instead of failing the row. */
export function parsePurchasePlanResponse(raw: string): { analysis: Record<string, unknown>; parseError: boolean } {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '');
  try {
    return { analysis: JSON.parse(cleaned) as Record<string, unknown>, parseError: false };
  } catch {
    return { analysis: { raw: cleaned, parseError: true }, parseError: true };
  }
}

export async function generatePurchasePlanAnalysis(
  input: PurchasePlanInput,
): Promise<{ analysis: Record<string, unknown>; parseError: boolean }> {
  const prompt = buildPurchasePlanPrompt(input);
  const raw = await generate({
    profile: PURCHASE_PLAN_PROFILE,
    messages: [{ role: 'user', content: prompt }],
    timeoutMs: 180_000,
  });
  return parsePurchasePlanResponse(raw);
}
```

- [ ] **Step 6: Run the tests again — confirm they pass**

Run: `cd backend && npm test -- purchase-plan-prompt`
Expected: PASS (4 assertions across the two describe blocks).

- [ ] **Step 7: Commit**

```bash
git add src/config/llm.ts src/lib/llm/nim-client.ts src/lib/llm/purchase-plan.ts test/purchase-plan-prompt.test.ts
git commit -m "feat(purchase-plan): add LLM prompt builder and generation profile"
```

---

### Task 5: Purchase-plan module — dates helper (unit-tested), repo, service, routes

**Files:**
- Create: `src/modules/purchase-plan/purchase-plan.dates.ts`
- Create: `src/modules/purchase-plan/purchase-plan.schemas.ts`
- Create: `src/modules/purchase-plan/purchase-plan.repo.ts`
- Create: `src/modules/purchase-plan/purchase-plan.service.ts`
- Create: `src/modules/purchase-plan/purchase-plan.routes.ts`
- Modify: `src/app.ts` (mount the router)
- Test: `test/purchase-plan-resolve-dates.test.ts`

- [ ] **Step 1: Write the failing test for `resolveDates`**

Create `test/purchase-plan-resolve-dates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveDates, addDays, todayIso } from '../src/modules/purchase-plan/purchase-plan.dates';

describe('resolveDates', () => {
  it('returns both dates unchanged when both are given', () => {
    expect(resolveDates('2026-08-01', '2026-08-10')).toEqual({
      resolvedBookingDate: '2026-08-01',
      resolvedDeliveryDate: '2026-08-10',
    });
  });

  it('adds 5 days for delivery when only booking is given', () => {
    expect(resolveDates('2026-08-01', undefined)).toEqual({
      resolvedBookingDate: '2026-08-01',
      resolvedDeliveryDate: '2026-08-06',
    });
  });

  it('subtracts 5 days for booking when only delivery is given, clamped to yesterday', () => {
    // Delivery far in the future: proposed booking (delivery - 5d) is later
    // than yesterday, so it must clamp to yesterday.
    const farFuture = addDays(todayIso(), 30);
    const result = resolveDates(undefined, farFuture);
    expect(result.resolvedBookingDate).toBe(addDays(todayIso(), -1));
    expect(result.resolvedDeliveryDate).toBe(farFuture);
  });

  it('throws when neither date is given', () => {
    expect(() => resolveDates(undefined, undefined)).toThrow();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npm test -- purchase-plan-resolve-dates`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement the pure dates module**

Create `src/modules/purchase-plan/purchase-plan.dates.ts`:
```ts
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Resolve booking/delivery dates when only one is provided by the user.
 * - Both given: used as-is.
 * - Booking only: delivery = booking + 5 days.
 * - Delivery only: booking = delivery - 5 days, but never later than
 *   yesterday (a lone future delivery date shouldn't imply a future booking).
 * - Neither: throws — callers must validate at least one is present first.
 */
export function resolveDates(
  bookingDate: string | undefined,
  deliveryDate: string | undefined,
): { resolvedBookingDate: string; resolvedDeliveryDate: string } {
  if (!bookingDate && !deliveryDate) {
    throw new Error('At least one of bookingDate or deliveryDate is required');
  }
  if (bookingDate && deliveryDate) {
    return { resolvedBookingDate: bookingDate, resolvedDeliveryDate: deliveryDate };
  }
  if (bookingDate) {
    return { resolvedBookingDate: bookingDate, resolvedDeliveryDate: addDays(bookingDate, 5) };
  }
  const proposedBooking = addDays(deliveryDate as string, -5);
  const yesterday = addDays(todayIso(), -1);
  const resolvedBookingDate = proposedBooking < yesterday ? proposedBooking : yesterday;
  return { resolvedBookingDate, resolvedDeliveryDate: deliveryDate as string };
}
```

- [ ] **Step 4: Run the test again — confirm it passes**

Run: `cd backend && npm test -- purchase-plan-resolve-dates`
Expected: PASS (4 assertions).

- [ ] **Step 5: Create the Zod schemas**

Create `src/modules/purchase-plan/purchase-plan.schemas.ts`:
```ts
import { z } from '@hono/zod-openapi';

export const PurchasePlanCategorySchema = z.enum(['vehicle', 'home', 'commercial', 'other']);

export const AnalyzePurchasePlanBodySchema = z
  .object({
    category: PurchasePlanCategorySchema,
    metadata: z.record(z.string(), z.string()).optional().default({}),
    costBracket: z.string().optional(),
    bookingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    deliveryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    panchangDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    language: z.string().optional().default('en'),
  })
  .refine((body) => body.bookingDate || body.deliveryDate, {
    message: 'At least one of bookingDate or deliveryDate is required',
  })
  .openapi('AnalyzePurchasePlanBody');

export type AnalyzePurchasePlanBody = z.infer<typeof AnalyzePurchasePlanBodySchema>;

export const PurchasePlanSchema = z
  .object({
    id: z.string(),
    category: PurchasePlanCategorySchema,
    metadata: z.record(z.string(), z.string()),
    costBracket: z.string().nullable(),
    resolvedBookingDate: z.string(),
    resolvedDeliveryDate: z.string(),
    status: z.enum(['pending', 'processing', 'done', 'error']),
    analysis: z.record(z.string(), z.unknown()).nullable(),
    errorMessage: z.string().nullable(),
    createdAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .openapi('PurchasePlan');

export type PurchasePlanDto = z.infer<typeof PurchasePlanSchema>;

export const PlanIdParamSchema = z.object({
  id: z.string().uuid().openapi({ param: { name: 'id', in: 'path' } }),
});
```

- [ ] **Step 6: Create the repo**

Create `src/modules/purchase-plan/purchase-plan.repo.ts`:
```ts
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { purchasePlans, type NewPurchasePlanRow, type PurchasePlanRow } from '../../db/schema.js';

export async function insertPendingPlan(row: NewPurchasePlanRow): Promise<PurchasePlanRow> {
  const [inserted] = await db.insert(purchasePlans).values(row).returning();
  if (!inserted) throw new Error('Failed to insert purchase plan');
  return inserted;
}

export async function listPlansForUser(userId: string, limit = 10): Promise<PurchasePlanRow[]> {
  return db
    .select()
    .from(purchasePlans)
    .where(eq(purchasePlans.userId, userId))
    .orderBy(desc(purchasePlans.createdAt))
    .limit(limit);
}

export async function findPlanForUser(id: string, userId: string): Promise<PurchasePlanRow | undefined> {
  const rows = await db
    .select()
    .from(purchasePlans)
    .where(and(eq(purchasePlans.id, id), eq(purchasePlans.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function countRecentPlansForUser(userId: string, sinceHoursAgo: number): Promise<number> {
  const since = new Date(Date.now() - sinceHoursAgo * 60 * 60 * 1000);
  const rows = await db
    .select({ id: purchasePlans.id })
    .from(purchasePlans)
    .where(and(eq(purchasePlans.userId, userId), gte(purchasePlans.createdAt, since)));
  return rows.length;
}

export async function markProcessing(id: string): Promise<void> {
  await db.update(purchasePlans).set({ status: 'processing' }).where(eq(purchasePlans.id, id));
}

export async function markDone(id: string, analysis: Record<string, unknown>): Promise<void> {
  await db
    .update(purchasePlans)
    .set({ status: 'done', analysis, completedAt: new Date() })
    .where(eq(purchasePlans.id, id));
}

export async function markError(id: string, errorMessage: string): Promise<void> {
  await db
    .update(purchasePlans)
    .set({ status: 'error', errorMessage, completedAt: new Date() })
    .where(eq(purchasePlans.id, id));
}
```

- [ ] **Step 7: Create the service**

Create `src/modules/purchase-plan/purchase-plan.service.ts`:
```ts
import { logger } from '../../lib/logger.js';
import { Errors } from '../../lib/errors.js';
import { findKundliByUserId } from '../kundli/kundli.repo.js';
import { getPanchang } from '../astro/astro.service.js';
import { generatePurchasePlanAnalysis } from '../../lib/llm/purchase-plan.js';
import { resolveDates, todayIso } from './purchase-plan.dates.js';
import {
  insertPendingPlan,
  listPlansForUser,
  findPlanForUser,
  countRecentPlansForUser,
  markProcessing,
  markDone,
  markError,
} from './purchase-plan.repo.js';
import type { PurchasePlanRow } from '../../db/schema.js';
import type { AnalyzePurchasePlanBody, PurchasePlanDto } from './purchase-plan.schemas.js';

const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;
const DAILY_PLAN_LIMIT = 3;

/** Best-effort extraction from the loosely-typed kundli jsonb blobs — falls back to a generic line if fields are absent. */
function buildChartContext(kundli: Awaited<ReturnType<typeof findKundliByUserId>>): string {
  if (!kundli || kundli.status !== 'ready') {
    return 'No birth chart is available for this user yet — analyze based on panchang timing alone.';
  }
  const dasha = kundli.dashaData as {
    currentMahadasha?: { lord?: string };
    currentAntardasha?: { lord?: string };
  } | null;
  const chart = kundli.chartData as {
    ascendant?: { sign?: string };
    planets?: Array<{ planet: string; sign: string; house?: number }>;
  } | null;

  const lines: string[] = [];
  if (chart?.ascendant?.sign) lines.push(`Ascendant: ${chart.ascendant.sign}`);
  if (dasha?.currentMahadasha?.lord) lines.push(`Current Mahadasha: ${dasha.currentMahadasha.lord}`);
  if (dasha?.currentAntardasha?.lord) lines.push(`Current Antardasha: ${dasha.currentAntardasha.lord}`);
  if (chart?.planets?.length) {
    lines.push(
      'Planet placements: ' +
        chart.planets.map((p) => `${p.planet} in ${p.sign}${p.house ? ` (house ${p.house})` : ''}`).join(', '),
    );
  }
  return lines.length > 0 ? lines.join('\n') : 'No birth chart is available for this user yet — analyze based on panchang timing alone.';
}

export async function requestPurchasePlanAnalysis(
  userId: string,
  body: AnalyzePurchasePlanBody,
): Promise<{ planId: string }> {
  const recentCount = await countRecentPlansForUser(userId, 24);
  if (recentCount >= DAILY_PLAN_LIMIT) {
    throw Errors.tooManyRequests(
      `You've reached today's limit of ${DAILY_PLAN_LIMIT} purchase-timing analyses. Try again tomorrow.`,
    );
  }

  const { resolvedBookingDate, resolvedDeliveryDate } = resolveDates(body.bookingDate, body.deliveryDate);
  const kundli = await findKundliByUserId(userId);

  const row = await insertPendingPlan({
    userId,
    chartId: kundli?.id ?? null,
    category: body.category,
    metadata: body.metadata,
    costBracket: body.costBracket ?? null,
    bookingDate: body.bookingDate ?? null,
    deliveryDate: body.deliveryDate ?? null,
    resolvedBookingDate,
    resolvedDeliveryDate,
    panchangDate: body.panchangDate ?? todayIso(),
    language: body.language,
    status: 'pending',
  });

  // Fire-and-forget: the app runs single-instance under pm2 (-i 1), so an
  // in-process background task survives until it finishes without needing a
  // separate job queue — see docs/superpowers/specs/2026-07-04-panchang-parity-design.md.
  void processAnalysis(row.id, {
    category: body.category,
    metadata: body.metadata,
    costBracket: body.costBracket,
    resolvedBookingDate,
    resolvedDeliveryDate,
    bookingDateProvided: !!body.bookingDate,
    deliveryDateProvided: !!body.deliveryDate,
    language: body.language,
    chartContext: buildChartContext(kundli),
  }).catch((err) => {
    logger.error({ err, planId: row.id }, 'purchase plan background processing failed');
  });

  return { planId: row.id };
}

async function processAnalysis(
  planId: string,
  input: {
    category: 'vehicle' | 'home' | 'commercial' | 'other';
    metadata: Record<string, string>;
    costBracket?: string | undefined;
    resolvedBookingDate: string;
    resolvedDeliveryDate: string;
    bookingDateProvided: boolean;
    deliveryDateProvided: boolean;
    language: string;
    chartContext: string;
  },
): Promise<void> {
  await markProcessing(planId);
  try {
    const [bookingPanchang, deliveryPanchang] = await Promise.all([
      getPanchang(REFERENCE_LAT, REFERENCE_LON, input.resolvedBookingDate),
      getPanchang(REFERENCE_LAT, REFERENCE_LON, input.resolvedDeliveryDate),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { analysis } = await generatePurchasePlanAnalysis({ ...input, bookingPanchang: bookingPanchang as any, deliveryPanchang: deliveryPanchang as any });
    await markDone(planId, analysis);
  } catch (err) {
    logger.error({ err, planId }, 'purchase plan LLM analysis failed');
    await markError(planId, err instanceof Error ? err.message : 'Unknown error');
  }
}

export function toPurchasePlanDto(row: PurchasePlanRow): PurchasePlanDto {
  return {
    id: row.id,
    category: row.category,
    metadata: row.metadata,
    costBracket: row.costBracket,
    resolvedBookingDate: row.resolvedBookingDate,
    resolvedDeliveryDate: row.resolvedDeliveryDate,
    status: row.status,
    analysis: row.analysis,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export async function getPlansForUser(userId: string): Promise<PurchasePlanDto[]> {
  const rows = await listPlansForUser(userId);
  return rows.map(toPurchasePlanDto);
}

export async function getPlanForUser(id: string, userId: string): Promise<PurchasePlanDto> {
  const row = await findPlanForUser(id, userId);
  if (!row) throw Errors.notFound('Purchase plan not found');
  return toPurchasePlanDto(row);
}
```

- [ ] **Step 8: Create the routes**

Create `src/modules/purchase-plan/purchase-plan.routes.ts`:
```ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { requireUser } from '../../middleware/auth.js';
import { requireConsent } from '../../middleware/consent.js';
import { rateLimiter } from '../../middleware/rate-limit.js';
import { AnalyzePurchasePlanBodySchema, PurchasePlanSchema, PlanIdParamSchema } from './purchase-plan.schemas.js';
import { requestPurchasePlanAnalysis, getPlansForUser, getPlanForUser } from './purchase-plan.service.js';

const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    }),
  })
  .openapi('PurchasePlanError');

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ErrorSchema } },
});

/** Independent of the general astro LLM rate limit — this is its own expensive call. */
const analyzeRateLimit = rateLimiter({ windowMs: 60_000, max: 5 });

export const purchasePlanRouter = new OpenAPIHono();

purchasePlanRouter.use('*', requireUser);

const analyzeRoute = createRoute({
  method: 'post',
  path: '/purchase-plan/analyze',
  tags: ['PurchasePlan'],
  summary: 'Request a Vedic timing analysis for a major purchase',
  security: [{ bearerAuth: [] }],
  middleware: [analyzeRateLimit, requireConsent] as const,
  request: {
    body: { required: true, content: { 'application/json': { schema: AnalyzePurchasePlanBodySchema } } },
  },
  responses: {
    200: {
      description: 'Analysis accepted — poll GET /purchase-plan/{id} for the result',
      content: { 'application/json': { schema: z.object({ planId: z.string() }) } },
    },
    401: errorResponse('Unauthorized'),
    403: errorResponse('Consent required'),
    422: errorResponse('Validation failed'),
    429: errorResponse('Daily analysis limit reached'),
  },
});

purchasePlanRouter.openapi(analyzeRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const result = await requestPurchasePlanAnalysis(user.id, body);
  return c.json(result, 200);
});

const listRoute = createRoute({
  method: 'get',
  path: '/purchase-plan',
  tags: ['PurchasePlan'],
  summary: "List the current user's recent purchase-plan analyses",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Recent plans',
      content: { 'application/json': { schema: z.object({ plans: z.array(PurchasePlanSchema) }) } },
    },
    401: errorResponse('Unauthorized'),
  },
});

purchasePlanRouter.openapi(listRoute, async (c) => {
  const user = c.get('user');
  const plans = await getPlansForUser(user.id);
  return c.json({ plans }, 200);
});

const getOneRoute = createRoute({
  method: 'get',
  path: '/purchase-plan/{id}',
  tags: ['PurchasePlan'],
  summary: 'Get a single purchase-plan analysis (poll target)',
  security: [{ bearerAuth: [] }],
  request: { params: PlanIdParamSchema },
  responses: {
    200: { description: 'The plan', content: { 'application/json': { schema: PurchasePlanSchema } } },
    401: errorResponse('Unauthorized'),
    404: errorResponse('Not found'),
  },
});

purchasePlanRouter.openapi(getOneRoute, async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const plan = await getPlanForUser(id, user.id);
  return c.json(plan, 200);
});
```

- [ ] **Step 9: Mount the router**

In `src/app.ts`, add the import alongside the other module imports:
```ts
import { purchasePlanRouter } from './modules/purchase-plan/purchase-plan.routes.js';
```
And add the route registration next to the other `/v1` mounts:
```ts
  app.route('/v1', horoscopeRouter);
  app.route('/v1', purchasePlanRouter);
```

- [ ] **Step 10: Typecheck the whole backend**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. Fix any type mismatches (most likely spot: `NewPurchasePlanRow` field types vs. what's passed in `insertPendingPlan`).

- [ ] **Step 11: Commit**

```bash
git add src/modules/purchase-plan/ src/app.ts
git commit -m "feat(purchase-plan): add analyze/list/get routes"
```

---

### Task 6: Backend verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd backend && npm test`
Expected: all tests pass, including the 4 new files added in Tasks 1, 2, 4, 5.

- [ ] **Step 2: Full typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual end-to-end smoke test against a local dev server**

Run: `cd backend && npm run dev`, then in another terminal (replace `<TOKEN>` with a real Firebase ID token for a test user — same as any other authed endpoint on this API):
```bash
curl "http://localhost:3000/v1/panchang?date=2026-07-04" | head -c 2000
curl "http://localhost:3000/v1/panchang/month?year=2026&month=7"
curl -X POST "http://localhost:3000/v1/purchase-plan/analyze" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"category":"vehicle","metadata":{"vehicleType":"Car"},"bookingDate":"2026-08-01"}'
# then, using the returned planId:
curl "http://localhost:3000/v1/purchase-plan/<planId>" -H "Authorization: Bearer <TOKEN>"
```
Expected: `/panchang` now includes `choghadiya` (day/night, 8 each) and `hora` (24 entries); `/panchang/month` returns 31 day summaries; `/purchase-plan/analyze` returns a `planId`; polling `/purchase-plan/<planId>` shows `status: "pending"` → `"processing"` → `"done"` (or `"error"` if NIM is unreachable in this environment — check backend logs) within roughly 30-90 seconds, with a populated `analysis` object once done.

---

## Frontend Phase (all paths relative to repo root)

### Task 7: `lib/api.ts` extensions

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Extend `PanchangData` and add supporting types**

In `lib/api.ts`, right before `export interface PanchangData {`, add:
```ts
export interface ChoghadiyaSlot {
  name: string;
  type: "good" | "bad" | "neutral";
  startTime: string;
  endTime: string;
}

export interface HoraSlot {
  planet: string;
  startTime: string;
  endTime: string;
  isAuspicious: boolean;
}
```
Then inside `PanchangData`, add two fields after `regionalMonths?: ...`:
```ts
  regionalMonths?: Record<"north" | "south" | "west" | "east", PanchangRegionalMonth>;
  choghadiya?: { day: ChoghadiyaSlot[]; night: ChoghadiyaSlot[] };
  hora?: HoraSlot[];
}
```

- [ ] **Step 2: Add the month + purchase-plan types**

Add after the `PanchangData` interface:
```ts
// ─── Panchang month calendar ─────────────────────────────────────────────────

export interface PanchangMonthDay {
  day: number;
  isoDate: string;
  tithiName: string;
  tithiNumber: number;
  paksha: string;
  nakshatraName: string;
  vara: string;
  isFullMoon: boolean;
  isNewMoon: boolean;
  isEkadashi: boolean;
}

// ─── Purchase plan ("Planning to Buy") ────────────────────────────────────────

export type PurchasePlanCategory = "vehicle" | "home" | "commercial" | "other";

export interface PurchasePlanDateAnalysis {
  date: string;
  provided: boolean;
  score: number;
  verdict: string;
  highlights: string[];
  warnings: string[];
  bestTimeWindows: string[];
  avoidTimes: string[];
}

export interface PurchasePlanAnalysis {
  summary: string[];
  overallScore: number;
  overallVerdict: string;
  tldr: string[];
  bookingDate: PurchasePlanDateAnalysis;
  deliveryDate: PurchasePlanDateAnalysis;
  birthChartInsights: {
    currentDasha: string;
    dashaVerdict: string;
    favorablePlanets: string[];
    challengingFactors: string[];
    keyHouses: string;
  };
  remedies: string[];
  luckyColor: string;
  luckyDirection: string;
  finalAdvice: string;
}

export interface PurchasePlan {
  id: string;
  category: PurchasePlanCategory;
  metadata: Record<string, string>;
  costBracket: string | null;
  resolvedBookingDate: string;
  resolvedDeliveryDate: string;
  status: "pending" | "processing" | "done" | "error";
  analysis: PurchasePlanAnalysis | { raw: string; parseError: true } | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AnalyzePurchasePlanBody {
  category: PurchasePlanCategory;
  metadata?: Record<string, string>;
  costBracket?: string;
  bookingDate?: string;
  deliveryDate?: string;
  panchangDate?: string;
  language?: string;
}
```

- [ ] **Step 3: Add the API methods**

In the `export const api = { ... }` object, add right after the existing `panchang: (...)` method:
```ts
  /** Lightweight per-day panchang summaries for a calendar month. */
  panchangMonth: (year: number, month: number, lat?: number, lon?: number) => {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (lat != null) params.set("lat", String(lat));
    if (lon != null) params.set("lon", String(lon));
    return request<{ year: number; month: number; days: PanchangMonthDay[] }>(
      `/v1/panchang/month?${params.toString()}`,
      { auth: true },
    );
  },

  /** Request a Vedic timing analysis for a major purchase — returns immediately with a planId to poll. */
  purchasePlanAnalyze: (body: AnalyzePurchasePlanBody) =>
    request<{ planId: string }>("/v1/purchase-plan/analyze", { method: "POST", body, auth: true }),

  /** Recent purchase-plan analyses for the current user. */
  purchasePlanList: () => request<{ plans: PurchasePlan[] }>("/v1/purchase-plan", { auth: true }),

  /** Poll target for a single purchase-plan analysis. */
  purchasePlanGet: (id: string) => request<PurchasePlan>(`/v1/purchase-plan/${id}`, { auth: true }),
```

Note: the existing `panchang: (...)` method builds its path as `` `/v1/panchang${...}` `` — double-check that prefix and match it exactly (some endpoints in this file already include `/v1/` in the path passed to `request()`, since `request()` itself doesn't prepend it).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts
git commit -m "feat(panchang): add choghadiya/hora types, month + purchase-plan API methods"
```

---

### Task 8: Static panchang data files

**Files:**
- Create: `lib/panchang/regions.ts`
- Create: `lib/panchang/hindu-festivals.ts`
- Create: `lib/panchang/adhik-maas-ranges.ts`

- [ ] **Step 1: Create `lib/panchang/regions.ts`**

```ts
export type RegionId = "north" | "south" | "west" | "east";

export const REGION_OPTIONS: { value: RegionId; label: string }[] = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "west", label: "West" },
  { value: "east", label: "East" },
];

export interface RegionMeta {
  id: RegionId;
  label: string;
  calendarName: string; // 'Vikram Samvat', 'Bengali San', ...
  adhikMaasName: string; // localised Adhik Maas / Mol Maas name
}

export const REGION_META: Record<RegionId, RegionMeta> = {
  north: { id: "north", label: "North", calendarName: "Vikram Samvat", adhikMaasName: "Adhik Maas" },
  south: { id: "south", label: "South", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhika Masam" },
  west: { id: "west", label: "West", calendarName: "Shalivahana Shaka", adhikMaasName: "Adhik Maas" },
  east: { id: "east", label: "East", calendarName: "Bengali San", adhikMaasName: "Mol Maas" },
};
```

- [ ] **Step 2: Create `lib/panchang/hindu-festivals.ts`**

Port verbatim from `backend/apps/api/src/app/(app)/panchang/hindu-festivals.ts` (a hand-maintained, purely-data file — no code changes needed beyond the file location):
```ts
// Curated list of major Hindu festivals (Gregorian date keyed).
//
// Hindu festivals are tithi-based, and their Gregorian dates shift each
// year. Computing them from first principles requires lunar-month logic
// that the panchang engine doesn't yet expose, so this is a hand-maintained
// table covering 2025-2027 sourced from drikpanchang.com.
//
// Add years/festivals over time. Keys are local date strings (YYYY-MM-DD)
// using the standard Indian panchang reckoning (IST sunrise rule).

export interface HinduFestival {
  name: string;
  emoji: string;
  importance: "major" | "minor";
}

export const HINDU_FESTIVALS: Record<string, HinduFestival[]> = {
  // -- 2025 --------------------------------------------------------------
  "2025-01-14": [{ name: "Makar Sankranti", emoji: "🪁", importance: "major" }],
  "2025-01-26": [{ name: "Republic Day", emoji: "🇮🇳", importance: "minor" }],
  "2025-02-02": [{ name: "Vasant Panchami", emoji: "📚", importance: "major" }],
  "2025-02-26": [{ name: "Maha Shivaratri", emoji: "🔱", importance: "major" }],
  "2025-03-13": [{ name: "Holika Dahan", emoji: "🔥", importance: "minor" }],
  "2025-03-14": [{ name: "Holi", emoji: "🎨", importance: "major" }],
  "2025-03-30": [{ name: "Chaitra Navratri begins", emoji: "🪔", importance: "major" }],
  "2025-04-06": [{ name: "Rama Navami", emoji: "🏹", importance: "major" }],
  "2025-04-12": [{ name: "Hanuman Jayanti", emoji: "🐒", importance: "major" }],
  "2025-04-30": [{ name: "Akshaya Tritiya", emoji: "✨", importance: "major" }],
  "2025-07-06": [{ name: "Devshayani Ekadashi", emoji: "🕉", importance: "minor" }],
  "2025-07-10": [{ name: "Guru Purnima", emoji: "🌕", importance: "major" }],
  "2025-08-09": [{ name: "Raksha Bandhan", emoji: "🪢", importance: "major" }],
  "2025-08-16": [{ name: "Krishna Janmashtami", emoji: "🦚", importance: "major" }],
  "2025-08-27": [{ name: "Ganesh Chaturthi", emoji: "🐘", importance: "major" }],
  "2025-09-22": [{ name: "Sharad Navratri begins", emoji: "🪔", importance: "major" }],
  "2025-09-30": [{ name: "Durga Ashtami", emoji: "🗡", importance: "major" }],
  "2025-10-02": [{ name: "Vijayadashami (Dussehra)", emoji: "🏹", importance: "major" }],
  "2025-10-10": [{ name: "Karwa Chauth", emoji: "🌙", importance: "major" }],
  "2025-10-18": [{ name: "Dhanteras", emoji: "💰", importance: "major" }],
  "2025-10-20": [{ name: "Diwali (Lakshmi Puja)", emoji: "🪔", importance: "major" }],
  "2025-10-22": [{ name: "Govardhan Puja", emoji: "🐄", importance: "minor" }],
  "2025-10-23": [{ name: "Bhai Dooj", emoji: "👫", importance: "minor" }],
  "2025-10-28": [{ name: "Chhath Puja", emoji: "🌅", importance: "major" }],
  "2025-11-15": [{ name: "Tulsi Vivah", emoji: "🌿", importance: "minor" }],
  "2025-11-25": [{ name: "Utpanna Ekadashi", emoji: "🕉", importance: "minor" }],
  "2025-12-01": [{ name: "Mokshada Ekadashi (Gita Jayanti)", emoji: "📖", importance: "major" }],

  // -- 2026 --------------------------------------------------------------
  "2026-01-14": [{ name: "Makar Sankranti", emoji: "🪁", importance: "major" }],
  "2026-01-23": [{ name: "Vasant Panchami", emoji: "📚", importance: "major" }],
  "2026-01-26": [{ name: "Republic Day", emoji: "🇮🇳", importance: "minor" }],
  "2026-02-15": [{ name: "Maha Shivaratri", emoji: "🔱", importance: "major" }],
  "2026-03-03": [{ name: "Holika Dahan", emoji: "🔥", importance: "minor" }],
  "2026-03-04": [{ name: "Holi", emoji: "🎨", importance: "major" }],
  "2026-03-19": [{ name: "Chaitra Navratri begins", emoji: "🪔", importance: "major" }],
  "2026-03-26": [{ name: "Rama Navami", emoji: "🏹", importance: "major" }],
  "2026-04-01": [{ name: "Hanuman Jayanti", emoji: "🐒", importance: "major" }],
  "2026-04-19": [{ name: "Akshaya Tritiya", emoji: "✨", importance: "major" }],
  "2026-06-25": [{ name: "Devshayani Ekadashi", emoji: "🕉", importance: "minor" }],
  "2026-06-29": [{ name: "Guru Purnima", emoji: "🌕", importance: "major" }],
  "2026-07-29": [{ name: "Raksha Bandhan", emoji: "🪢", importance: "major" }],
  "2026-08-04": [{ name: "Krishna Janmashtami", emoji: "🦚", importance: "major" }],
  "2026-08-15": [{ name: "Independence Day", emoji: "🇮🇳", importance: "minor" }],
  "2026-08-16": [{ name: "Ganesh Chaturthi", emoji: "🐘", importance: "major" }],
  "2026-09-11": [{ name: "Sharad Navratri begins", emoji: "🪔", importance: "major" }],
  "2026-09-19": [{ name: "Durga Ashtami", emoji: "🗡", importance: "major" }],
  "2026-09-21": [{ name: "Vijayadashami (Dussehra)", emoji: "🏹", importance: "major" }],
  "2026-09-29": [{ name: "Karwa Chauth", emoji: "🌙", importance: "major" }],
  "2026-11-06": [{ name: "Dhanteras", emoji: "💰", importance: "major" }],
  "2026-11-08": [{ name: "Diwali (Lakshmi Puja)", emoji: "🪔", importance: "major" }],
  "2026-11-10": [{ name: "Govardhan Puja", emoji: "🐄", importance: "minor" }],
  "2026-11-11": [{ name: "Bhai Dooj", emoji: "👫", importance: "minor" }],
  "2026-11-15": [{ name: "Chhath Puja", emoji: "🌅", importance: "major" }],
  "2026-12-20": [{ name: "Mokshada Ekadashi (Gita Jayanti)", emoji: "📖", importance: "major" }],

  // -- 2027 --------------------------------------------------------------
  "2027-01-14": [{ name: "Makar Sankranti", emoji: "🪁", importance: "major" }],
  "2027-01-26": [{ name: "Republic Day", emoji: "🇮🇳", importance: "minor" }],
  "2027-02-11": [{ name: "Vasant Panchami", emoji: "📚", importance: "major" }],
  "2027-03-06": [{ name: "Maha Shivaratri", emoji: "🔱", importance: "major" }],
  "2027-03-22": [{ name: "Holika Dahan", emoji: "🔥", importance: "minor" }],
  "2027-03-23": [{ name: "Holi", emoji: "🎨", importance: "major" }],
  "2027-04-08": [{ name: "Chaitra Navratri begins", emoji: "🪔", importance: "major" }],
  "2027-04-15": [{ name: "Rama Navami", emoji: "🏹", importance: "major" }],
  "2027-04-21": [{ name: "Hanuman Jayanti", emoji: "🐒", importance: "major" }],
  "2027-05-09": [{ name: "Akshaya Tritiya", emoji: "✨", importance: "major" }],
  "2027-08-18": [{ name: "Raksha Bandhan", emoji: "🪢", importance: "major" }],
  "2027-08-25": [{ name: "Krishna Janmashtami", emoji: "🦚", importance: "major" }],
  "2027-09-04": [{ name: "Ganesh Chaturthi", emoji: "🐘", importance: "major" }],
  "2027-10-08": [{ name: "Vijayadashami (Dussehra)", emoji: "🏹", importance: "major" }],
  "2027-10-27": [{ name: "Diwali (Lakshmi Puja)", emoji: "🪔", importance: "major" }],
};

export function getFestivalsForDate(date: string): HinduFestival[] {
  return HINDU_FESTIVALS[date] ?? [];
}

export function hasMajorFestival(date: string): boolean {
  return (HINDU_FESTIVALS[date] ?? []).some((f) => f.importance === "major");
}
```

- [ ] **Step 3: Create `lib/panchang/adhik-maas-ranges.ts`**

Port verbatim from `backend/apps/api/src/app/(app)/panchang/adhik-maas-ranges.ts`:
```ts
// Adhik Maas (Purushottam Maas / Mol Maas / Mal Maas / Londa Maas) date ranges.
// Verified against Drik Panchang.

export interface AdhikMaasRange {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  monthName: string; // doubled lunar month (e.g., 'Jyeshtha')
  label: string; // human-readable name (e.g., 'Adhik Jyeshtha 2026')
}

export const ADHIK_MAAS_RANGES: AdhikMaasRange[] = [
  { start: "2023-07-18", end: "2023-08-16", monthName: "Shravana", label: "Adhik Shravana 2023" },
  { start: "2026-05-17", end: "2026-06-15", monthName: "Jyeshtha", label: "Adhik Jyeshtha 2026" },
];

export function findAdhikMaas(isoDate: string): AdhikMaasRange | null {
  for (const range of ADHIK_MAAS_RANGES) {
    if (isoDate >= range.start && isoDate <= range.end) return range;
  }
  return null;
}

export function isAdhikMaas(isoDate: string): boolean {
  return findAdhikMaas(isoDate) !== null;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/panchang/
git commit -m "feat(panchang): add regions, festivals, and Adhik Maas static data"
```

---

### Task 9: i18n — add all new strings across all 7 languages

**Files:**
- Modify: `i18n/resources.ts` (7 edits, one per language block)

Each language's `panchang` object currently ends with a `locationHint: "...",` line right before its closing `},`. Insert the new keys right after that line, in each of the 7 blocks. Also add one new **top-level** `purchasePlan` object per language (sibling of `panchang`'s parent `horoscope` key — insert it as a new top-level key in each language object, e.g. right after that language's `horoscope: { ... }` block closes).

- [ ] **Step 1: English (`en`, panchang block ends at line 125)**

Edit the block ending at `i18n/resources.ts:119-125`:
```ts
old_string:
          unavailable: "Panchang data isn't available for this date/location right now.",
          referenceLocation: "Delhi (Reference)",
          yourLocation: "Your Location",
          locating: "Locating...",
          locationDenied: "Location access denied — showing the reference panchang instead.",
          locationHint: "Timings are shown for Delhi by default — tap \"Your Location\" for sunrise/sunset accurate to where you are.",
        },
      },
```
new_string:
```ts
          unavailable: "Panchang data isn't available for this date/location right now.",
          referenceLocation: "Delhi (Reference)",
          yourLocation: "Your Location",
          locating: "Locating...",
          locationDenied: "Location access denied — showing the reference panchang instead.",
          locationHint: "Timings are shown for Delhi by default — tap \"Your Location\" for sunrise/sunset accurate to where you are.",
          choghadiyaTitle: "Choghadiya",
          choghadiyaSubtitle: "Auspicious time periods — tap to expand",
          daytime: "Daytime",
          nighttime: "Nighttime",
          horaTitle: "Planetary Hours (Hora)",
          horaSubtitle: "Each hour ruled by a different planet — tap to expand",
          monthlyCalendarTitle: "Monthly Calendar",
          keyDatesThisMonth: "Key Dates This Month",
          planningToBuyTitle: "Planning to Buy?",
          planningToBuySubtitle: "Get Vedic-powered timing for your purchase",
          categoryVehicle: "Vehicle",
          categoryVehicleSub: "Car, Bike, EV",
          categoryHome: "Home",
          categoryHomeSub: "Apartment, Villa, Plot",
          categoryCommercial: "Commercial",
          categoryCommercialSub: "Office, Shop, Warehouse",
          categoryOther: "Other",
          categoryOtherSub: "Any big purchase",
          adhikMaasAvoid: "avoid new beginnings",
        },
      },
      purchasePlan: {
        selectCategory: "Add a few details (optional)",
        describeOther: "Describe what you're buying",
        costBracket: "Budget range",
        bookingDate: "Booking date",
        deliveryDate: "Delivery date",
        dateHint: "Provide at least one date — we'll estimate the other",
        atLeastOneDateRequired: "Please provide at least one date",
        submit: "Get Timing Analysis",
        submitting: "Submitting...",
        analyzing: "Analyzing your chart & panchang...",
        yourAnalyses: "Your Analyses",
        bookingLabel: "Booking",
        deliveryLabel: "Delivery",
        remedies: "Remedies",
        luckyColor: "Lucky Color",
        luckyDirection: "Lucky Direction",
        rateLimitReached: "You've reached today's limit for purchase-timing analyses. Try again tomorrow.",
        error: "Couldn't complete the analysis. Please try again.",
        close: "Close",
      },
```
Note: since `purchasePlan` is a new top-level sibling key, verify indentation matches the surrounding top-level keys in the `en` block (e.g. same indent level as `horoscope:` and `kundliPage:`) — read a few lines above/below after editing to confirm the object nesting is correct and the file still parses (run `npx tsc --noEmit` at the end of this task to catch any bracket mistakes).

- [ ] **Step 2: Hindi (`hi`)**

Edit the block at `i18n/resources.ts:441-447`:
```ts
old_string:
          unavailable: "इस तिथि/स्थान के लिए पंचांग डेटा अभी उपलब्ध नहीं है।",
          referenceLocation: "दिल्ली (संदर्भ)",
          yourLocation: "आपका स्थान",
          locating: "स्थान खोजा जा रहा है...",
          locationDenied: "स्थान की अनुमति नहीं मिली — इसके बजाय संदर्भ पंचांग दिखाया जा रहा है।",
          locationHint: "समय डिफ़ॉल्ट रूप से दिल्ली के लिए दिखाए जाते हैं — अपने स्थान के अनुसार सटीक सूर्योदय/सूर्यास्त के लिए \"आपका स्थान\" टैप करें।",
        },
      },
```
new_string:
```ts
          unavailable: "इस तिथि/स्थान के लिए पंचांग डेटा अभी उपलब्ध नहीं है।",
          referenceLocation: "दिल्ली (संदर्भ)",
          yourLocation: "आपका स्थान",
          locating: "स्थान खोजा जा रहा है...",
          locationDenied: "स्थान की अनुमति नहीं मिली — इसके बजाय संदर्भ पंचांग दिखाया जा रहा है।",
          locationHint: "समय डिफ़ॉल्ट रूप से दिल्ली के लिए दिखाए जाते हैं — अपने स्थान के अनुसार सटीक सूर्योदय/सूर्यास्त के लिए \"आपका स्थान\" टैप करें।",
          choghadiyaTitle: "चौघड़िया",
          choghadiyaSubtitle: "शुभ समय अवधि — विस्तार के लिए टैप करें",
          daytime: "दिन",
          nighttime: "रात",
          horaTitle: "ग्रह होरा",
          horaSubtitle: "हर घंटे पर एक अलग ग्रह का शासन — विस्तार के लिए टैप करें",
          monthlyCalendarTitle: "मासिक कैलेंडर",
          keyDatesThisMonth: "इस माह की महत्वपूर्ण तिथियां",
          planningToBuyTitle: "खरीदारी की योजना बना रहे हैं?",
          planningToBuySubtitle: "अपनी खरीदारी के लिए वैदिक समय जानें",
          categoryVehicle: "वाहन",
          categoryVehicleSub: "कार, बाइक, EV",
          categoryHome: "घर",
          categoryHomeSub: "फ्लैट, विला, प्लॉट",
          categoryCommercial: "व्यावसायिक",
          categoryCommercialSub: "ऑफिस, दुकान, गोदाम",
          categoryOther: "अन्य",
          categoryOtherSub: "कोई भी बड़ी खरीदारी",
          adhikMaasAvoid: "नई शुरुआत से बचें",
        },
      },
      purchasePlan: {
        selectCategory: "कुछ विवरण जोड़ें (वैकल्पिक)",
        describeOther: "आप क्या खरीद रहे हैं, बताएं",
        costBracket: "बजट सीमा",
        bookingDate: "बुकिंग तिथि",
        deliveryDate: "डिलीवरी तिथि",
        dateHint: "कम से कम एक तिथि दें — हम दूसरी का अनुमान लगाएंगे",
        atLeastOneDateRequired: "कृपया कम से कम एक तिथि दें",
        submit: "समय विश्लेषण प्राप्त करें",
        submitting: "जमा किया जा रहा है...",
        analyzing: "आपकी कुंडली और पंचांग का विश्लेषण हो रहा है...",
        yourAnalyses: "आपके विश्लेषण",
        bookingLabel: "बुकिंग",
        deliveryLabel: "डिलीवरी",
        remedies: "उपाय",
        luckyColor: "शुभ रंग",
        luckyDirection: "शुभ दिशा",
        rateLimitReached: "आपने आज की सीमा पूरी कर ली है। कृपया कल पुनः प्रयास करें।",
        error: "विश्लेषण पूरा नहीं हो सका। कृपया पुनः प्रयास करें।",
        close: "बंद करें",
      },
```

- [ ] **Step 3: Bengali (`bn`)**

Edit the block at `i18n/resources.ts:745-751`:
```ts
old_string:
          unavailable: "এই তারিখ/অবস্থানের জন্য পঞ্চাঙ্গ তথ্য এখন উপলব্ধ নেই।",
          referenceLocation: "দিল্লি (রেফারেন্স)",
          yourLocation: "আপনার অবস্থান",
          locating: "অবস্থান খোঁজা হচ্ছে...",
          locationDenied: "অবস্থানের অনুমতি পাওয়া যায়নি — পরিবর্তে রেফারেন্স পঞ্চাঙ্গ দেখানো হচ্ছে।",
          locationHint: "সময় ডিফল্টভাবে দিল্লির জন্য দেখানো হয় — আপনার অবস্থান অনুযায়ী সঠিক সূর্যোদয়/সূর্যাস্তের জন্য \"আপনার অবস্থান\" ট্যাপ করুন।",
        },
      },
```
new_string:
```ts
          unavailable: "এই তারিখ/অবস্থানের জন্য পঞ্চাঙ্গ তথ্য এখন উপলব্ধ নেই।",
          referenceLocation: "দিল্লি (রেফারেন্স)",
          yourLocation: "আপনার অবস্থান",
          locating: "অবস্থান খোঁজা হচ্ছে...",
          locationDenied: "অবস্থানের অনুমতি পাওয়া যায়নি — পরিবর্তে রেফারেন্স পঞ্চাঙ্গ দেখানো হচ্ছে।",
          locationHint: "সময় ডিফল্টভাবে দিল্লির জন্য দেখানো হয় — আপনার অবস্থান অনুযায়ী সঠিক সূর্যোদয়/সূর্যাস্তের জন্য \"আপনার অবস্থান\" ট্যাপ করুন।",
          choghadiyaTitle: "চোঘড়িয়া",
          choghadiyaSubtitle: "শুভ সময়কাল — বিস্তারিত দেখতে ট্যাপ করুন",
          daytime: "দিন",
          nighttime: "রাত",
          horaTitle: "গ্রহ হোরা",
          horaSubtitle: "প্রতি ঘণ্টায় ভিন্ন গ্রহের অধিপত্য — বিস্তারিত দেখতে ট্যাপ করুন",
          monthlyCalendarTitle: "মাসিক ক্যালেন্ডার",
          keyDatesThisMonth: "এই মাসের গুরুত্বপূর্ণ তারিখ",
          planningToBuyTitle: "কেনাকাটার পরিকল্পনা করছেন?",
          planningToBuySubtitle: "আপনার কেনাকাটার জন্য বৈদিক সময় জানুন",
          categoryVehicle: "যানবাহন",
          categoryVehicleSub: "গাড়ি, বাইক, EV",
          categoryHome: "বাড়ি",
          categoryHomeSub: "ফ্ল্যাট, ভিলা, প্লট",
          categoryCommercial: "বাণিজ্যিক",
          categoryCommercialSub: "অফিস, দোকান, গুদাম",
          categoryOther: "অন্যান্য",
          categoryOtherSub: "যেকোনো বড় কেনাকাটা",
          adhikMaasAvoid: "নতুন সূচনা এড়িয়ে চলুন",
        },
      },
      purchasePlan: {
        selectCategory: "কিছু বিবরণ যোগ করুন (ঐচ্ছিক)",
        describeOther: "আপনি কী কিনছেন তা লিখুন",
        costBracket: "বাজেট পরিসীমা",
        bookingDate: "বুকিং তারিখ",
        deliveryDate: "ডেলিভারি তারিখ",
        dateHint: "অন্তত একটি তারিখ দিন — আমরা অন্যটি অনুমান করব",
        atLeastOneDateRequired: "অনুগ্রহ করে অন্তত একটি তারিখ দিন",
        submit: "সময় বিশ্লেষণ পান",
        submitting: "জমা দেওয়া হচ্ছে...",
        analyzing: "আপনার কুণ্ডলী ও পঞ্চাঙ্গ বিশ্লেষণ করা হচ্ছে...",
        yourAnalyses: "আপনার বিশ্লেষণ",
        bookingLabel: "বুকিং",
        deliveryLabel: "ডেলিভারি",
        remedies: "প্রতিকার",
        luckyColor: "শুভ রং",
        luckyDirection: "শুভ দিক",
        rateLimitReached: "আপনি আজকের সীমা পূরণ করেছেন। অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন।",
        error: "বিশ্লেষণ সম্পূর্ণ করা যায়নি। আবার চেষ্টা করুন।",
        close: "বন্ধ করুন",
      },
```

- [ ] **Step 4: Marathi (`mr`)**

Edit the block at `i18n/resources.ts:1049-1055`:
```ts
old_string:
          unavailable: "या तारखेसाठी/स्थानासाठी पंचांग डेटा सध्या उपलब्ध नाही.",
          referenceLocation: "दिल्ली (संदर्भ)",
          yourLocation: "तुमचे स्थान",
          locating: "स्थान शोधत आहे...",
          locationDenied: "स्थानाची परवानगी नाकारली — त्याऐवजी संदर्भ पंचांग दाखवत आहे.",
          locationHint: "वेळा डीफॉल्टनुसार दिल्लीसाठी दाखवल्या जातात — तुमच्या स्थानानुसार अचूक सूर्योदय/सूर्यास्तासाठी \"तुमचे स्थान\" टॅप करा.",
        },
      },
```
new_string:
```ts
          unavailable: "या तारखेसाठी/स्थानासाठी पंचांग डेटा सध्या उपलब्ध नाही.",
          referenceLocation: "दिल्ली (संदर्भ)",
          yourLocation: "तुमचे स्थान",
          locating: "स्थान शोधत आहे...",
          locationDenied: "स्थानाची परवानगी नाकारली — त्याऐवजी संदर्भ पंचांग दाखवत आहे.",
          locationHint: "वेळा डीफॉल्टनुसार दिल्लीसाठी दाखवल्या जातात — तुमच्या स्थानानुसार अचूक सूर्योदय/सूर्यास्तासाठी \"तुमचे स्थान\" टॅप करा.",
          choghadiyaTitle: "चौघडिया",
          choghadiyaSubtitle: "शुभ कालावधी — विस्तारासाठी टॅप करा",
          daytime: "दिवस",
          nighttime: "रात्र",
          horaTitle: "ग्रह होरा",
          horaSubtitle: "प्रत्येक तासाला वेगळ्या ग्रहाचे अधिपत्य — विस्तारासाठी टॅप करा",
          monthlyCalendarTitle: "मासिक दिनदर्शिका",
          keyDatesThisMonth: "या महिन्यातील महत्त्वाच्या तारखा",
          planningToBuyTitle: "खरेदीचा विचार करत आहात?",
          planningToBuySubtitle: "तुमच्या खरेदीसाठी वैदिक वेळ जाणून घ्या",
          categoryVehicle: "वाहन",
          categoryVehicleSub: "कार, बाईक, EV",
          categoryHome: "घर",
          categoryHomeSub: "फ्लॅट, बंगला, प्लॉट",
          categoryCommercial: "व्यावसायिक",
          categoryCommercialSub: "ऑफिस, दुकान, गोदाम",
          categoryOther: "इतर",
          categoryOtherSub: "कोणतीही मोठी खरेदी",
          adhikMaasAvoid: "नवीन सुरुवात टाळा",
        },
      },
      purchasePlan: {
        selectCategory: "काही तपशील जोडा (ऐच्छिक)",
        describeOther: "तुम्ही काय खरेदी करत आहात ते सांगा",
        costBracket: "बजेट श्रेणी",
        bookingDate: "बुकिंग तारीख",
        deliveryDate: "डिलिव्हरी तारीख",
        dateHint: "किमान एक तारीख द्या — आम्ही दुसरी अंदाज लावू",
        atLeastOneDateRequired: "कृपया किमान एक तारीख द्या",
        submit: "वेळ विश्लेषण मिळवा",
        submitting: "सबमिट करत आहे...",
        analyzing: "तुमची कुंडली आणि पंचांग विश्लेषण करत आहे...",
        yourAnalyses: "तुमची विश्लेषणे",
        bookingLabel: "बुकिंग",
        deliveryLabel: "डिलिव्हरी",
        remedies: "उपाय",
        luckyColor: "शुभ रंग",
        luckyDirection: "शुभ दिशा",
        rateLimitReached: "तुम्ही आजची मर्यादा गाठली आहे. कृपया उद्या पुन्हा प्रयत्न करा.",
        error: "विश्लेषण पूर्ण होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा.",
        close: "बंद करा",
      },
```

- [ ] **Step 5: Telugu (`te`)**

Edit the block at `i18n/resources.ts:1353-1359`:
```ts
old_string:
          unavailable: "ఈ తేదీ/ప్రదేశం కోసం పంచాంగ డేటా ప్రస్తుతం అందుబాటులో లేదు.",
          referenceLocation: "ఢిల్లీ (రిఫరెన్స్)",
          yourLocation: "మీ ప్రదేశం",
          locating: "ప్రదేశం కనుగొంటోంది...",
          locationDenied: "ప్రదేశ అనుమతి నిరాకరించబడింది — బదులుగా రిఫరెన్స్ పంచాంగం చూపిస్తోంది.",
          locationHint: "సమయాలు డిఫాల్ట్‌గా ఢిల్లీ కోసం చూపబడతాయి — మీ ప్రదేశానికి ఖచ్చితమైన సూర్యోదయం/సూర్యాస్తమయం కోసం \"మీ ప్రదేశం\" నొక్కండి.",
        },
      },
```
new_string:
```ts
          unavailable: "ఈ తేదీ/ప్రదేశం కోసం పంచాంగ డేటా ప్రస్తుతం అందుబాటులో లేదు.",
          referenceLocation: "ఢిల్లీ (రిఫరెన్స్)",
          yourLocation: "మీ ప్రదేశం",
          locating: "ప్రదేశం కనుగొంటోంది...",
          locationDenied: "ప్రదేశ అనుమతి నిరాకరించబడింది — బదులుగా రిఫరెన్స్ పంచాంగం చూపిస్తోంది.",
          locationHint: "సమయాలు డిఫాల్ట్‌గా ఢిల్లీ కోసం చూపబడతాయి — మీ ప్రదేశానికి ఖచ్చితమైన సూర్యోదయం/సూర్యాస్తమయం కోసం \"మీ ప్రదేశం\" నొక్కండి.",
          choghadiyaTitle: "చౌఘడియ",
          choghadiyaSubtitle: "శుభ సమయ వ్యవధులు — విస్తరించడానికి నొక్కండి",
          daytime: "పగలు",
          nighttime: "రాత్రి",
          horaTitle: "గ్రహ హోర",
          horaSubtitle: "ప్రతి గంటకు వేరే గ్రహం అధిపతి — విస్తరించడానికి నొక్కండి",
          monthlyCalendarTitle: "నెలవారీ క్యాలెండర్",
          keyDatesThisMonth: "ఈ నెల ముఖ్యమైన తేదీలు",
          planningToBuyTitle: "కొనుగోలు చేయాలనుకుంటున్నారా?",
          planningToBuySubtitle: "మీ కొనుగోలు కోసం వైదిక సమయాన్ని తెలుసుకోండి",
          categoryVehicle: "వాహనం",
          categoryVehicleSub: "కారు, బైక్, EV",
          categoryHome: "ఇల్లు",
          categoryHomeSub: "ఫ్లాట్, విల్లా, ప్లాట్",
          categoryCommercial: "వాణిజ్య",
          categoryCommercialSub: "ఆఫీసు, దుకాణం, గోడౌన్",
          categoryOther: "ఇతర",
          categoryOtherSub: "ఏదైనా పెద్ద కొనుగోలు",
          adhikMaasAvoid: "కొత్త ప్రారంభాలను నివారించండి",
        },
      },
      purchasePlan: {
        selectCategory: "కొన్ని వివరాలు జోడించండి (ఐచ్ఛికం)",
        describeOther: "మీరు కొంటున్నది వివరించండి",
        costBracket: "బడ్జెట్ పరిధి",
        bookingDate: "బుకింగ్ తేదీ",
        deliveryDate: "డెలివరీ తేదీ",
        dateHint: "కనీసం ఒక తేదీ ఇవ్వండి — మేము మరొకటి అంచనా వేస్తాము",
        atLeastOneDateRequired: "దయచేసి కనీసం ఒక తేదీ ఇవ్వండి",
        submit: "సమయ విశ్లేషణ పొందండి",
        submitting: "సమర్పిస్తోంది...",
        analyzing: "మీ జాతకం మరియు పంచాంగం విశ్లేషిస్తోంది...",
        yourAnalyses: "మీ విశ్లేషణలు",
        bookingLabel: "బుకింగ్",
        deliveryLabel: "డెలివరీ",
        remedies: "పరిహారాలు",
        luckyColor: "శుభ రంగు",
        luckyDirection: "శుభ దిశ",
        rateLimitReached: "మీరు ఈరోజు పరిమితిని చేరుకున్నారు. దయచేసి రేపు మళ్లీ ప్రయత్నించండి.",
        error: "విశ్లేషణ పూర్తి కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
        close: "మూసివేయండి",
      },
```

- [ ] **Step 6: Tamil (`ta`)**

Edit the block at `i18n/resources.ts:1657-1663`:
```ts
old_string:
          unavailable: "இந்த தேதி/இடத்திற்கான பஞ்சாங்க தரவு இப்போது கிடைக்கவில்லை.",
          referenceLocation: "டெல்லி (குறிப்பு)",
          yourLocation: "உங்கள் இடம்",
          locating: "இடம் கண்டறியப்படுகிறது...",
          locationDenied: "இட அனுமதி மறுக்கப்பட்டது — அதற்கு பதிலாக குறிப்பு பஞ்சாங்கம் காட்டப்படுகிறது.",
          locationHint: "நேரங்கள் இயல்பாக டெல்லிக்காக காட்டப்படுகின்றன — உங்கள் இடத்திற்கு துல்லியமான சூரிய உதயம்/அஸ்தமனத்திற்கு \"உங்கள் இடம்\" தட்டவும்.",
        },
      },
```
new_string:
```ts
          unavailable: "இந்த தேதி/இடத்திற்கான பஞ்சாங்க தரவு இப்போது கிடைக்கவில்லை.",
          referenceLocation: "டெல்லி (குறிப்பு)",
          yourLocation: "உங்கள் இடம்",
          locating: "இடம் கண்டறியப்படுகிறது...",
          locationDenied: "இட அனுமதி மறுக்கப்பட்டது — அதற்கு பதிலாக குறிப்பு பஞ்சாங்கம் காட்டப்படுகிறது.",
          locationHint: "நேரங்கள் இயல்பாக டெல்லிக்காக காட்டப்படுகின்றன — உங்கள் இடத்திற்கு துல்லியமான சூரிய உதயம்/அஸ்தமனத்திற்கு \"உங்கள் இடம்\" தட்டவும்.",
          choghadiyaTitle: "சோகடியா",
          choghadiyaSubtitle: "சுப நேரங்கள் — விரிவாக்க தட்டவும்",
          daytime: "பகல்",
          nighttime: "இரவு",
          horaTitle: "கிரக ஹோரா",
          horaSubtitle: "ஒவ்வொரு மணி நேரமும் வேறு கிரகத்தால் ஆளப்படுகிறது — விரிவாக்க தட்டவும்",
          monthlyCalendarTitle: "மாத நாட்காட்டி",
          keyDatesThisMonth: "இந்த மாதத்தின் முக்கிய தேதிகள்",
          planningToBuyTitle: "வாங்கத் திட்டமிடுகிறீர்களா?",
          planningToBuySubtitle: "உங்கள் வாங்குதலுக்கான வேத நேரத்தை அறியுங்கள்",
          categoryVehicle: "வாகனம்",
          categoryVehicleSub: "கார், பைக், EV",
          categoryHome: "வீடு",
          categoryHomeSub: "ஃப்ளாட், வில்லா, மனை",
          categoryCommercial: "வணிக",
          categoryCommercialSub: "அலுவலகம், கடை, கிடங்கு",
          categoryOther: "மற்றவை",
          categoryOtherSub: "ஏதேனும் பெரிய வாங்குதல்",
          adhikMaasAvoid: "புதிய தொடக்கங்களைத் தவிர்க்கவும்",
        },
      },
      purchasePlan: {
        selectCategory: "சில விவரங்களைச் சேர்க்கவும் (விருப்பத்திற்குரியது)",
        describeOther: "நீங்கள் வாங்குவதை விவரிக்கவும்",
        costBracket: "பட்ஜெட் வரம்பு",
        bookingDate: "முன்பதிவு தேதி",
        deliveryDate: "டெலிவரி தேதி",
        dateHint: "குறைந்தது ஒரு தேதியைக் கொடுங்கள் — மற்றொன்றை நாங்கள் மதிப்பிடுவோம்",
        atLeastOneDateRequired: "குறைந்தது ஒரு தேதியை வழங்கவும்",
        submit: "நேர பகுப்பாய்வைப் பெறுங்கள்",
        submitting: "சமர்ப்பிக்கிறது...",
        analyzing: "உங்கள் ஜாதகம் மற்றும் பஞ்சாங்கம் பகுப்பாய்வு செய்யப்படுகிறது...",
        yourAnalyses: "உங்கள் பகுப்பாய்வுகள்",
        bookingLabel: "முன்பதிவு",
        deliveryLabel: "டெலிவரி",
        remedies: "பரிகாரங்கள்",
        luckyColor: "அதிர்ஷ்ட நிறம்",
        luckyDirection: "அதிர்ஷ்ட திசை",
        rateLimitReached: "இன்றைய வரம்பை எட்டிவிட்டீர்கள். நாளை மீண்டும் முயற்சிக்கவும்.",
        error: "பகுப்பாய்வை முடிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        close: "மூடு",
      },
```

- [ ] **Step 7: Gujarati (`gu`)**

Edit the block at `i18n/resources.ts:1961-1967`:
```ts
old_string:
          unavailable: "આ તારીખ/સ્થાન માટે પંચાંગ ડેટા હાલમાં ઉપલબ્ધ નથી.",
          referenceLocation: "દિલ્હી (સંદર્ભ)",
          yourLocation: "તમારું સ્થાન",
          locating: "સ્થાન શોધી રહ્યા છીએ...",
          locationDenied: "સ્થાનની પરવાનગી નકારવામાં આવી — તેના બદલે સંદર્ભ પંચાંગ બતાવી રહ્યા છીએ.",
          locationHint: "સમય મૂળભૂત રીતે દિલ્હી માટે બતાવવામાં આવે છે — તમારા સ્થાન મુજબ ચોક્કસ સૂર્યોદય/સૂર્યાસ્ત માટે \"તમારું સ્થાન\" ટેપ કરો.",
        },
      },
```
new_string:
```ts
          unavailable: "આ તારીખ/સ્થાન માટે પંચાંગ ડેટા હાલમાં ઉપલબ્ધ નથી.",
          referenceLocation: "દિલ્હી (સંદર્ભ)",
          yourLocation: "તમારું સ્થાન",
          locating: "સ્થાન શોધી રહ્યા છીએ...",
          locationDenied: "સ્થાનની પરવાનગી નકારવામાં આવી — તેના બદલે સંદર્ભ પંચાંગ બતાવી રહ્યા છીએ.",
          locationHint: "સમય મૂળભૂત રીતે દિલ્હી માટે બતાવવામાં આવે છે — તમારા સ્થાન મુજબ ચોક્કસ સૂર્યોદય/સૂર્યાસ્ત માટે \"તમારું સ્થાન\" ટેપ કરો.",
          choghadiyaTitle: "ચોઘડિયા",
          choghadiyaSubtitle: "શુભ સમય ગાળા — વિસ્તૃત જોવા ટેપ કરો",
          daytime: "દિવસ",
          nighttime: "રાત",
          horaTitle: "ગ્રહ હોરા",
          horaSubtitle: "દરેક કલાકે અલગ ગ્રહનું આધિપત્ય — વિસ્તૃત જોવા ટેપ કરો",
          monthlyCalendarTitle: "માસિક કેલેન્ડર",
          keyDatesThisMonth: "આ મહિનાની મહત્વની તારીખો",
          planningToBuyTitle: "ખરીદીનું આયોજન કરી રહ્યાં છો?",
          planningToBuySubtitle: "તમારી ખરીદી માટે વૈદિક સમય જાણો",
          categoryVehicle: "વાહન",
          categoryVehicleSub: "કાર, બાઇક, EV",
          categoryHome: "ઘર",
          categoryHomeSub: "ફ્લેટ, વિલા, પ્લોટ",
          categoryCommercial: "વ્યાવસાયિક",
          categoryCommercialSub: "ઓફિસ, દુકાન, ગોડાઉન",
          categoryOther: "અન્ય",
          categoryOtherSub: "કોઈપણ મોટી ખરીદી",
          adhikMaasAvoid: "નવી શરૂઆત ટાળો",
        },
      },
      purchasePlan: {
        selectCategory: "થોડી વિગતો ઉમેરો (વૈકલ્પિક)",
        describeOther: "તમે શું ખરીદી રહ્યા છો તે વર્ણવો",
        costBracket: "બજેટ શ્રેણી",
        bookingDate: "બુકિંગ તારીખ",
        deliveryDate: "ડિલિવરી તારીખ",
        dateHint: "ઓછામાં ઓછી એક તારીખ આપો — અમે બીજી અંદાજ કરીશું",
        atLeastOneDateRequired: "કૃપા કરી ઓછામાં ઓછી એક તારીખ આપો",
        submit: "સમય વિશ્લેષણ મેળવો",
        submitting: "સબમિટ કરી રહ્યું છે...",
        analyzing: "તમારી કુંડળી અને પંચાંગનું વિશ્લેષણ થઈ રહ્યું છે...",
        yourAnalyses: "તમારા વિશ્લેષણો",
        bookingLabel: "બુકિંગ",
        deliveryLabel: "ડિલિવરી",
        remedies: "ઉપાયો",
        luckyColor: "શુભ રંગ",
        luckyDirection: "શુભ દિશા",
        rateLimitReached: "તમે આજની મર્યાદા પૂરી કરી છે. કૃપા કરી કાલે ફરી પ્રયાસ કરો.",
        error: "વિશ્લેષણ પૂર્ણ થઈ શક્યું નથી. કૃપા કરી ફરી પ્રયાસ કરો.",
        close: "બંધ કરો",
      },
```

- [ ] **Step 8: Verify the file still parses and typechecks**

Run: `npx tsc --noEmit`
Expected: no errors. If there's a bracket-mismatch error, the likely cause is `purchasePlan` being inserted at the wrong nesting depth in one language block — check that its indentation (6 spaces) matches sibling top-level keys like `horoscope:` in that same language block, not nested inside it.

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(panchang): add choghadiya/hora/purchase-plan translations for all 7 languages"
```

---

### Task 10: `MonthlyPanchangCalendar` component

**Files:**
- Create: `components/panchang/MonthlyPanchangCalendar.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type PanchangMonthDay } from "@/lib/api";
import Card from "@/components/ui/Card";
import { getFestivalsForDate } from "@/lib/panchang/hindu-festivals";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";

interface MonthlyPanchangCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  lat?: number;
  lon?: number;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function MonthlyPanchangCalendar({
  selectedDate,
  onSelectDate,
  lat,
  lon,
}: MonthlyPanchangCalendarProps) {
  const { t } = useTranslation();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedDate.split("-").map(Number);
    return { year: y, month: m }; // month is 1-12
  });
  const [days, setDays] = useState<PanchangMonthDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .panchangMonth(cursor.year, cursor.month, lat, lon)
      .then((res) => {
        if (!cancelled) setDays(res.days);
      })
      .catch(() => {
        if (!cancelled) setDays(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor.year, cursor.month, lat, lon]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
    const leading: (PanchangMonthDay | null)[] = Array.from({ length: firstWeekday }, () => null);
    const dayCells = days ?? [];
    const totalCells = leading.length + dayCells.length;
    const trailing: (PanchangMonthDay | null)[] = Array.from({ length: (7 - (totalCells % 7)) % 7 }, () => null);
    return [...leading, ...dayCells, ...trailing];
  }, [cursor, days]);

  const keyDates = useMemo(() => {
    if (!days) return [];
    return days.filter(
      (d) => d.isFullMoon || d.isNewMoon || d.isEkadashi || getFestivalsForDate(d.isoDate).length > 0,
    );
  }, [days]);

  function goToMonth(delta: number) {
    setCursor((c) => {
      let month = c.month + delta;
      let year = c.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 });
    onSelectDate(now.toISOString().slice(0, 10));
  }

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Card className="p-4 border-gold/10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-display text-foreground">{t("horoscope.panchang.monthlyCalendarTitle")}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToMonth(-1)}
            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button onClick={goToday} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gold hover:bg-gold/10">
            {monthLabel}
          </button>
          <button
            onClick={() => goToMonth(1)}
            className="p-1.5 rounded-lg hover:bg-gold/10 text-muted"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <p key={i} className="text-center text-[9px] text-muted uppercase">
            {w}
          </p>
        ))}
      </div>

      <div className={`grid grid-cols-7 gap-1 ${loading ? "opacity-50" : ""}`}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const festivals = getFestivalsForDate(cell.isoDate);
          const adhik = findAdhikMaas(cell.isoDate);
          const isSelected = cell.isoDate === selectedDate;
          const isShukla = cell.paksha === "Shukla";
          return (
            <button
              key={cell.isoDate}
              onClick={() => onSelectDate(cell.isoDate)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                isSelected
                  ? "bg-gold text-[#1a0e00] font-semibold"
                  : adhik
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : festivals.length > 0
                      ? "bg-amber-500/10 text-foreground border border-amber-500/25"
                      : isShukla
                        ? "bg-surface/60 text-foreground"
                        : "bg-surface/30 text-muted"
              }`}
            >
              <span>{cell.day}</span>
              {festivals.length > 0 ? (
                <span className="text-[9px]">{festivals[0].emoji}</span>
              ) : cell.isFullMoon ? (
                <span className="text-[9px]">🌕</span>
              ) : cell.isNewMoon ? (
                <span className="text-[9px]">🌑</span>
              ) : cell.isEkadashi ? (
                <span className="text-[9px]">🪷</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {keyDates.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gold/10">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
            {t("horoscope.panchang.keyDatesThisMonth")}
          </p>
          <div className="space-y-1.5">
            {keyDates.map((d) => {
              const festivals = getFestivalsForDate(d.isoDate);
              const label =
                festivals[0]?.name ??
                (d.isFullMoon ? "Purnima" : d.isNewMoon ? "Amavasya" : d.isEkadashi ? "Ekadashi" : d.tithiName);
              return (
                <button
                  key={d.isoDate}
                  onClick={() => onSelectDate(d.isoDate)}
                  className="w-full flex items-center justify-between text-[11px] px-2 py-1 rounded-lg hover:bg-gold/5"
                >
                  <span className="text-muted">
                    {d.isoDate.slice(8, 10)} · {label}
                  </span>
                  <span className="text-foreground">{d.vara}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panchang/MonthlyPanchangCalendar.tsx
git commit -m "feat(panchang): add MonthlyPanchangCalendar component"
```

---

### Task 11: `PurchasePlanModal` component

**Files:**
- Create: `components/panchang/PurchasePlanModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Car, Home, Building2, Package } from "lucide-react";
import { api, ApiError, type PurchasePlanCategory } from "@/lib/api";
import Card from "@/components/ui/Card";

interface PurchasePlanModalProps {
  isOpen: boolean;
  panchangDate: string;
  onClose: () => void;
  onSubmitted: (planId: string) => void;
}

const COST_BRACKETS = ["under-1l", "1l-5l", "5l-10l", "10l-25l", "25l-50l", "50l-1cr", "above-1cr"];

export default function PurchasePlanModal({ isOpen, panchangDate, onClose, onSubmitted }: PurchasePlanModalProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<"pick-category" | "form" | "submitted">("pick-category");
  const [category, setCategory] = useState<PurchasePlanCategory | null>(null);
  const [detail, setDetail] = useState("");
  const [costBracket, setCostBracket] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES: { id: PurchasePlanCategory; icon: React.ReactNode; label: string; sub: string }[] = [
    {
      id: "vehicle",
      icon: <Car size={22} />,
      label: t("horoscope.panchang.categoryVehicle"),
      sub: t("horoscope.panchang.categoryVehicleSub"),
    },
    {
      id: "home",
      icon: <Home size={22} />,
      label: t("horoscope.panchang.categoryHome"),
      sub: t("horoscope.panchang.categoryHomeSub"),
    },
    {
      id: "commercial",
      icon: <Building2 size={22} />,
      label: t("horoscope.panchang.categoryCommercial"),
      sub: t("horoscope.panchang.categoryCommercialSub"),
    },
    {
      id: "other",
      icon: <Package size={22} />,
      label: t("horoscope.panchang.categoryOther"),
      sub: t("horoscope.panchang.categoryOtherSub"),
    },
  ];

  function reset() {
    setStep("pick-category");
    setCategory(null);
    setDetail("");
    setCostBracket("");
    setBookingDate("");
    setDeliveryDate("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickCategory(c: PurchasePlanCategory) {
    setCategory(c);
    setStep("form");
  }

  async function handleSubmit() {
    if (!category) return;
    if (!bookingDate && !deliveryDate) {
      setError(t("purchasePlan.atLeastOneDateRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.purchasePlanAnalyze({
        category,
        metadata: detail ? { detail } : {},
        costBracket: costBracket || undefined,
        bookingDate: bookingDate || undefined,
        deliveryDate: deliveryDate || undefined,
        panchangDate,
        language: i18n.language,
      });
      setStep("submitted");
      onSubmitted(res.planId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(t("purchasePlan.rateLimitReached"));
      } else {
        setError(t("purchasePlan.error"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <Card className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-t-3xl sm:rounded-3xl border-gold/20">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-display text-foreground">{t("horoscope.panchang.planningToBuyTitle")}</p>
          <button onClick={handleClose} className="p-1 text-muted hover:text-foreground" aria-label={t("purchasePlan.close")}>
            <X size={18} />
          </button>
        </div>

        {step === "pick-category" && (
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className="p-4 rounded-2xl border border-gold/15 bg-surface/40 text-center hover:border-gold/40 transition-colors"
              >
                <span className="text-gold flex justify-center mb-2">{c.icon}</span>
                <p className="text-xs font-semibold text-foreground">{c.label}</p>
                <p className="text-[10px] text-muted mt-0.5">{c.sub}</p>
              </button>
            ))}
          </div>
        )}

        {step === "form" && category && (
          <div className="space-y-3">
            <p className="text-xs text-muted">{t("purchasePlan.selectCategory")}</p>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("purchasePlan.describeOther")}
              className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
            <select
              value={costBracket}
              onChange={(e) => setCostBracket(e.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
            >
              <option value="">{t("purchasePlan.costBracket")}</option>
              {COST_BRACKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider">{t("purchasePlan.bookingDate")}</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-wider">{t("purchasePlan.deliveryDate")}</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-gold/20 bg-surface/40 px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted">{t("purchasePlan.dateHint")}</p>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gold text-[#1a0e00] text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? t("purchasePlan.submitting") : t("purchasePlan.submit")}
            </button>
          </div>
        )}

        {step === "submitted" && (
          <div className="text-center py-6">
            <p className="text-sm text-foreground font-semibold mb-1">{t("purchasePlan.analyzing")}</p>
            <p className="text-[11px] text-muted">{t("purchasePlan.yourAnalyses")}</p>
            <button onClick={handleClose} className="mt-4 px-4 py-2 rounded-xl border border-gold/20 text-xs text-foreground">
              {t("purchasePlan.close")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add `PurchasePlanCategory` export if missing**

Confirm `lib/api.ts` (Task 7) exports `PurchasePlanCategory` — it does (`export type PurchasePlanCategory = ...`). No action needed, this step is just a checkpoint before typechecking.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/panchang/PurchasePlanModal.tsx
git commit -m "feat(panchang): add PurchasePlanModal component"
```

---

### Task 12: `PurchasePlanResults` component

**Files:**
- Create: `components/panchang/PurchasePlanResults.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { api, type PurchasePlan, type PurchasePlanAnalysis } from "@/lib/api";
import Card from "@/components/ui/Card";

interface PurchasePlanResultsProps {
  plans: PurchasePlan[];
  pollingId: string | null;
  onPolled: (updated: PurchasePlan) => void;
}

function isAnalysis(a: PurchasePlan["analysis"]): a is PurchasePlanAnalysis {
  return !!a && !("parseError" in a);
}

export default function PurchasePlanResults({ plans, pollingId, onPolled }: PurchasePlanResultsProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => {
      api
        .purchasePlanGet(pollingId)
        .then((plan) => {
          onPolled(plan);
          if (plan.status === "done" || plan.status === "error") {
            clearInterval(interval);
          }
        })
        .catch(() => clearInterval(interval));
    }, 5000);
    return () => clearInterval(interval);
  }, [pollingId, onPolled]);

  if (plans.length === 0) return null;

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="p-4 border-gold/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground capitalize">{plan.category}</p>
            {(plan.status === "pending" || plan.status === "processing") && (
              <span className="flex items-center gap-1.5 text-[10px] text-muted">
                <Loader2 size={12} className="animate-spin" /> {t("purchasePlan.analyzing")}
              </span>
            )}
            {plan.status === "error" && <span className="text-[10px] text-red-400">{t("purchasePlan.error")}</span>}
          </div>
          <p className="text-[10px] text-muted mb-2">
            {plan.resolvedBookingDate} → {plan.resolvedDeliveryDate}
          </p>

          {plan.status === "done" && isAnalysis(plan.analysis) && (
            <div className="space-y-3 pt-2 border-t border-gold/10">
              <div className="flex items-center gap-2">
                <span className="text-lg font-display text-gold">{plan.analysis.overallScore}</span>
                <span className="text-xs text-foreground">{plan.analysis.overallVerdict}</span>
              </div>
              <ul className="text-[11px] text-muted space-y-0.5 list-disc list-inside">
                {plan.analysis.tldr.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>

              {[
                { label: t("purchasePlan.bookingLabel"), d: plan.analysis.bookingDate },
                { label: t("purchasePlan.deliveryLabel"), d: plan.analysis.deliveryDate },
              ].map(({ label, d }) => (
                <div key={label} className="rounded-xl bg-surface/40 p-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                    {label} · {d.date}
                  </p>
                  <p className="text-xs text-foreground mb-1.5">
                    {d.verdict} ({d.score}/100)
                  </p>
                  {d.highlights.length > 0 && (
                    <p className="text-[10px] text-emerald-400 mb-0.5">✓ {d.highlights.join(" · ")}</p>
                  )}
                  {d.warnings.length > 0 && <p className="text-[10px] text-amber-400">⚠ {d.warnings.join(" · ")}</p>}
                </div>
              ))}

              {plan.analysis.remedies.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t("purchasePlan.remedies")}</p>
                  <p className="text-[11px] text-foreground">{plan.analysis.remedies.join(" · ")}</p>
                </div>
              )}

              <div className="flex gap-4 text-[10px] text-muted">
                <span>
                  {t("purchasePlan.luckyColor")}: {plan.analysis.luckyColor}
                </span>
                <span>
                  {t("purchasePlan.luckyDirection")}: {plan.analysis.luckyDirection}
                </span>
              </div>

              <p className="text-[11px] text-foreground italic">{plan.analysis.finalAdvice}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/panchang/PurchasePlanResults.tsx
git commit -m "feat(panchang): add PurchasePlanResults component"
```

---

### Task 13: Rebuild `app/panchang/page.tsx`

**Files:**
- Modify: `app/panchang/page.tsx` (full rewrite, preserving existing dual-location logic)

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `app/panchang/page.tsx` with:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sun,
  Sunset,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Navigation,
  ChevronDown,
} from "lucide-react";
import { api, type PanchangData, type PurchasePlan } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useGeolocation } from "@/hooks/useGeolocation";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/SectionTitle";
import MonthlyPanchangCalendar from "@/components/panchang/MonthlyPanchangCalendar";
import PurchasePlanModal from "@/components/panchang/PurchasePlanModal";
import PurchasePlanResults from "@/components/panchang/PurchasePlanResults";
import { REGION_OPTIONS, REGION_META, type RegionId } from "@/lib/panchang/regions";
import { findAdhikMaas } from "@/lib/panchang/adhik-maas-ranges";

/** Delhi/NCR — the same national reference point GET /astro/panchang defaults to server-side. */
const REFERENCE_LAT = 28.6139;
const REFERENCE_LON = 77.209;

function FactCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3.5 border-gold/10 text-center">
      <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-semibold mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

function WindowCard({
  icon,
  label,
  window,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  window: { start: string; end: string };
  tone: "avoid" | "auspicious";
}) {
  const { t } = useTranslation();
  const borderBg = tone === "avoid" ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5";
  const text = tone === "avoid" ? "text-red-400" : "text-emerald-400";
  return (
    <Card className={`p-4 ${borderBg}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={text}>{icon}</span>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <span className={`ml-auto text-[9px] font-semibold uppercase tracking-wider ${text}`}>
          {tone === "avoid" ? t("horoscope.panchang.avoid") : t("horoscope.panchang.auspicious")}
        </span>
      </div>
      <p className="text-sm text-foreground font-medium">
        {window.start} – {window.end}
      </p>
    </Card>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-gold/10 overflow-hidden p-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
        <div className="text-left">
          <p className="text-xs font-display text-foreground">{title}</p>
          <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-gold/10 pt-3">{children}</div>}
    </Card>
  );
}

function isCurrentlyActive(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  return currentMins >= startMins && currentMins < endMins;
}

export default function PanchangPage() {
  const { t } = useTranslation();
  const { firebaseUser, loading: authLoading } = useAuth();
  const geo = useGeolocation();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [region, setRegion] = useState<RegionId>("north");

  const [refData, setRefData] = useState<PanchangData | null>(null);
  const [refState, setRefState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [userData, setUserData] = useState<PanchangData | null>(null);
  const [userState, setUserState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const [source, setSource] = useState<"reference" | "mine">("reference");

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    setRefState("loading");
    api
      .panchang(REFERENCE_LAT, REFERENCE_LON, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setRefData(res);
        setRefState("ready");
      })
      .catch(() => {
        if (!cancelled) setRefState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser, selectedDate]);

  useEffect(() => {
    if (authLoading || !firebaseUser || !geo.coords) return;
    let cancelled = false;
    setUserState("loading");
    api
      .panchang(geo.coords.lat, geo.coords.lon, selectedDate)
      .then((res) => {
        if (cancelled) return;
        setUserData(res);
        setUserState("ready");
        setSource("mine");
      })
      .catch(() => {
        if (!cancelled) setUserState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser, geo.coords, selectedDate]);

  const data = source === "mine" && userData ? userData : refData;
  const state =
    source === "mine" ? (userState === "ready" ? "ready" : userState === "unavailable" ? "unavailable" : "loading") : refState;

  const regions: RegionId[] = ["north", "south", "west", "east"];

  // ─── Planning to Buy state ──────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [plans, setPlans] = useState<PurchasePlan[]>([]);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [plansLoaded, setPlansLoaded] = useState(false);

  const loadPlans = useCallback(async () => {
    if (plansLoaded) return;
    try {
      const res = await api.purchasePlanList();
      setPlans(res.plans);
    } catch {
      // silent — the section just shows no history yet
    } finally {
      setPlansLoaded(true);
    }
  }, [plansLoaded]);

  useEffect(() => {
    if (!authLoading && firebaseUser) loadPlans();
  }, [authLoading, firebaseUser, loadPlans]);

  function handleSubmitted(planId: string) {
    setPollingId(planId);
    setPlans((prev) => {
      const optimistic: PurchasePlan = {
        id: planId,
        category: "other",
        metadata: {},
        costBracket: null,
        resolvedBookingDate: "",
        resolvedDeliveryDate: "",
        status: "pending",
        analysis: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      return [optimistic, ...prev];
    });
  }

  const handlePolled = useCallback((updated: PurchasePlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const regionMeta = REGION_META[region];
  const regionalMonth = data?.regionalMonths?.[region];
  const adhik = findAdhikMaas(selectedDate);

  return (
    <main className="min-h-screen pb-28" style={{ background: "var(--background)" }}>
      <div className="px-5 pt-10">
        <SectionTitle title={t("nav.panchang")} subtitle={data?.date ?? ""} />

        {/* Location source */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40">
            <button
              onClick={() => setSource("reference")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                source === "reference" ? "bg-gold text-[#1a0e00]" : "text-muted"
              }`}
            >
              <MapPin size={12} /> {t("horoscope.panchang.referenceLocation")}
            </button>
            <button
              onClick={() => (userData ? setSource("mine") : geo.request())}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                source === "mine" && userData ? "bg-gold text-[#1a0e00]" : "text-muted"
              }`}
            >
              <Navigation size={12} />
              {geo.status === "requesting" || userState === "loading"
                ? t("horoscope.panchang.locating")
                : t("horoscope.panchang.yourLocation")}
            </button>
          </div>
          {geo.status === "denied" && <span className="text-[11px] text-muted">{t("horoscope.panchang.locationDenied")}</span>}
        </div>
        {geo.status === "idle" && <p className="mt-2 text-[11px] text-muted">{t("horoscope.panchang.locationHint")}</p>}

        {/* Regional calendar + Adhik Maas */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-gold/15 p-1 bg-surface/40">
            {REGION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRegion(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  region === opt.value ? "bg-gold text-[#1a0e00]" : "text-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <Card className="mt-2 p-3.5 border-gold/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">{regionMeta.calendarName}</p>
            <p className="text-sm text-foreground font-medium mt-0.5">
              {regionalMonth ? `${regionalMonth.isAdhikMaas ? "Adhik " : ""}${regionalMonth.monthName} ${regionalMonth.year}` : "—"}
              {regionalMonth?.paksha && (
                <span className="text-muted"> · {regionalMonth.paksha === "shukla" ? "Shukla" : "Krishna"} Paksha</span>
              )}
            </p>
          </div>
          {adhik && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
              🚫 {regionMeta.adhikMaasName} · {t("horoscope.panchang.adhikMaasAvoid")}
            </span>
          )}
        </Card>

        {/* Monthly calendar */}
        <div className="mt-4">
          <MonthlyPanchangCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            lat={source === "mine" ? geo.coords?.lat : undefined}
            lon={source === "mine" ? geo.coords?.lon : undefined}
          />
        </div>

        {state === "loading" && (
          <div className="mt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4 border-gold/10 animate-pulse h-16" />
            ))}
          </div>
        )}

        {state === "unavailable" && (
          <Card className="mt-6 p-5 border-gold/10 text-center text-sm text-muted">{t("horoscope.panchang.unavailable")}</Card>
        )}

        {state === "ready" && data && (
          <div className="mt-6 space-y-6">
            {/* Core five */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.tithi && <FactCard label={t("horoscope.panchang.tithi")} value={data.tithi.name} sub={data.tithi.paksha} />}
              {data.vara && <FactCard label={t("horoscope.panchang.vaar")} value={data.vara} />}
              {data.nakshatra && (
                <FactCard label={t("horoscope.panchang.nakshatra")} value={data.nakshatra.name} sub={data.nakshatra.lord} />
              )}
              {data.yoga && <FactCard label={t("horoscope.panchang.yoga")} value={data.yoga.name} />}
              {data.karana && <FactCard label={t("horoscope.panchang.karana")} value={data.karana.name} />}
            </div>

            {/* Sunrise / sunset */}
            {(data.sunriseTime || data.sunsetTime) && (
              <Card className="p-4 border-gold/10 flex items-center justify-around">
                {data.sunriseTime && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Sun size={16} className="text-gold" /> {data.sunriseTime}
                  </div>
                )}
                {data.sunsetTime && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Sunset size={16} className="text-gold" /> {data.sunsetTime}
                  </div>
                )}
              </Card>
            )}

            {/* Auspicious / inauspicious windows */}
            {(data.rahuKaal || data.gulikaKaal || data.yamagandaKaal || data.abhijitMuhurta) && (
              <div>
                <h2 className="text-sm font-display text-foreground mb-3">{t("horoscope.panchang.auspiciousWindows")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.rahuKaal && (
                    <WindowCard icon={<ShieldAlert size={14} />} label={t("horoscope.panchang.rahuKaal")} window={data.rahuKaal} tone="avoid" />
                  )}
                  {data.gulikaKaal && (
                    <WindowCard icon={<ShieldAlert size={14} />} label={t("horoscope.panchang.gulikaKaal")} window={data.gulikaKaal} tone="avoid" />
                  )}
                  {data.yamagandaKaal && (
                    <WindowCard
                      icon={<ShieldAlert size={14} />}
                      label={t("horoscope.panchang.yamagandaKaal")}
                      window={data.yamagandaKaal}
                      tone="avoid"
                    />
                  )}
                  {data.abhijitMuhurta && (
                    <WindowCard
                      icon={<ShieldCheck size={14} />}
                      label={t("horoscope.panchang.abhijitMuhurta")}
                      window={data.abhijitMuhurta}
                      tone="auspicious"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Choghadiya */}
            {data.choghadiya && (
              <CollapsibleSection title={t("horoscope.panchang.choghadiyaTitle")} subtitle={t("horoscope.panchang.choghadiyaSubtitle")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: t("horoscope.panchang.daytime"), periods: data.choghadiya.day },
                    { label: t("horoscope.panchang.nighttime"), periods: data.choghadiya.night },
                  ].map(({ label, periods }) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-2">{label}</p>
                      <div className="space-y-1.5">
                        {periods.map((p, i) => {
                          const active = isCurrentlyActive(p.startTime, p.endTime);
                          const color = p.type === "good" ? "text-emerald-400" : p.type === "bad" ? "text-red-400" : "text-gold";
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                                active ? "bg-gold/10 border border-gold/25" : "bg-surface/30"
                              }`}
                            >
                              <span className={`font-medium ${color}`}>{p.name}</span>
                              <span className="text-muted font-mono">
                                {p.startTime} – {p.endTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Hora */}
            {data.hora && (
              <CollapsibleSection title={t("horoscope.panchang.horaTitle")} subtitle={t("horoscope.panchang.horaSubtitle")}>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.hora.map((h, i) => {
                    const active = isCurrentlyActive(h.startTime, h.endTime);
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          active ? "bg-gold/10 border border-gold/25" : "bg-surface/30"
                        }`}
                      >
                        <span className={`font-medium ${h.isAuspicious ? "text-emerald-400" : "text-foreground"}`}>{h.planet}</span>
                        <span className="text-muted font-mono">
                          {h.startTime} – {h.endTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Regional calendars grid (kept from the original page — other regions at a glance) */}
            {data.regionalMonths && (
              <div>
                <h2 className="text-sm font-display text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-gold" />
                  {t("horoscope.panchang.regionalCalendars")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {regions.map((r) => {
                    const m = data.regionalMonths?.[r];
                    if (!m) return null;
                    return (
                      <Card key={r} className="p-3.5 border-gold/10">
                        <p className="text-[10px] text-muted uppercase tracking-wider">{m.calendar}</p>
                        <p className="text-sm text-foreground font-medium mt-0.5">
                          {m.monthName} {m.year}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Planning to Buy */}
            <Card className="p-4 border-gold/15">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="text-sm font-display text-foreground">{t("horoscope.panchang.planningToBuyTitle")}</p>
                  <p className="text-[11px] text-muted mt-0.5">{t("horoscope.panchang.planningToBuySubtitle")}</p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gold text-[#1a0e00] text-xs font-semibold"
                >
                  {t("horoscope.panchang.planningToBuyTitle")}
                </button>
              </div>
              {plans.length > 0 && <PurchasePlanResults plans={plans} pollingId={pollingId} onPolled={handlePolled} />}
            </Card>

            <p className="flex items-center gap-1.5 text-[10px] text-muted justify-center pt-2">
              <Clock size={11} /> {data.date}
            </p>
          </div>
        )}
      </div>

      <PurchasePlanModal
        isOpen={modalOpen}
        panchangDate={selectedDate}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. Likely spots to fix: `useGeolocation`'s exact return shape for `geo.coords`/`geo.status`/`geo.request` — confirm against `hooks/useGeolocation.ts` and adjust property names if they differ from what the original `app/panchang/page.tsx` used (it used `geo.coords`, `geo.status`, `geo.request()` already, so this should match as-is).

- [ ] **Step 3: Commit**

```bash
git add app/panchang/page.tsx
git commit -m "feat(panchang): rebuild page with choghadiya, hora, monthly calendar, regional info, and Planning to Buy"
```

---

### Task 14: Frontend verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds with no errors (warnings about unused vars etc. are acceptable but should be cleaned up if trivial).

- [ ] **Step 3: Manual dev-server walkthrough**

Run: `npm run dev`, open `http://localhost:3000/panchang` in a browser (signed in as a test user):
- Confirm the five limbs, sunrise/sunset, and Rahu Kaal/Abhijit cards render as before.
- Confirm the region selector switches the calendar info card (month name, paksha, year) when clicked.
- Confirm the monthly calendar renders a full grid, festival emojis show on known festival dates (e.g. navigate to July 2026 and check for Guru Purnima on the 29th... actually verify against the exact dates in `hindu-festivals.ts`), clicking a day updates the "Core five" section below to that date's panchang.
- Expand the Choghadiya section — confirm 8 day + 8 night periods render with correct color coding (good=green, bad=red, neutral=gold).
- Expand the Hora section — confirm 24 entries render.
- Click "Planning to Buy" → pick a category → fill in a booking date only → submit → confirm the modal closes and a "pending"/"processing" card appears in the results list, eventually turning into a "done" card with a score, verdict, and remedies (may take up to ~90s waiting on the LLM call).
- Switch the language selector to at least one non-English language and confirm all the new strings (Choghadiya/Hora section titles, Planning to Buy labels) render translated, not as raw `i18n` keys.

State explicitly in your final report whether each of the above was actually exercised in a browser, since this is the only way to verify feature correctness (typecheck/build only prove the code compiles).

---

## Deploy Phase

### Task 15: Backend — push and deploy to EC2

**Files:** none (git/ops only)

- [ ] **Step 1: Push `main`, then forward-merge it into `dev` and `staging`**

Tasks 1-6 commit directly on whatever branch is checked out in `backend/` — confirmed to be `main` at the start of this plan (`git -C backend branch --show-current` → `main`). So the commits already live on `main`; the remaining work is publishing `main` and bringing `dev`/`staging` forward to match it (not the other way around):
```bash
cd backend
git checkout main
git push origin main
git checkout dev
git merge --no-ff main -m "merge main into dev: panchang feature parity (choghadiya/hora, monthly calendar, purchase-plan)"
git push origin dev
git checkout staging
git merge --no-ff main -m "merge main into staging: panchang feature parity"
git push origin staging
git checkout main
```
Before running this, re-check `git -C backend branch --show-current` — if a different branch is checked out by the time this task runs (e.g. work happened on a feature branch instead), substitute that branch name for `main` in the `push`/`merge` commands above, but the direction (publish first, then forward-merge into `dev`/`staging`) stays the same.

- [ ] **Step 2: Deploy to EC2**

Per [[aroha-backend-architecture]]'s documented deploy steps (adjust the PEM path to whatever the user provides this session):
```bash
tar czf - --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='secrets' --exclude='.env' . | \
  ssh -i "$PEM" ec2-user@13.232.179.137 "tar xzf - -C /home/ec2-user/aroha-backend"
ssh -i "$PEM" ec2-user@13.232.179.137 "cd /home/ec2-user/aroha-backend && npm ci && npm run db:migrate && npm run build && pm2 reload aroha-api && pm2 save"
```
Expected: `npm run db:migrate` applies the new `purchase_plans` migration to the live database (this is the one command in this whole plan that touches production data — confirm the migration file from Task 3 is exactly what's expected before running this).

- [ ] **Step 3: Verify the live deploy**

```bash
curl https://api.arohaastrology.in/healthz
curl https://api.arohaastrology.in/readyz
curl "https://api.arohaastrology.in/v1/panchang?date=2026-07-04" | head -c 500
```
Expected: both health checks pass, and the panchang response includes `choghadiya`/`hora` fields.

---

### Task 16: Frontend — push to main

**Files:** none (git only)

- [ ] **Step 1: Push**

```bash
cd c:\Users\subir\.gemini\antigravity-ide\scratch\aroha-astrology
git push origin main
```
(Vercel auto-deploys on push to `main` per [[aroha-backend-architecture]] — not independently verified this session, so confirm the Vercel dashboard shows a successful deploy after pushing, or ask the user to check.)

- [ ] **Step 2: Post-deploy smoke check**

Once the Vercel deploy finishes, open the production URL's `/panchang` page and repeat a lightweight version of Task 14 Step 3's walkthrough (five limbs load, monthly calendar loads, Planning to Buy modal opens) to confirm the deploy is live and functioning against the now-updated production backend.

---

## Plan self-review notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-04-panchang-parity-design.md` maps to a task above — backend choghadiya/hora (Task 1), `/panchang/month` (Task 2), `purchase_plans` table (Task 3), LLM profile + prompt (Task 4), purchase-plan routes (Task 5), design-system mapping is realized directly in the component code in Tasks 10-13 (Card/gold tokens throughout, no glass-theme styles), i18n (Task 9), deploy (Tasks 15-16).
- **Credits decision:** implemented as a flat 3/24h rate limit (Task 5, `DAILY_PLAN_LIMIT`) per the user's approved "free with cap" choice — no credit-ledger code was added.
- **Type consistency check:** `PurchasePlanCategory`/`AnalyzePurchasePlanBody`/`PurchasePlan`/`PurchasePlanAnalysis` names and shapes are identical across `lib/api.ts` (Task 7), `PurchasePlanModal.tsx` (Task 11), and `PurchasePlanResults.tsx` (Task 12) — all three import from `@/lib/api`, no duplicate/drifted local type definitions.
