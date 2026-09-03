# Report Rating + Low-Rating Refund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user rate a report they just finished reading (prompted by scroll engagement + trying to go back), auto-refund 100% of the price paid when they rate it under 3 stars, and give admins a read-only view of every rating.

**Architecture:** A new `report_ratings` table (one row per user+report, unique-constrained) backs a new `POST /v1/reports/:id/rating` endpoint that inserts the rating and, for ratings under 3, credits the wallet via the existing `addWalletBalance` refund primitive — reusing the exact reason-string format the app's objective-failure refunds already use, so Payment History renders it correctly with zero changes there. On the client, a scroll-gesture counter arms a report page once the user has engaged with it; going back while armed (hardware button or the on-screen arrow) opens a rating sheet instead of navigating, reusing the app's existing `useDismissOnBackPress` back-interception stack. Admins get a read-only `/admin/report-ratings` table mirroring the existing `/admin/report-generations` page.

**Tech Stack:** Next.js App Router (frontend), Hono + `@hono/zod-openapi` + Drizzle ORM/Postgres (backend), Vitest (both).

**Design doc:** `docs/superpowers/specs/2026-09-03-report-rating-and-refund-design.md`

---

## File Structure

**Backend (`backend/src/...`)**
- `db/schema.ts` — add `reportRatings` table
- `db/migrations/0069_report_ratings.sql` — generated migration (via `db:generate`)
- `modules/reports/report-ratings.repo.ts` — new: insert, stamp-refund, admin listing (data access only)
- `modules/reports/report-ratings.schemas.ts` — new: request/response zod schemas
- `modules/reports/report-ratings.service.ts` — new: `rateReport()` business logic (ownership/status checks, refund decision)
- `modules/reports/reports.service.ts` — modify: export `reasonForRow` (was file-private)
- `modules/reports/reports.routes.ts` — modify: add `POST /reports/{id}/rating`
- `modules/admin/admin.schemas.ts` — modify: add `AdminReportRatings*` schemas
- `modules/admin/admin.service.ts` — modify: add `getReportRatings()`
- `modules/admin/admin.routes.ts` — modify: add `GET /admin/report-ratings`
- `test/report-ratings-service.spec.ts` — new

**Frontend (repo root)**
- `lib/report-rating.ts` — new: localStorage "already rated" guard (client-side UX only)
- `lib/report-rating.test.ts` — new
- `lib/reports-api.ts` — modify: add `reportsApi.rate()`
- `lib/admin-api.ts` — modify: add `AdminReportRatingRow` + `listReportRatings()`
- `components/reports/ReportRatingSheet.tsx` — new: the rating modal
- `app/reports/[id]/page.tsx` — modify: scroll-arm + back-interception wiring
- `app/admin/report-ratings/page.tsx` — new: read-only admin table
- `app/admin/layout.tsx` — modify: add nav link
- `i18n/resources.ts` — modify: add `reportRating.{title,prompt,refunded}` × 7 languages

---

### Task 1: `report_ratings` table + migration

**Files:**
- Modify: `backend/src/db/schema.ts` (append after the `userFeedback` table, around line 2382)

- [ ] **Step 1: Add the table to schema.ts**

Insert this block immediately after the `NewUserFeedbackRow` type export (after line 2382, before the `palm_readings` section comment):

```ts
/* -------------------------------------------------------------------------- */
/* report_ratings — per-report star rating; <3 stars auto-refunds 100% of    */
/* what was paid for that specific report. Distinct from user_feedback       */
/* (once-ever, app-wide) — this is repeatable, one row per (user, report).   */
/* -------------------------------------------------------------------------- */

export const reportRatings = pgTable(
  'report_ratings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    /** Nullable — the comment box is optional. Encrypted at rest, same convention as user_feedback.comment. */
    comment: text('comment'),
    /** Set only when this rating (< 3 stars) triggered the automatic refund. */
    refundedPaise: integer('refunded_paise'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userReportUnique: uniqueIndex('report_ratings_user_report_unique').on(table.userId, table.reportId),
    reportIdx: index('report_ratings_report_id_idx').on(table.reportId),
  }),
);

export type ReportRatingRow = typeof reportRatings.$inferSelect;
export type NewReportRatingRow = typeof reportRatings.$inferInsert;
```

- [ ] **Step 2: Generate the migration**

Run (from `backend/`):
```bash
npx drizzle-kit generate --name report_ratings
```
(`--name` avoids drizzle-kit's default randomly-generated filename.) Expected: a new `backend/src/db/migrations/0069_report_ratings.sql` file is created containing a `CREATE TABLE "report_ratings" (...)` statement with the FKs and unique index above, and `meta/_journal.json` gains a matching entry with `"tag": "0069_report_ratings"`. If the next free number isn't 0069 (check `ls backend/src/db/migrations/*.sql | sort | tail -1` first if unsure), that's fine — drizzle-kit picks the real next number itself; just adjust this task's references to "0069" accordingly.

- [ ] **Step 3: Sanity-check the generated SQL**

Read the generated file and confirm it contains `REFERENCES "reports"("id")`, `REFERENCES "users"("id")`, and a `UNIQUE` constraint/index on `(user_id, report_id)`. If drizzle-kit prompts interactively about the new FK (it sometimes asks "create table or rename from...")  answer to create a new table, not rename an existing one.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/migrations/
git commit -m "feat(reports): add report_ratings table"
```

---

### Task 2: `report-ratings.repo.ts` (data access)

**Files:**
- Create: `backend/src/modules/reports/report-ratings.repo.ts`

- [ ] **Step 1: Write the repo file**

```ts
import { count, desc, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { reportRatings, reports, users } from '../../db/schema.js';
import { decryptField, encryptField } from '../../lib/crypto/field-encryption.js';

/** Inserts a rating row. Throws a Postgres unique-violation (SQLSTATE 23505,
 * see lib/db-errors.ts's isUniqueViolation) if this (userId, reportId) pair
 * has already rated — the service layer turns that into a 409. */
export async function insertReportRating(input: {
  userId: string;
  reportId: string;
  rating: number;
  comment?: string;
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(reportRatings)
    .values({
      userId: input.userId,
      reportId: input.reportId,
      rating: input.rating,
      comment: input.comment ? (encryptField(input.comment) as string) : null,
    })
    .returning({ id: reportRatings.id });
  if (!row) throw new Error('insertReportRating: insert returned no row');
  return row;
}

/** Stamps the refunded amount onto an already-inserted rating row, after the
 * wallet credit has actually landed. */
export async function stampRefund(ratingId: string, refundedPaise: number): Promise<void> {
  await db.update(reportRatings).set({ refundedPaise }).where(eq(reportRatings.id, ratingId));
}

export interface AdminReportRatingRow {
  id: string;
  userId: string;
  displayName: string | null;
  phoneE164: string | null;
  reportKey: string;
  rating: number;
  comment: string | null;
  refundedPaise: number | null;
  createdAt: Date;
}

/** Every rating across all users, newest first — powers /admin/report-ratings. */
export async function listAllReportRatings(
  reportKey: string | undefined,
  limit: number,
  offset: number,
): Promise<{ rows: AdminReportRatingRow[]; total: number }> {
  const where = reportKey ? eq(reports.reportKey, reportKey) : undefined;
  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: reportRatings.id,
        userId: reportRatings.userId,
        displayName: users.displayName,
        phoneE164: users.phoneE164,
        reportKey: reports.reportKey,
        rating: reportRatings.rating,
        comment: reportRatings.comment,
        refundedPaise: reportRatings.refundedPaise,
        createdAt: reportRatings.createdAt,
      })
      .from(reportRatings)
      .innerJoin(reports, eq(reports.id, reportRatings.reportId))
      .innerJoin(users, eq(users.id, reportRatings.userId))
      .where(where)
      .orderBy(desc(reportRatings.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(reportRatings)
      .innerJoin(reports, eq(reports.id, reportRatings.reportId))
      .where(where),
  ]);
  return {
    rows: rows.map((row) => ({
      ...row,
      phoneE164: decryptField(row.phoneE164),
      comment: row.comment ? decryptField(row.comment) : null,
    })),
    total: totalRows[0]?.total ?? 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/reports/report-ratings.repo.ts
git commit -m "feat(reports): add report-ratings repo"
```

---

### Task 3: `report-ratings.schemas.ts`

**Files:**
- Create: `backend/src/modules/reports/report-ratings.schemas.ts`

- [ ] **Step 1: Write the schemas**

```ts
import { z } from '@hono/zod-openapi';

export const RateReportBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5).openapi({ example: 4 }),
    comment: z.string().max(2000).optional().openapi({ example: 'Very accurate!' }),
  })
  .strict()
  .openapi('RateReportBody');

export const RateReportResponseSchema = z
  .object({
    id: z.string().uuid(),
    /** Null unless the rating was under 3 stars, in which case this is 100% of
     * what was paid for the report, already credited to the wallet. */
    refundedPaise: z.number().nullable(),
  })
  .openapi('RateReportResponse');
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/reports/report-ratings.schemas.ts
git commit -m "feat(reports): add report-ratings request/response schemas"
```

---

### Task 4: export `reasonForRow`

**Files:**
- Modify: `backend/src/modules/reports/reports.service.ts:194`

- [ ] **Step 1: Add `export`**

Change:
```ts
function reasonForRow(reportKey: string, periodMonth: string | null): string {
```
to:
```ts
export function reasonForRow(reportKey: string, periodMonth: string | null): string {
```

- [ ] **Step 2: Typecheck**

Run (from `backend/`): `npm run typecheck`
Expected: no new errors (this is a pure visibility change).

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/reports/reports.service.ts
git commit -m "refactor(reports): export reasonForRow for reuse by report-ratings"
```

---

### Task 5: `report-ratings.service.ts` — `rateReport()` (TDD)

**Files:**
- Create: `backend/test/report-ratings-service.spec.ts`
- Create: `backend/src/modules/reports/report-ratings.service.ts`

- [ ] **Step 1: Write the failing test file**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// rateReport composes three already-tested primitives (findReportById,
// insertReportRating/stampRefund, addWalletBalance) — mocked here so this
// spec pins only the business rule: ownership/status gating, and refund
// exactly when rating < 3, for exactly the price paid on that report row.

const state = vi.hoisted(() => ({
  findReportById: vi.fn(),
  insertReportRating: vi.fn(),
  stampRefund: vi.fn(),
  addWalletBalance: vi.fn(),
}));

vi.mock('../src/modules/reports/reports.repo.js', () => ({
  findReportById: state.findReportById,
}));

vi.mock('../src/modules/reports/report-ratings.repo.js', () => ({
  insertReportRating: state.insertReportRating,
  stampRefund: state.stampRefund,
}));

vi.mock('../src/modules/users/users.repo.js', () => ({
  addWalletBalance: state.addWalletBalance,
}));

import { rateReport } from '../src/modules/reports/report-ratings.service.js';

const REPORT = {
  id: 'report-1',
  userId: 'user-1',
  reportKey: 'marriage',
  status: 'ready',
  pricePaidPaise: 14900,
  periodMonth: null,
};

beforeEach(() => {
  state.findReportById.mockReset();
  state.insertReportRating.mockReset();
  state.stampRefund.mockReset();
  state.addWalletBalance.mockReset();
  state.findReportById.mockResolvedValue(REPORT);
  state.insertReportRating.mockResolvedValue({ id: 'rating-1' });
});

describe('rateReport', () => {
  it('records a 5-star rating with no refund', async () => {
    const result = await rateReport({ userId: 'user-1', reportId: 'report-1', rating: 5 });
    expect(result).toEqual({ id: 'rating-1', refundedPaise: null });
    expect(state.addWalletBalance).not.toHaveBeenCalled();
    expect(state.stampRefund).not.toHaveBeenCalled();
  });

  it('refunds 100% of the price paid on a 2-star rating', async () => {
    const result = await rateReport({ userId: 'user-1', reportId: 'report-1', rating: 2 });
    expect(result).toEqual({ id: 'rating-1', refundedPaise: 14900 });
    expect(state.addWalletBalance).toHaveBeenCalledWith('user-1', 14900, 'refund:report_unlock:marriage');
    expect(state.stampRefund).toHaveBeenCalledWith('rating-1', 14900);
  });

  it('does not refund a 3-star rating (the boundary)', async () => {
    await rateReport({ userId: 'user-1', reportId: 'report-1', rating: 3 });
    expect(state.addWalletBalance).not.toHaveBeenCalled();
  });

  it('rejects rating a report owned by someone else, as a plain not-found', async () => {
    await expect(
      rateReport({ userId: 'someone-else', reportId: 'report-1', rating: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a report id that does not exist', async () => {
    state.findReportById.mockResolvedValue(undefined);
    await expect(
      rateReport({ userId: 'user-1', reportId: 'nope', rating: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects rating a report that is not ready yet', async () => {
    state.findReportById.mockResolvedValue({ ...REPORT, status: 'generating' });
    await expect(
      rateReport({ userId: 'user-1', reportId: 'report-1', rating: 5 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('turns a duplicate-rating unique violation into a 409', async () => {
    state.insertReportRating.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));
    await expect(
      rateReport({ userId: 'user-1', reportId: 'report-1', rating: 5 }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `backend/`):
```bash
npx vitest run test/report-ratings-service.spec.ts
```
Expected: FAIL — `Cannot find module '../src/modules/reports/report-ratings.service.js'`.

- [ ] **Step 3: Write the implementation**

```ts
import { Errors } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/db-errors.js';
import { findReportById } from './reports.repo.js';
import { reasonForRow } from './reports.service.js';
import { insertReportRating, stampRefund } from './report-ratings.repo.js';
import { addWalletBalance } from '../users/users.repo.js';

/** Ratings at or above this are just feedback; below it, the user gets a
 * full refund — see docs/superpowers/specs/2026-09-03-report-rating-and-refund-design.md. */
const REFUND_BELOW_RATING = 3;

/**
 * Records a per-report rating and, for a rating under 3 stars, immediately
 * refunds 100% of what was paid for THIS report row — reusing the exact
 * `refund:report_unlock:<key>[:<month>]` reason format the objective
 * generation-failure refund already uses (see reports.service.ts), so
 * Payment History's existing isRefund/parseReason logic renders it with no
 * frontend changes.
 *
 * 404 (not 403) for a report owned by someone else — matches GET
 * /reports/{id}'s own "never confirm another user's report exists" stance.
 */
export async function rateReport(input: {
  userId: string;
  reportId: string;
  rating: number;
  comment?: string;
}): Promise<{ id: string; refundedPaise: number | null }> {
  const report = await findReportById(input.reportId);
  if (!report || report.userId !== input.userId) throw Errors.notFound('Report not found');
  if (report.status !== 'ready') throw Errors.conflict('Report is not ready to be rated');

  let row: { id: string };
  try {
    row = await insertReportRating(input);
  } catch (err) {
    if (isUniqueViolation(err)) throw Errors.conflict('This report has already been rated');
    throw err;
  }

  if (input.rating >= REFUND_BELOW_RATING) return { id: row.id, refundedPaise: null };

  const refundedPaise = report.pricePaidPaise;
  await addWalletBalance(
    input.userId,
    refundedPaise,
    `refund:${reasonForRow(report.reportKey, report.periodMonth)}`,
  );
  await stampRefund(row.id, refundedPaise);
  return { id: row.id, refundedPaise };
}
```

- [ ] **Step 4: Run the test again**

Run (from `backend/`):
```bash
npx vitest run test/report-ratings-service.spec.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/reports/report-ratings.service.ts backend/test/report-ratings-service.spec.ts
git commit -m "feat(reports): add rateReport service with auto-refund under 3 stars"
```

---

### Task 6: wire `POST /reports/{id}/rating`

**Files:**
- Modify: `backend/src/modules/reports/reports.routes.ts`

- [ ] **Step 1: Replace the top-of-file import block**

`RateReportBodySchema`/`RateReportResponseSchema` live in `report-ratings.schemas.ts`, not `reports.schemas.ts`, so they need their own import statement rather than merging into the existing one. Replace the whole top-of-file import block (lines 1–25) with:

```ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { requireUser } from '../../middleware/auth.js';
import { resolveActiveProfileContext } from '../birth-profiles/profile-context.js';
import {
  LanguageQuerySchema,
  PreviewReportBodySchema,
  PreviewReportResponseSchema,
  PurchaseReportBodySchema,
  PurchaseReportResponseSchema,
  ReportCatalogueResponseSchema,
  ReportFailedSchema,
  ReportGeneratingSchema,
  ReportHistoryResponseSchema,
  ReportIdParamSchema,
  ReportReadySchema,
  ReportStatsResponseSchema,
} from './reports.schemas.js';
import { RateReportBodySchema, RateReportResponseSchema } from './report-ratings.schemas.js';
import {
  getReportCatalogueForUser,
  getReportForUser,
  getReportHistoryForUser,
  getReportStats,
  previewReport,
  purchaseReport,
} from './reports.service.js';
import { rateReport } from './report-ratings.service.js';
```

- [ ] **Step 2: Add the route**

At the end of the file (after the `getOneRoute` handler, i.e. after the closing `});` that currently ends the file), add:

```ts

/* -------------------------------------------------------------------------- */
/* POST /reports/{id}/rating — rate a finished report                         */
/* -------------------------------------------------------------------------- */

const rateReportRoute = createRoute({
  method: 'post',
  path: '/reports/{id}/rating',
  tags: ['Reports'],
  summary: 'Rate a finished report; a rating under 3 stars triggers an automatic 100% refund to the wallet',
  security: [{ bearerAuth: [] }],
  request: {
    params: ReportIdParamSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: RateReportBodySchema } },
    },
  },
  responses: {
    201: {
      description: 'Rating recorded',
      content: { 'application/json': { schema: RateReportResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('Not found (also returned for a report owned by another user, or one not yet ready to rate)'),
    409: errorResponse('Already rated'),
  },
});

reportsRouter.openapi(rateReportRoute, async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');
  const result = await rateReport({
    userId: user.id,
    reportId: id,
    rating: body.rating,
    ...(body.comment ? { comment: body.comment } : {}),
  });
  return c.json(result, 201);
});
```

- [ ] **Step 3: Typecheck**

Run (from `backend/`): `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Run the full backend test suite**

Run (from `backend/`): `npm run test`
Expected: all passing (including the 7 new `report-ratings-service.spec.ts` tests), no regressions.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/reports/reports.routes.ts
git commit -m "feat(reports): wire POST /v1/reports/:id/rating route"
```

---

### Task 7: admin `GET /admin/report-ratings`

**Files:**
- Modify: `backend/src/modules/admin/admin.schemas.ts`
- Modify: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`

- [ ] **Step 1: Add schemas**

In `admin.schemas.ts`, immediately after `AdminReportGenerationsBulkResponseSchema` (after the block ending around line 256), add:

```ts
/* -------------------------------------------------------------------------- */
/* GET /admin/report-ratings                                                  */
/* -------------------------------------------------------------------------- */

export const AdminReportRatingsQuerySchema = z.object({
  reportKey: z.string().optional().openapi({ description: 'Omit to list every report key' }),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const AdminReportRatingRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string().nullable(),
  phoneE164: z.string().nullable(),
  reportKey: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  refundedPaise: z.number().nullable(),
  createdAt: z.string(),
});

export const AdminReportRatingsResponseSchema = z
  .object({
    ratings: z.array(AdminReportRatingRowSchema),
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
  })
  .openapi('AdminReportRatingsResponse');
```

- [ ] **Step 2: Add the service function**

In `admin.service.ts`, add this import alongside the existing `reports.repo.js` import block (near line 23-29):

```ts
import { listAllReportRatings } from '../reports/report-ratings.repo.js';
```

Then, immediately after `deleteReportGenerationsBulk` (after line 360), add:

```ts

/* -------------------------------------------------------------------------- */
/* Report ratings — every rating across all users                             */
/* -------------------------------------------------------------------------- */

export async function getReportRatings(
  reportKey: string | undefined,
  limit: number,
  offset: number,
) {
  const { rows, total } = await listAllReportRatings(reportKey, limit, offset);
  const ratings = rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  return { ratings, total, offset, limit };
}
```

- [ ] **Step 3: Add the route**

In `admin.routes.ts`, add to the existing schema import block (alongside `AdminReportGenerationsBulkResponseSchema`):

```ts
  AdminReportRatingsQuerySchema,
  AdminReportRatingsResponseSchema,
```

and to the existing service import block (alongside `deleteReportGenerationsBulk`):

```ts
  getReportRatings,
```

Then, after the `deleteReportGenerationsBulkRoute` handler block (search for `/* POST /admin/report-generations/delete-all */` and its handler — add immediately after that handler's closing `});`), add:

```ts

/* -------------------------------------------------------------------------- */
/* GET /admin/report-ratings — every report rating, newest first              */
/* -------------------------------------------------------------------------- */

const reportRatingsRoute = createRoute({
  method: 'get',
  path: '/admin/report-ratings',
  tags: ['Admin'],
  summary: 'Every report rating across all users, newest first, optionally filtered to one report key',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  request: { query: AdminReportRatingsQuerySchema },
  responses: {
    200: {
      description: 'Report rating rows',
      content: { 'application/json': { schema: AdminReportRatingsResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminRouter.openapi(reportRatingsRoute, async (c) => {
  const { reportKey, offset, limit } = c.req.valid('query');
  const page = await getReportRatings(reportKey, limit, offset);
  await auditRead(c, 'GET /v1/admin/report-ratings', { reportKey, offset, limit });
  return c.json(page, 200);
});
```

- [ ] **Step 4: Typecheck and test**

Run (from `backend/`):
```bash
npm run typecheck
npm run test
```
Expected: no errors, all tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/admin/admin.schemas.ts backend/src/modules/admin/admin.service.ts backend/src/modules/admin/admin.routes.ts
git commit -m "feat(admin): add GET /v1/admin/report-ratings"
```

---

### Task 8: `lib/report-rating.ts` (TDD)

**Files:**
- Create: `lib/report-rating.test.ts`
- Create: `lib/report-rating.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, beforeEach, vi } from "vitest";

// Same in-memory localStorage stub as lib/app-review.test.ts — this project
// has no jsdom (see vitest.config.ts), and this module only ever touches
// localStorage.getItem/setItem.
function makeLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

vi.stubGlobal("window", { localStorage: makeLocalStorageStub() });

const { hasRatedReport, markReportRated } = await import("./report-rating");

describe("report-rating", () => {
  beforeEach(() => {
    (window as unknown as { localStorage: Storage }).localStorage.clear();
  });

  it("is false for a report that was never rated", () => {
    expect(hasRatedReport("report-1")).toBe(false);
  });

  it("becomes true after marking that report rated", () => {
    markReportRated("report-1");
    expect(hasRatedReport("report-1")).toBe(true);
  });

  it("does not mark an unrelated report", () => {
    markReportRated("report-1");
    expect(hasRatedReport("report-2")).toBe(false);
  });

  it("accumulates multiple rated reports", () => {
    markReportRated("report-1");
    markReportRated("report-2");
    expect(hasRatedReport("report-1")).toBe(true);
    expect(hasRatedReport("report-2")).toBe(true);
  });

  it("does not duplicate an id marked twice", () => {
    markReportRated("report-1");
    markReportRated("report-1");
    const raw = window.localStorage.getItem("aroha:ratedReports:v1");
    expect(JSON.parse(raw ?? "[]")).toEqual(["report-1"]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from repo root):
```bash
npx vitest run lib/report-rating.test.ts
```
Expected: FAIL — `Cannot find module './report-rating'`.

- [ ] **Step 3: Write the implementation**

```ts
const RATED_KEY = "aroha:ratedReports:v1";

/**
 * Whether this report has already had a rating submitted from this device —
 * so the scroll+back trigger on the report page doesn't re-arm on a later
 * visit. Purely a UX nicety: the real guard against rating (and refunding)
 * the same report twice is the backend's unique(user_id, report_id)
 * constraint, not this — localStorage is trivially cleared.
 */
export function hasRatedReport(reportId: string): boolean {
  try {
    const raw = window.localStorage.getItem(RATED_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) && ids.includes(reportId);
  } catch {
    return false;
  }
}

export function markReportRated(reportId: string): void {
  try {
    const raw = window.localStorage.getItem(RATED_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(ids) ? (ids as string[]) : [];
    if (!list.includes(reportId)) {
      window.localStorage.setItem(RATED_KEY, JSON.stringify([...list, reportId]));
    }
  } catch {
    // localStorage unavailable — the modal may re-arm next visit, harmless.
  }
}
```

- [ ] **Step 4: Run the test again**

Run (from repo root):
```bash
npx vitest run lib/report-rating.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/report-rating.ts lib/report-rating.test.ts
git commit -m "feat(reports): add client-side rated-report tracking"
```

---

### Task 9: `reportsApi.rate()`

**Files:**
- Modify: `lib/reports-api.ts`

- [ ] **Step 1: Add the response type and method**

Add this interface near the top, after `ReportDetailResult`-related types (anywhere before the `reportsApi` object, e.g. right before line 196's `export const reportsApi = {`):

```ts
export interface RateReportResponse {
  id: string;
  /** Non-null only when the rating was under 3 stars — 100% of what was paid
   * for this report, already credited to the wallet. */
  refundedPaise: number | null;
}
```

Then add a method to the `reportsApi` object, after `history` (the last entry, currently ending the object at line 221-222):

```ts
  /** Rate a finished report. A rating under 3 stars auto-refunds 100% of what
   * was paid for it — reflected in `refundedPaise`. Throws ApiError: 404 if
   * the report doesn't belong to the caller or isn't ready yet, 409 if it's
   * already been rated. */
  rate: (id: string, body: { rating: number; comment?: string }) =>
    request<RateReportResponse>(`/v1/reports/${id}/rating`, { method: "POST", body, auth: true }),
```

- [ ] **Step 2: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/reports-api.ts
git commit -m "feat(reports): add reportsApi.rate() client"
```

---

### Task 10: i18n keys

**Files:**
- Modify: `i18n/resources.ts` (7 insertion points, one per language, each immediately after that language's `feedback: { ... }` block)

- [ ] **Step 1: Add the `en` block**

After the `en` language's `feedback: { ... }` block (currently lines 1946-1953), insert:

```ts
      reportRating: {
        title: "Rate this report",
        prompt: "How was this report?",
        refunded: "We're sorry to hear that — {{amount}} has been added to your wallet.",
      },
```

- [ ] **Step 2: Add the `hi` (Hindi) block**

After that language's `feedback` block (currently lines 3952-3959), insert:

```ts
      reportRating: {
        title: "इस रिपोर्ट को रेट करें",
        prompt: "यह रिपोर्ट कैसी थी?",
        refunded: "यह सुनकर खेद है — {{amount}} आपके वॉलेट में जोड़ दिया गया है।",
      },
```

- [ ] **Step 3: Add the `bn` (Bengali) block**

After that language's `feedback` block (currently lines 6200-6207), insert:

```ts
      reportRating: {
        title: "এই রিপোর্টটি রেট করুন",
        prompt: "এই রিপোর্টটি কেমন ছিল?",
        refunded: "এটা শুনে দুঃখিত — {{amount}} আপনার ওয়ালেটে যোগ করা হয়েছে।",
      },
```

- [ ] **Step 4: Add the `mr` (Marathi) block**

After that language's `feedback` block (currently lines 8447-8454), insert:

```ts
      reportRating: {
        title: "या अहवालाला रेट करा",
        prompt: "हा अहवाल कसा होता?",
        refunded: "हे ऐकून वाईट वाटले — {{amount}} तुमच्या वॉलेटमध्ये जमा करण्यात आले आहे.",
      },
```

- [ ] **Step 5: Add the `te` (Telugu) block**

After that language's `feedback` block (currently lines 10691-10698), insert:

```ts
      reportRating: {
        title: "ఈ నివేదికను రేట్ చేయండి",
        prompt: "ఈ నివేదిక ఎలా ఉంది?",
        refunded: "ఇది వినడానికి చింతిస్తున్నాము — {{amount}} మీ వాలెట్‌కు జోడించబడింది.",
      },
```

- [ ] **Step 6: Add the `ta` (Tamil) block**

After that language's `feedback` block (currently lines 12939-12946), insert:

```ts
      reportRating: {
        title: "இந்த அறிக்கையை மதிப்பிடுங்கள்",
        prompt: "இந்த அறிக்கை எப்படி இருந்தது?",
        refunded: "இதைக் கேட்டு வருந்துகிறோம் — {{amount}} உங்கள் வாலட்டில் சேர்க்கப்பட்டுள்ளது.",
      },
```

- [ ] **Step 7: Add the `gu` (Gujarati) block**

After that language's `feedback` block (currently lines 15184-15191), insert:

```ts
      reportRating: {
        title: "આ રિપોર્ટને રેટ કરો",
        prompt: "આ રિપોર્ટ કેવો રહ્યો?",
        refunded: "આ સાંભળીને દુઃખ થયું — {{amount}} તમારા વૉલેટમાં ઉમેરવામાં આવ્યા છે.",
      },
```

(Note: `commentPlaceholder`, `submit`, and `starLabel` are deliberately reused from the existing `feedback.*` keys in the component below — their copy is generic enough to apply to a report rating too, so no new keys are needed for those.)

- [ ] **Step 8: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors (this file is plain TS object literals — a syntax mistake would show up as a parse error here).

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(i18n): add reportRating.* keys for all 7 languages"
```

---

### Task 11: `ReportRatingSheet` component

**Files:**
- Create: `components/reports/ReportRatingSheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useAuth } from "@/providers/auth-provider";
import { reportsApi } from "@/lib/reports-api";
import { formatRupees } from "@/lib/format";
import { markReportRated } from "@/lib/report-rating";

/**
 * Per-report rating — distinct from FeedbackSheet's once-ever, app-wide
 * rating. A rating under 3 stars triggers an automatic 100% refund on the
 * backend; when that happens we show it before letting the caller's onClose
 * (which resumes the pending back-navigation) run, since money silently
 * landing in the wallet with no explanation would read as a bug.
 */
export default function ReportRatingSheet({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refundedPaise, setRefundedPaise] = useState<number | null>(null);

  useDismissOnBackPress(true, onClose);

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      const res = await reportsApi.rate(reportId, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      markReportRated(reportId);
      if (res.refundedPaise) {
        void refresh();
        setRefundedPaise(res.refundedPaise);
      } else {
        onClose();
      }
    } catch {
      // Nothing actionable for the user, and losing one rating isn't worth an
      // error state — close as if it landed, same idiom as FeedbackSheet.
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={<h2 className="text-base font-display text-foreground">{t("reportRating.title")}</h2>}
    >
      {refundedPaise !== null ? (
        <div className="py-4 text-center">
          <p className="text-sm text-foreground mb-4">
            {t("reportRating.refunded", { amount: formatRupees(refundedPaise) })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 mb-5">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={t("feedback.starLabel", { n })}
                  aria-pressed={rating === n}
                  className="p-1"
                >
                  <Star size={30} className={n <= rating ? "text-gold fill-gold" : "text-muted/40"} />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted text-center">{t("reportRating.prompt")}</p>
          </div>

          {rating > 0 && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={t("feedback.commentPlaceholder")}
              className="w-full rounded-2xl border border-gold/20 bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted/60 resize-none outline-none focus:border-gold/50"
            />
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!rating || submitting}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-40"
          >
            {t("feedback.submit")}
          </button>
        </>
      )}
    </BottomSheetModal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/reports/ReportRatingSheet.tsx
git commit -m "feat(reports): add ReportRatingSheet modal"
```

---

### Task 12: wire the scroll+back trigger into the report page

**Files:**
- Modify: `app/reports/[id]/page.tsx`

- [ ] **Step 1: Update imports**

Change line 3 from:
```tsx
import { useEffect, useLayoutEffect } from "react";
```
to:
```tsx
import { useEffect, useLayoutEffect, useState } from "react";
```

Add these two new imports after the existing `import { maybeRequestReview, markReportGeneratedForReview } from "@/lib/app-review";` line (line 28):
```tsx
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import ReportRatingSheet from "@/components/reports/ReportRatingSheet";
import { hasRatedReport } from "@/lib/report-rating";
```

- [ ] **Step 2: Add the arm/trigger logic**

Immediately after `const ready = state === "ready" && !!data;` (line 67), insert:

```tsx
  // A report becomes "armed" once the user has scrolled a couple of times —
  // a proxy for having actually engaged with the content, not just tapped in
  // and bounced. While armed, going back (hardware button or the on-screen
  // arrow below) opens the rating sheet instead of navigating; the sheet's
  // own onClose then performs the real router.back().
  const ARM_AFTER_SCROLLS = 2;
  const [scrollCount, setScrollCount] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let n = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        n += 1;
        setScrollCount(n);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ready]);

  const armed = ready && scrollCount >= ARM_AFTER_SCROLLS && !hasRatedReport(id);

  useDismissOnBackPress(armed && !showRatingModal, () => setShowRatingModal(true));

  const attemptBack = () => {
    if (armed && !showRatingModal) {
      setShowRatingModal(true);
      return;
    }
    router.back();
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    router.back();
  };
```

- [ ] **Step 3: Route both back affordances through `attemptBack`**

Change (around line 170):
```tsx
          <ReportHero
            title={title}
            onBack={() => router.back()}
```
to:
```tsx
          <ReportHero
            title={title}
            onBack={attemptBack}
```

Change (around line 178):
```tsx
            <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
```
to:
```tsx
            <IconButton onClick={attemptBack} aria-label={t("common.back")}>
```

- [ ] **Step 4: Render the modal**

Immediately before the final `</div>` that closes the `px-5 pt-4 max-w-lg mx-auto space-y-4` wrapper (i.e., right after the closing of the `{state === "ready" && data && !designed && ( ... )}` block, before that wrapper `</div>`), add:

```tsx
        {showRatingModal && <ReportRatingSheet reportId={id} onClose={closeRatingModal} />}
```

So the tail of the file reads:

```tsx
        {state === "ready" && data && !designed && (
          <>
            {/* ...existing content unchanged... */}
          </>
        )}

        {showRatingModal && <ReportRatingSheet reportId={id} onClose={closeRatingModal} />}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual smoke test**

Run (from repo root): `npm run dev`, sign in, open any already-purchased report at `/reports/<id>`, scroll down 2-3 times, then tap the back arrow. Expected: the rating sheet opens instead of navigating away. Submit a 5-star rating — expected: sheet closes and you land back on the previous page (no refund message). Repeat on a different already-rated-once report with a fresh browser profile (or clear `localStorage`'s `aroha:ratedReports:v1` key) rating it 2 stars — expected: a "refunded to your wallet" message appears before closing, and the wallet balance shown elsewhere in the app increases.

- [ ] **Step 7: Commit**

```bash
git add app/reports/[id]/page.tsx
git commit -m "feat(reports): arm rating sheet on scroll+back for a finished report"
```

---

### Task 13: admin API client

**Files:**
- Modify: `lib/admin-api.ts`

- [ ] **Step 1: Add the row/response types**

After the `AdminReportGenerationsResponse` interface (after line 193), add:

```ts
// ─── Report ratings ─────────────────────────────────────────────────────────

export interface AdminReportRatingRow {
  id: string;
  userId: string;
  displayName: string | null;
  phoneE164: string | null;
  reportKey: string;
  rating: number;
  comment: string | null;
  refundedPaise: number | null;
  createdAt: string;
}

export interface AdminReportRatingsResponse {
  ratings: AdminReportRatingRow[];
  total: number;
  offset: number;
  limit: number;
}
```

- [ ] **Step 2: Add the client method**

After `deleteReportGenerationsAll` (after line 502), add:

```ts
  /** Every report rating across all users, newest first, optionally filtered to one report key. */
  listReportRatings: (params: { reportKey?: string; offset?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.reportKey) qs.set("reportKey", params.reportKey);
    qs.set("offset", String(params.offset ?? 0));
    qs.set("limit", String(params.limit ?? 50));
    return request<AdminReportRatingsResponse>(`/v1/admin/report-ratings?${qs.toString()}`, { auth: true });
  },
```

- [ ] **Step 3: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/admin-api.ts
git commit -m "feat(admin): add listReportRatings client"
```

---

### Task 14: admin report-ratings page

**Files:**
- Create: `app/admin/report-ratings/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminReportRatingRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReportRatingsPage() {
  const [rows, setRows] = useState<AdminReportRatingRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<string>("");

  const fetchRows = useCallback((reportKey: string) => {
    setLoading(true);
    setError(null);
    adminApi
      .listReportRatings({ reportKey: reportKey || undefined, limit: 200 })
      .then((res) => {
        setRows(res.ratings);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report ratings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows(filterKey);
  }, [fetchRows, filterKey]);

  // Every report key seen across the unfiltered load — same idiom as
  // /admin/report-generations, so the dropdown doesn't collapse to one
  // option once a filter narrows `rows`.
  const [allKeys, setAllKeys] = useState<string[]>([]);
  useEffect(() => {
    if (filterKey === "" && rows) {
      setAllKeys(Array.from(new Set(rows.map((r) => r.reportKey))).sort());
    }
  }, [filterKey, rows]);

  const reportKeyOptions = useMemo(() => allKeys, [allKeys]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Report Ratings</h1>
      <p className="text-sm text-muted mb-4">Every rating a user has left on a report — a rating under 3 stars auto-refunds 100% of the price paid, shown in the Refunded column.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
        >
          <option value="">All report keys</option>
          {reportKeyOptions.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      {loading && !rows && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={() => fetchRows(filterKey)} />}

      {rows && !error && (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No ratings found.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Report</th>
                    <th className="px-4 py-2 font-medium">Stars</th>
                    <th className="px-4 py-2 font-medium">Comment</th>
                    <th className="px-4 py-2 font-medium">Refunded</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">
                        {r.displayName ?? "—"} <span className="text-muted text-xs">{r.phoneE164 ?? r.userId}</span>
                      </td>
                      <td className="px-4 py-2 text-foreground">{r.reportKey}</td>
                      <td className="px-4 py-2 text-foreground">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                      <td className="px-4 py-2 text-muted max-w-xs truncate">{r.comment ?? "—"}</td>
                      <td className="px-4 py-2">
                        {r.refundedPaise ? (
                          <span className="text-red-400">{formatRupees(r.refundedPaise)}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > rows.length && (
            <p className="text-xs text-muted mt-2">Showing {rows.length} of {total} — narrow with a report filter to see the rest.</p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run (from repo root): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/report-ratings/page.tsx
git commit -m "feat(admin): add /admin/report-ratings page"
```

---

### Task 15: admin nav link

**Files:**
- Modify: `app/admin/layout.tsx:44-55`

- [ ] **Step 1: Add the link**

Change:
```tsx
const SECTIONS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/active-users", label: "Active Users" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/gift-campaigns", label: "Gift Campaigns" },
  { href: "/admin/report-generations", label: "Report Generations" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/deletion-requests", label: "Deletion Requests" },
];
```
to:
```tsx
const SECTIONS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/features", label: "Features" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/active-users", label: "Active Users" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/gift-campaigns", label: "Gift Campaigns" },
  { href: "/admin/report-generations", label: "Report Generations" },
  { href: "/admin/report-ratings", label: "Report Ratings" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/deletion-requests", label: "Deletion Requests" },
];
```

- [ ] **Step 2: Manual check**

Run (from repo root): `npm run dev`, sign in as an admin, open `/admin`. Expected: "Report Ratings" appears in the nav bar and the page loads (empty table until Task 12's flow produces a rating).

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add Report Ratings to admin nav"
```

---

### Task 16: end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run (from `backend/`):
```bash
npm run typecheck
npm run test
```
Expected: no errors, all tests passing.

- [ ] **Step 2: Full frontend typecheck + unit tests**

Run (from repo root):
```bash
npx tsc --noEmit
npx vitest run lib/report-rating.test.ts
```
Expected: no errors, tests passing.

- [ ] **Step 3: End-to-end manual pass**

With both dev servers running (backend + `npm run dev` at root):
1. As a normal user, purchase or open an already-purchased report, scroll 2-3 times, tap back → rating sheet appears.
2. Submit 5 stars → sheet closes, no refund message, lands on the previous page.
3. Open a *different* report the same user hasn't rated yet, scroll, go back, submit 1 star → refund message shows the correct rupee amount (matching that report's price), wallet balance updates.
4. Check `/settings/history` (Payment History) → the refund appears as "Refund" with the correct amount and date.
5. As an admin, open `/admin/report-ratings` → both ratings appear, the 1-star row shows the refunded amount in the Refunded column, the 5-star row shows "—".
6. Re-open the 5-star-rated report, scroll, go back → the sheet does **not** re-arm (already rated, tracked in localStorage) — back navigates normally.

- [ ] **Step 4: Report results**

No commit for this task — it's verification only. If any step fails, return to the relevant task, fix, and re-run this task's checks.
