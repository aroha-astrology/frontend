# Festival Gift Campaigns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin create, target, schedule, and send wallet-credit gift campaigns (festivals or custom occasions) entirely from the admin panel — no developer deploy per campaign.

**Architecture:** A new `gift_campaigns` DB table + two new nullable columns on `wallet_transactions` (`expires_at`/`expired_at`) back a `gift-campaigns` backend module (repo + service) reused by three surfaces: the existing generic claim-bonus route (extended to check DB campaigns, not just the static array), a new admin CRUD+send route, and a new daily cron sweep (fires due scheduled sends, claws back expired grants). The frontend's per-campaign hardcoded modal (`TopUpBonusPrompt.tsx` + `useClaimCampaign.ts`) is replaced by one generic modal driven by a new `activeClaimableCampaign` field on `GET /v1/me`.

**Tech Stack:** Hono + `@hono/zod-openapi`, Drizzle ORM (Postgres), hand-written SQL migrations, Vitest (mocked-repo service tests), Next.js/React frontend, i18next.

**Full design context:** [`docs/superpowers/specs/2026-08-20-festival-gift-campaigns-design.md`](../specs/2026-08-20-festival-gift-campaigns-design.md) — read it first if anything below is unclear on *why*.

---

## Working directories

- Backend: `backend/` (relative to repo root — this is a real separate git repo nested in the frontend checkout)
- Frontend: repo root (`app/`, `components/`, `lib/`, `hooks/`, `i18n/`)
- Run backend tests from `backend/`: `npm test` (= `vitest run`)
- Run backend build from `backend/`: `npm run build` (tsc — confirms no type errors)
- Run frontend build from repo root: `npm run build`

---

### Task 1: Migration 0057 — `gift_campaigns` table + wallet expiry columns

**Files:**
- Create: `backend/src/db/migrations/0057_gift_campaigns.sql`

Migrations in this repo are **hand-written**, not `drizzle-kit generate`d (the on-disk snapshot is stale past 0049 — see the header comment in `0056_remedy_insights.sql`). Follow that file's idiom exactly: `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` for enums, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- gift_campaigns — admin-managed festival/occasion wallet-credit campaigns
-- =============================================================================
-- Replaces per-festival developer deploys (the old CLAIM_CAMPAIGNS array in
-- config/campaigns.ts, left untouched for its 3 historical entries) with an
-- admin-panel-driven table. Two delivery modes: self_claim (user taps a claim
-- button in the app — reuses the existing claim-bonus route/ledger idempotency)
-- and auto_credit (wallet is credited directly by the send/cron path, no user
-- action). `valid_from`/`valid_until` are stamped at send time from
-- `claim_window_days` — see gift-campaigns.service.ts.
--
-- wallet_transactions gains expires_at/expired_at so a gift can optionally
-- claw itself back if unspent — see gift-campaign-sweep.service.ts. This is
-- an approximation (LEAST(delta, current balance), no per-rupee spend
-- ordering), documented in the design spec.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE "gift_campaign_delivery_mode" AS ENUM ('self_claim', 'auto_credit');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "gift_campaign_status" AS ENUM ('draft', 'scheduled', 'sent', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "gift_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "title" text NOT NULL,
  "amount_paise" integer NOT NULL,
  "audience_max_balance_paise" integer,
  "delivery_mode" "gift_campaign_delivery_mode" NOT NULL,
  "claim_window_days" integer,
  "credit_expiry_days" integer,
  "scheduled_send_at" timestamp with time zone,
  "status" "gift_campaign_status" NOT NULL DEFAULT 'draft',
  "valid_from" timestamp with time zone,
  "valid_until" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "gift_campaigns_key_unique" ON "gift_campaigns" ("key");
CREATE INDEX IF NOT EXISTS "gift_campaigns_status_idx" ON "gift_campaigns" ("status");

ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "expired_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "wallet_transactions_expires_at_idx"
  ON "wallet_transactions" ("expires_at")
  WHERE "expires_at" IS NOT NULL AND "expired_at" IS NULL;
```

- [ ] **Step 2: Apply it against your local/dev database**

Run (from `backend/`): `npm run db:migrate`
Expected: no errors; `psql` (or `db:studio`) shows `gift_campaigns` exists and `wallet_transactions` has `expires_at`/`expired_at`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/migrations/0057_gift_campaigns.sql
git commit -m "feat(db): add gift_campaigns table and wallet_transactions expiry columns"
```

---

### Task 2: Drizzle schema — `giftCampaigns` table + `walletTransactions` expiry columns

**Files:**
- Modify: `backend/src/db/schema.ts`

- [ ] **Step 1: Add the two enums and the table**, placed near `walletTransactions` (after its closing `);` at what is currently line 636):

```typescript
export const giftCampaignDeliveryModeEnum = pgEnum('gift_campaign_delivery_mode', [
  'self_claim',
  'auto_credit',
]);

export const giftCampaignStatusEnum = pgEnum('gift_campaign_status', [
  'draft',
  'scheduled',
  'sent',
  'canceled',
]);

export const giftCampaigns = pgTable(
  'gift_campaigns',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: text('key').notNull(),
    title: text('title').notNull(),
    amountPaise: integer('amount_paise').notNull(),
    audienceMaxBalancePaise: integer('audience_max_balance_paise'),
    deliveryMode: giftCampaignDeliveryModeEnum('delivery_mode').notNull(),
    claimWindowDays: integer('claim_window_days'),
    creditExpiryDays: integer('credit_expiry_days'),
    scheduledSendAt: timestamp('scheduled_send_at', { withTimezone: true }),
    status: giftCampaignStatusEnum('status').notNull().default('draft'),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    keyUnique: uniqueIndex('gift_campaigns_key_unique').on(table.key),
    statusIdx: index('gift_campaigns_status_idx').on(table.status),
  }),
);

export type GiftCampaignRow = typeof giftCampaigns.$inferSelect;
export type NewGiftCampaignRow = typeof giftCampaigns.$inferInsert;
```

- [ ] **Step 2: Add the two columns to the existing `walletTransactions` table** (the object at line 617-636) — change:

```typescript
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index('wallet_transactions_user_id_idx').on(table.userId),
  }),
);
```

to:

```typescript
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    expiredAt: timestamp('expired_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('wallet_transactions_user_id_idx').on(table.userId),
  }),
);
```

- [ ] **Step 3: Type-check**

Run (from `backend/`): `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts
git commit -m "feat(db): add giftCampaigns Drizzle schema and wallet expiry columns"
```

---

### Task 3: `gift-campaigns.repo.ts` — key generation (TDD) + CRUD

**Files:**
- Create: `backend/src/modules/gift-campaigns/gift-campaigns.repo.ts`
- Test: `backend/test/gift-campaigns-key.spec.ts`

`generateCampaignKey` is pure and worth testing directly — everything else in this file is thin CRUD, following the same convention as `user-groups.repo.ts` (no dedicated repo-level spec; exercised indirectly via the service-layer tests in Task 5/6).

- [ ] **Step 1: Write the failing test for key generation**

```typescript
import { describe, expect, it } from 'vitest';
import { generateCampaignKey } from '../src/modules/gift-campaigns/gift-campaigns.repo.js';

describe('generateCampaignKey', () => {
  it('slugifies the title and appends a random suffix', () => {
    const key = generateCampaignKey('Diwali 2026!');
    expect(key).toMatch(/^diwali_2026_[a-f0-9]{8}$/);
  });

  it('never contains a colon (wallet_transactions.reason constraint)', () => {
    expect(generateCampaignKey('A: Weird Title')).not.toContain(':');
  });

  it('produces different keys for the same title', () => {
    const a = generateCampaignKey('Lohri');
    const b = generateCampaignKey('Lohri');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/gift-campaigns-key.spec.ts`
Expected: FAIL — module `gift-campaigns.repo.ts` does not exist.

- [ ] **Step 3: Write the repo file**

```typescript
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { giftCampaigns, type GiftCampaignRow, type NewGiftCampaignRow } from '../../db/schema.js';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/** `_` + 8 hex chars makes a title-collision astronomically unlikely without a DB round-trip to check. */
export function generateCampaignKey(title: string): string {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);
  return `${slugify(title)}_${suffix}`;
}

export interface CreateGiftCampaignRow {
  key: string;
  title: string;
  amountPaise: number;
  audienceMaxBalancePaise: number | null;
  deliveryMode: 'self_claim' | 'auto_credit';
  claimWindowDays: number | null;
  creditExpiryDays: number | null;
  scheduledSendAt: Date | null;
  status: 'draft' | 'scheduled';
  createdBy: string;
}

export async function insertGiftCampaign(input: CreateGiftCampaignRow): Promise<GiftCampaignRow> {
  const [row] = await db.insert(giftCampaigns).values(input satisfies NewGiftCampaignRow).returning();
  return row!;
}

export async function listGiftCampaigns(): Promise<GiftCampaignRow[]> {
  return db.select().from(giftCampaigns).orderBy(giftCampaigns.createdAt);
}

export async function getGiftCampaignById(id: string): Promise<GiftCampaignRow | undefined> {
  const [row] = await db.select().from(giftCampaigns).where(eq(giftCampaigns.id, id)).limit(1);
  return row;
}

export async function getGiftCampaignByKey(key: string): Promise<GiftCampaignRow | undefined> {
  const [row] = await db.select().from(giftCampaigns).where(eq(giftCampaigns.key, key)).limit(1);
  return row;
}

/** Returns true if a row was actually canceled (still draft/scheduled); false if already sent/canceled. */
export async function cancelGiftCampaignIfPending(id: string): Promise<boolean> {
  const rows = await db
    .update(giftCampaigns)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(
      and(
        eq(giftCampaigns.id, id),
        and(
          eq(giftCampaigns.status, 'draft'),
        ),
      ),
    )
    .returning({ id: giftCampaigns.id });
  if (rows.length > 0) return true;

  const rowsScheduled = await db
    .update(giftCampaigns)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(and(eq(giftCampaigns.id, id), eq(giftCampaigns.status, 'scheduled')))
    .returning({ id: giftCampaigns.id });
  return rowsScheduled.length > 0;
}

export async function markGiftCampaignSent(
  id: string,
  fields: { sentAt: Date; validFrom: Date; validUntil: Date | null },
): Promise<void> {
  await db
    .update(giftCampaigns)
    .set({ status: 'sent', ...fields, updatedAt: new Date() })
    .where(eq(giftCampaigns.id, id));
}

/** Scheduled campaigns whose fire time has arrived — swept by the daily cron. */
export async function findDueScheduledCampaigns(now: Date): Promise<GiftCampaignRow[]> {
  return db
    .select()
    .from(giftCampaigns)
    .where(
      and(
        eq(giftCampaigns.status, 'scheduled'),
        lt(giftCampaigns.scheduledSendAt, now),
        isNull(giftCampaigns.sentAt),
      ),
    );
}
```

`cancelGiftCampaignIfPending`'s two-query shape is a bit awkward — Drizzle's `.where()` doesn't have a clean `status IN (...)` combinator alongside `eq(id)` without importing `inArray`, so simplify: replace both blocks with one `inArray` call.

- [ ] **Step 4: Simplify Step 3's cancel function using `inArray`**

```typescript
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
```

```typescript
export async function cancelGiftCampaignIfPending(id: string): Promise<boolean> {
  const rows = await db
    .update(giftCampaigns)
    .set({ status: 'canceled', updatedAt: new Date() })
    .where(and(eq(giftCampaigns.id, id), inArray(giftCampaigns.status, ['draft', 'scheduled'])))
    .returning({ id: giftCampaigns.id });
  return rows.length > 0;
}
```

- [ ] **Step 5: Run the key-generation test to see it pass**

Run: `cd backend && npx vitest run test/gift-campaigns-key.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaigns.repo.ts backend/test/gift-campaigns-key.spec.ts
git commit -m "feat(gift-campaigns): repo layer — key generation and CRUD"
```

---

### Task 4: `gift-campaigns.repo.ts` — audience resolution + expiry-sweep queries

**Files:**
- Modify: `backend/src/modules/gift-campaigns/gift-campaigns.repo.ts`

- [ ] **Step 1: Add audience resolution**, appended to the file (new imports: `isNull` already imported, add `users`, `walletTransactions` from schema):

```typescript
import { users, walletTransactions } from '../../db/schema.js';
```

```typescript
export interface AudienceMember {
  userId: string;
  walletBalancePaise: number;
  locale: string | null;
  createdAt: Date;
}

/**
 * Every non-anonymized user, optionally capped to wallets strictly under
 * `maxBalancePaise` (null = everyone). Pushable-vs-total is computed by the
 * caller (gift-campaigns.service.ts) by cross-referencing
 * device-tokens.repo.ts's getAllActiveTokens() — kept out of this query so
 * the "what counts as an active token" definition lives in exactly one place.
 */
export async function resolveAudience(maxBalancePaise: number | null): Promise<AudienceMember[]> {
  return db
    .select({
      userId: users.id,
      walletBalancePaise: users.walletBalancePaise,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      maxBalancePaise !== null
        ? and(isNull(users.anonymizedAt), lt(users.walletBalancePaise, maxBalancePaise))
        : isNull(users.anonymizedAt),
    );
}
```

- [ ] **Step 2: Add the expiry-sweep queries**

```typescript
export interface DueExpiredGrant {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  currentBalancePaise: number;
}

export async function findDueExpiredGrants(now: Date): Promise<DueExpiredGrant[]> {
  return db
    .select({
      id: walletTransactions.id,
      userId: walletTransactions.userId,
      delta: walletTransactions.delta,
      reason: walletTransactions.reason,
      currentBalancePaise: users.walletBalancePaise,
    })
    .from(walletTransactions)
    .innerJoin(users, eq(users.id, walletTransactions.userId))
    .where(
      and(
        lt(walletTransactions.expiresAt, now),
        isNull(walletTransactions.expiredAt),
      ),
    );
}

/**
 * Deducts `clawbackPaise` from the user's wallet, logs the reversal as its
 * own wallet_transactions row (reason = `${originalReason}_expired`), and
 * marks the original grant `expired_at` so the sweep never revisits it —
 * same lock-then-write shape as claimCampaignBonus, one transaction.
 */
export async function applyExpiryClawback(
  grantId: string,
  userId: string,
  clawbackPaise: number,
  reason: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ walletBalancePaise: sql`${users.walletBalancePaise} - ${clawbackPaise}` })
      .where(eq(users.id, userId))
      .returning({ walletBalancePaise: users.walletBalancePaise });
    if (!updated) return;

    await tx.insert(walletTransactions).values({
      userId,
      delta: -clawbackPaise,
      reason,
      balanceAfter: updated.walletBalancePaise,
    });
    await tx
      .update(walletTransactions)
      .set({ expiredAt: new Date() })
      .where(eq(walletTransactions.id, grantId));
  });
}

/** Nothing left to claw back (clawback computed as 0) — just stop the sweep from re-checking this grant. */
export async function markGrantExpired(grantId: string): Promise<void> {
  await db
    .update(walletTransactions)
    .set({ expiredAt: new Date() })
    .where(eq(walletTransactions.id, grantId));
}
```

Add `sql` to the drizzle-orm import line at the top of the file: `import { and, eq, inArray, isNull, lt, sql } from 'drizzle-orm';`

- [ ] **Step 2: Type-check**

Run: `cd backend && npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaigns.repo.ts
git commit -m "feat(gift-campaigns): repo layer — audience resolution and expiry sweep queries"
```

---

### Task 5: `gift-campaign-copy.ts` — localized push copy

**Files:**
- Create: `backend/src/modules/gift-campaigns/gift-campaign-copy.ts`
- Test: `backend/test/gift-campaign-copy.spec.ts`

Push notifications carry a pre-rendered string (no client-side i18n render step — same reasoning as `broadcast-copy.ts`, which this reuses `LangCode`/`normalizeLang`/`SUPPORTED_LANGS` from instead of redefining them).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { getGiftCampaignPushCopy } from '../src/modules/gift-campaigns/gift-campaign-copy.js';

describe('getGiftCampaignPushCopy', () => {
  it('interpolates title and amount for self_claim in English', () => {
    const copy = getGiftCampaignPushCopy('en', 'self_claim', 'Diwali', '₹50');
    expect(copy.title).toContain('₹50');
    expect(copy.body).toContain('Diwali');
    expect(copy.body).toContain('₹50');
  });

  it('interpolates title and amount for auto_credit in Hindi', () => {
    const copy = getGiftCampaignPushCopy('hi', 'auto_credit', 'दिवाली', '₹50');
    expect(copy.title).toContain('₹50');
    expect(copy.body).toContain('दिवाली');
  });

  it('falls back to English for an unrecognized language code', () => {
    // @ts-expect-error deliberately invalid at the type level, valid at runtime for the fallback check
    const copy = getGiftCampaignPushCopy('fr', 'self_claim', 'Diwali', '₹50');
    expect(copy.title).toContain('₹50');
  });

  it('every supported language has both delivery-mode templates', () => {
    for (const lang of ['en', 'hi', 'bn', 'mr', 'te', 'ta', 'gu'] as const) {
      expect(getGiftCampaignPushCopy(lang, 'self_claim', 'X', '₹1').title.length).toBeGreaterThan(0);
      expect(getGiftCampaignPushCopy(lang, 'auto_credit', 'X', '₹1').title.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/gift-campaign-copy.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the copy module**

```typescript
/**
 * Localized push-notification copy for gift campaigns. Same reasoning as
 * broadcast-copy.ts (FCM carries an already-rendered string — there's no
 * client-side render step), and reuses its LangCode/normalizeLang/
 * SUPPORTED_LANGS rather than redefining the 7-language set twice.
 *
 * Unlike broadcast-copy.ts's fixed per-day hooks, this is a template per
 * (language, delivery mode) that every campaign interpolates its own title
 * and amount into — one campaign, sent through here, needs no new copy.
 */
import { normalizeLang, SUPPORTED_LANGS, type LangCode } from '../cron/broadcast-copy.js';

export { normalizeLang, SUPPORTED_LANGS };
export type { LangCode };

export interface GiftPushCopy {
  title: string;
  body: string;
}

type CopyFn = (title: string, amount: string) => GiftPushCopy;

const SELF_CLAIM: Record<LangCode, CopyFn> = {
  en: (title, amount) => ({
    title: `${amount} for you 🎁`,
    body: `To celebrate ${title}, we've added a ${amount} gift to your Aroha wallet — open the app to claim it.`,
  }),
  hi: (title, amount) => ({
    title: `आपके लिए ${amount} 🎁`,
    body: `${title} के अवसर पर, आपके Aroha वॉलेट में ${amount} का तोहफ़ा जोड़ा गया है — ऐप खोलकर पाएं।`,
  }),
  bn: (title, amount) => ({
    title: `আপনার জন্য ${amount} 🎁`,
    body: `${title} উপলক্ষে, আপনার Aroha ওয়ালেটে ${amount} উপহার যোগ করা হয়েছে — অ্যাপ খুলে নিন।`,
  }),
  mr: (title, amount) => ({
    title: `तुमच्यासाठी ${amount} 🎁`,
    body: `${title} निमित्ताने, तुमच्या Aroha वॉलेटमध्ये ${amount} ची भेट जोडली आहे — अ‍ॅप उघडून मिळवा.`,
  }),
  te: (title, amount) => ({
    title: `మీ కోసం ${amount} 🎁`,
    body: `${title} సందర్భంగా, మీ Aroha వాలెట్‌కి ${amount} బహుమతి జోడించాము — యాప్ తెరిచి పొందండి.`,
  }),
  ta: (title, amount) => ({
    title: `உங்களுக்கு ${amount} 🎁`,
    body: `${title} முன்னிட்டு, உங்கள் Aroha வாலட்டில் ${amount} பரிசு சேர்க்கப்பட்டுள்ளது — ஆப்பைத் திறந்து பெறுங்கள்.`,
  }),
  gu: (title, amount) => ({
    title: `તમારા માટે ${amount} 🎁`,
    body: `${title} નિમિત્તે, તમારા Aroha વોલેટમાં ${amount} ની ભેટ ઉમેરાઈ છે — એપ ખોલીને મેળવો.`,
  }),
};

const AUTO_CREDIT: Record<LangCode, CopyFn> = {
  en: (title, amount) => ({
    title: `${amount} added to your wallet 🎁`,
    body: `Happy ${title}! We've added ${amount} to your Aroha wallet — no action needed.`,
  }),
  hi: (title, amount) => ({
    title: `${amount} आपके वॉलेट में जुड़ गए 🎁`,
    body: `${title} की शुभकामनाएं! आपके Aroha वॉलेट में ${amount} जोड़ दिए गए हैं — कुछ करने की ज़रूरत नहीं।`,
  }),
  bn: (title, amount) => ({
    title: `${amount} আপনার ওয়ালেটে যোগ হয়েছে 🎁`,
    body: `শুভ ${title}! আপনার Aroha ওয়ালেটে ${amount} যোগ করা হয়েছে — কিছু করার দরকার নেই।`,
  }),
  mr: (title, amount) => ({
    title: `${amount} तुमच्या वॉलेटमध्ये जोडले गेले 🎁`,
    body: `${title} च्या शुभेच्छा! तुमच्या Aroha वॉलेटमध्ये ${amount} जोडले आहेत — काही करण्याची गरज नाही.`,
  }),
  te: (title, amount) => ({
    title: `${amount} మీ వాలెట్‌కి జోడించబడింది 🎁`,
    body: `${title} శుభాకాంక్షలు! మీ Aroha వాలెట్‌కి ${amount} జోడించాము — ఏమీ చేయాల్సిన అవసరం లేదు.`,
  }),
  ta: (title, amount) => ({
    title: `${amount} உங்கள் வாலட்டில் சேர்க்கப்பட்டது 🎁`,
    body: `${title} வாழ்த்துக்கள்! உங்கள் Aroha வாலட்டில் ${amount} சேர்க்கப்பட்டுள்ளது — எதுவும் செய்ய வேண்டியதில்லை.`,
  }),
  gu: (title, amount) => ({
    title: `${amount} તમારા વોલેટમાં ઉમેરાયા 🎁`,
    body: `${title} ની શુભકામનાઓ! તમારા Aroha વોલેટમાં ${amount} ઉમેરાયા છે — કંઈ કરવાની જરૂર નથી.`,
  }),
};

export function getGiftCampaignPushCopy(
  lang: LangCode,
  deliveryMode: 'self_claim' | 'auto_credit',
  festivalTitle: string,
  amountRupeeLabel: string,
): GiftPushCopy {
  const table = deliveryMode === 'self_claim' ? SELF_CLAIM : AUTO_CREDIT;
  const fn = table[lang] ?? table.en;
  return fn(festivalTitle, amountRupeeLabel);
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `cd backend && npx vitest run test/gift-campaign-copy.spec.ts`
Expected: PASS (4 tests). Note: the 3rd test passes `'fr'` which isn't a valid `LangCode` at the type level (hence the `@ts-expect-error`) — this is deliberately checking the runtime `?? table.en` fallback exists even though `normalizeLang` would never actually produce an unsupported code in production.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaign-copy.ts backend/test/gift-campaign-copy.spec.ts
git commit -m "feat(gift-campaigns): localized push-notification copy templates"
```

---

### Task 6: `claimCampaignBonus` — optional `expiresAt` param (TDD)

**Files:**
- Modify: `backend/src/modules/users/users.repo.ts`
- Test: `backend/test/claim-campaign-bonus-expiry.spec.ts`

- [ ] **Step 1: Write the failing test** (mocks `config/db.js`, following `birth-profiles-repo.spec.ts`'s pattern for a repo function with real transaction logic)

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  txValues: [] as unknown[],
}));

vi.mock('../src/config/db.js', () => {
  const makeTx = () => ({
    execute: vi.fn().mockResolvedValue([{ wallet_balance_paise: 5000 }]),
    select: () => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([]) }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ walletBalancePaise: 10000 }]),
        }),
      }),
    }),
    insert: () => ({
      values: (v: unknown) => {
        state.txValues.push(v);
        return Promise.resolve();
      },
    }),
  });
  return {
    db: {
      transaction: (fn: (tx: unknown) => unknown) => fn(makeTx()),
    },
  };
});

const { claimCampaignBonus } = await import('../src/modules/users/users.repo.js');

beforeEach(() => {
  state.txValues.length = 0;
});

describe('claimCampaignBonus expiresAt', () => {
  it('stores null expiresAt when not given', async () => {
    await claimCampaignBonus('user-1', 'diwali_2026_abc123', 5000);
    expect(state.txValues[0]).toMatchObject({ expiresAt: null });
  });

  it('threads a given expiresAt through to the ledger insert', async () => {
    const expiresAt = new Date('2026-12-01T00:00:00Z');
    await claimCampaignBonus('user-1', 'diwali_2026_abc123', 5000, expiresAt);
    expect(state.txValues[0]).toMatchObject({ expiresAt });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/claim-campaign-bonus-expiry.spec.ts`
Expected: FAIL — `expiresAt` is `undefined` in the captured insert values (4th param doesn't exist yet).

- [ ] **Step 3: Add the param.** In `users.repo.ts`, change the `claimCampaignBonus` signature and its `wallet_transactions` insert (currently around line 320-355):

```typescript
export async function claimCampaignBonus(
  userId: string,
  campaignKey: string,
  amountPaise: number,
  expiresAt?: Date,
): Promise<{ claimed: boolean; walletBalancePaise: number }> {
```

and the insert:

```typescript
    await tx.insert(walletTransactions).values({
      userId,
      delta: amountPaise,
      reason: campaignKey,
      balanceAfter: updated.walletBalancePaise,
      expiresAt: expiresAt ?? null,
    });
```

Everything else in the function (the row lock, the idempotency check, the balance update) is unchanged.

- [ ] **Step 4: Run the test to see it pass**

Run: `cd backend && npx vitest run test/claim-campaign-bonus-expiry.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full backend test suite to confirm nothing else broke**

Run: `cd backend && npm test`
Expected: same pass/fail baseline as before this change, plus the new tests passing (no regressions in existing claim-campaign or wallet tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/users/users.repo.ts backend/test/claim-campaign-bonus-expiry.spec.ts
git commit -m "feat(users): claimCampaignBonus accepts an optional credit-expiry date"
```

---

### Task 7: `gift-campaigns.service.ts` — `resolveClaimCampaign` (merges static + DB) (TDD)

**Files:**
- Create: `backend/src/modules/gift-campaigns/gift-campaigns.service.ts`
- Test: `backend/test/resolve-claim-campaign.spec.ts`

This is the function that lets the *existing* claim-bonus route serve both the old static `CLAIM_CAMPAIGNS` array and new DB-backed campaigns without forking the route.

- [ ] **Step 1: Write the failing test**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getGiftCampaignByKey: vi.fn(),
  payoutOf: vi.fn(),
}));

vi.mock('../src/modules/gift-campaigns/gift-campaigns.repo.js', () => ({
  getGiftCampaignByKey: state.getGiftCampaignByKey,
}));

vi.mock('../src/modules/features/features.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/features/features.service.js')>();
  return { ...actual, payoutOf: state.payoutOf };
});

const { resolveClaimCampaign } = await import('../src/modules/gift-campaigns/gift-campaigns.service.js');

beforeEach(() => {
  state.getGiftCampaignByKey.mockReset();
  state.payoutOf.mockReset();
});

describe('resolveClaimCampaign — static campaigns (config/campaigns.ts)', () => {
  it('resolves independence_day_2026 unchanged, via payoutOf', async () => {
    state.payoutOf.mockResolvedValue(50000);
    const result = await resolveClaimCampaign('independence_day_2026', 'user-1');
    expect(result).toMatchObject({ key: 'independence_day_2026', amountPaise: 50000 });
    expect(state.getGiftCampaignByKey).not.toHaveBeenCalled();
  });

  it('returns undefined for a totally unknown key', async () => {
    state.getGiftCampaignByKey.mockResolvedValue(undefined);
    const result = await resolveClaimCampaign('nonexistent_key', 'user-1');
    expect(result).toBeUndefined();
  });
});

describe('resolveClaimCampaign — DB campaigns (gift_campaigns table)', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  const baseDbCampaign = {
    key: 'diwali_2026_abc123',
    title: 'Diwali 2026',
    amountPaise: 5000,
    audienceMaxBalancePaise: 25000,
    deliveryMode: 'self_claim' as const,
    claimWindowDays: 5,
    creditExpiryDays: 14,
    status: 'sent' as const,
    sentAt: new Date('2026-11-08T09:00:00Z'),
    validFrom: new Date('2026-11-08T09:00:00Z'),
    validUntil: new Date('2026-11-13T09:00:00Z'),
  };

  it('is open when now is within validFrom/validUntil', async () => {
    state.getGiftCampaignByKey.mockResolvedValue(baseDbCampaign);
    const result = await resolveClaimCampaign('diwali_2026_abc123', 'user-1', now);
    expect(result).toMatchObject({
      key: 'diwali_2026_abc123',
      amountPaise: 5000,
      maxBalancePaise: 25000,
      isOpenNow: true,
    });
    expect(result?.expiresAt).toBeInstanceOf(Date);
  });

  it('is closed once now is past validUntil', async () => {
    state.getGiftCampaignByKey.mockResolvedValue(baseDbCampaign);
    const result = await resolveClaimCampaign(
      'diwali_2026_abc123',
      'user-1',
      new Date('2026-11-20T00:00:00Z'),
    );
    expect(result?.isOpenNow).toBe(false);
  });

  it('is undefined for an auto_credit campaign (not claimable via this route)', async () => {
    state.getGiftCampaignByKey.mockResolvedValue({ ...baseDbCampaign, deliveryMode: 'auto_credit' });
    const result = await resolveClaimCampaign('diwali_2026_abc123', 'user-1', now);
    expect(result).toBeUndefined();
  });

  it('is undefined for a campaign that has not been sent yet', async () => {
    state.getGiftCampaignByKey.mockResolvedValue({ ...baseDbCampaign, status: 'scheduled' });
    const result = await resolveClaimCampaign('diwali_2026_abc123', 'user-1', now);
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/resolve-claim-campaign.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `resolveClaimCampaign`** (first piece of `gift-campaigns.service.ts`):

```typescript
import { findClaimCampaign } from '../../config/campaigns.js';
import { payoutOf } from '../features/features.service.js';
import { istDateString } from '../../lib/astro-tools/transit-events.js';
import { getGiftCampaignByKey } from './gift-campaigns.repo.js';

export interface ClaimCampaignResolution {
  key: string;
  amountPaise: number;
  maxBalancePaise: number | undefined;
  /** IST calendar date to compare against the user's signup date for the "signed up same day" guard. */
  eligibleIstDate: string;
  isOpenNow: boolean;
  /** Credit-expiry to stamp on the ledger row, if this campaign has one. */
  expiresAt: Date | undefined;
}

/**
 * Single lookup the claim-bonus route calls instead of the old sync
 * findClaimCampaign — checks the static CLAIM_CAMPAIGNS array first (unchanged
 * behavior, unchanged historical entries), then gift_campaigns. Normalizes
 * both into one shape so the route's eligibility checks don't need to branch
 * on where a campaign came from.
 */
export async function resolveClaimCampaign(
  campaignKey: string,
  userId: string,
  now: Date = new Date(),
): Promise<ClaimCampaignResolution | undefined> {
  const staticCampaign = findClaimCampaign(campaignKey);
  if (staticCampaign) {
    const amountPaise = await payoutOf(userId, staticCampaign.featureKey, staticCampaign.fallbackPaise);
    return {
      key: staticCampaign.key,
      amountPaise,
      maxBalancePaise: staticCampaign.maxBalancePaise,
      eligibleIstDate: staticCampaign.istDate,
      isOpenNow: istDateString(now) === staticCampaign.istDate,
      expiresAt: undefined,
    };
  }

  const dbCampaign = await getGiftCampaignByKey(campaignKey);
  if (!dbCampaign || dbCampaign.deliveryMode !== 'self_claim' || dbCampaign.status !== 'sent') {
    return undefined;
  }

  const isOpenNow =
    dbCampaign.validFrom !== null &&
    dbCampaign.validUntil !== null &&
    now >= dbCampaign.validFrom &&
    now <= dbCampaign.validUntil;

  return {
    key: dbCampaign.key,
    amountPaise: dbCampaign.amountPaise,
    maxBalancePaise: dbCampaign.audienceMaxBalancePaise ?? undefined,
    eligibleIstDate: istDateString(dbCampaign.sentAt ?? now),
    isOpenNow,
    expiresAt: dbCampaign.creditExpiryDays
      ? new Date(now.getTime() + dbCampaign.creditExpiryDays * 24 * 60 * 60 * 1000)
      : undefined,
  };
}
```

(Verified against `users.routes.ts`'s own `import { resolveFeaturesForUser, payoutOf } from '../features/features.service.js';` — the import path above already matches.)

- [ ] **Step 4: Run the test to see it pass**

Run: `cd backend && npx vitest run test/resolve-claim-campaign.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaigns.service.ts backend/test/resolve-claim-campaign.spec.ts
git commit -m "feat(gift-campaigns): resolveClaimCampaign merges static and DB-backed campaigns"
```

---

### Task 8: Wire `resolveClaimCampaign` into the claim-bonus route

**Files:**
- Modify: `backend/src/modules/users/users.routes.ts`

- [ ] **Step 1: Replace the claim-bonus handler.** Find the handler (currently ~line 314-343, right after the `claimBonusRoute` definition) — it currently starts with `const campaign = findClaimCampaign(campaignKey);`. Replace the whole handler body:

```typescript
usersRouter.openapi(claimBonusRoute, async (c) => {
  const user = c.get('user');
  const { campaignKey } = c.req.valid('param');

  const campaign = await resolveClaimCampaign(campaignKey, user.id);
  if (!campaign) throw Errors.notFound('Unknown campaign');
  if (!campaign.isOpenNow) {
    throw Errors.conflict('This claim window has closed.');
  }
  // A brand-new account already receives the standard signup wallet balance (see the
  // `wallet_balance_paise` column default) — someone who signed up today would otherwise
  // stack that with the campaign bonus. Applies to every campaign, not just this one.
  if (istDateString(user.createdAt) === campaign.eligibleIstDate) {
    throw Errors.conflict(
      'New signups already receive a starting balance and are not eligible for this claim.',
    );
  }
  // Balance-gated campaigns (a "running low" top-up) re-check the wallet here
  // rather than trusting the audience the announcement was sent to — someone
  // who recharged in between is no longer who the offer is for.
  if (campaign.maxBalancePaise !== undefined && user.walletBalancePaise >= campaign.maxBalancePaise) {
    throw Errors.conflict('This offer is only for wallets running low.');
  }
  if (campaign.amountPaise <= 0) {
    throw Errors.conflict('This offer is not currently available.');
  }
  const result = await claimCampaignBonus(user.id, campaign.key, campaign.amountPaise, campaign.expiresAt);
  return c.json(result, 200);
});
```

- [ ] **Step 2: Update imports at the top of the file.** Remove `findClaimCampaign` from the `config/campaigns.js` import (keep `CLAIM_CAMPAIGN_KEYS`, still used by `getClaimedCampaignKeys` calls elsewhere in this file), and add:

```typescript
import { resolveClaimCampaign } from '../gift-campaigns/gift-campaigns.service.js';
```

- [ ] **Step 3: Type-check**

Run: `cd backend && npm run build`
Expected: no errors (confirms `findClaimCampaign` isn't used elsewhere in this file — if it is, keep the import and just add the new one alongside).

- [ ] **Step 4: Run the existing claim-campaign tests to confirm no regression**

Run: `cd backend && npm test`
Expected: same baseline as Task 6's step 5 — the static-campaign behavior (Independence Day, top-up bonus) is byte-for-byte the same eligibility logic, just routed through `resolveClaimCampaign`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/users/users.routes.ts
git commit -m "feat(users): claim-bonus route resolves DB-backed gift campaigns too"
```

---

### Task 9: `gift-campaigns.service.ts` — create, preview, cancel (TDD, mocked repo)

**Files:**
- Modify: `backend/src/modules/gift-campaigns/gift-campaigns.service.ts`
- Test: `backend/test/gift-campaigns-service.spec.ts`

Follows `admin-groups-service.spec.ts`'s exact pattern: `vi.mock` the repo module, test business rules in isolation.

- [ ] **Step 1: Write the failing tests**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  insertGiftCampaign: vi.fn(),
  resolveAudience: vi.fn(),
  cancelGiftCampaignIfPending: vi.fn(),
  getAllActiveTokens: vi.fn(),
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/modules/gift-campaigns/gift-campaigns.repo.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/modules/gift-campaigns/gift-campaigns.repo.js')>();
  return {
    ...actual,
    insertGiftCampaign: state.insertGiftCampaign,
    resolveAudience: state.resolveAudience,
    cancelGiftCampaignIfPending: state.cancelGiftCampaignIfPending,
  };
});

vi.mock('../src/modules/device-tokens/device-tokens.repo.js', () => ({
  getAllActiveTokens: state.getAllActiveTokens,
}));

vi.mock('../src/modules/admin/admin.repo.js', () => ({
  logAdminAction: state.logAdminAction,
}));

const { createCampaign, previewAudience, cancelCampaign } = await import(
  '../src/modules/gift-campaigns/gift-campaigns.service.js'
);

const ADMIN_PHONE = '+919999111111';

beforeEach(() => {
  state.insertGiftCampaign.mockReset();
  state.resolveAudience.mockReset();
  state.cancelGiftCampaignIfPending.mockReset();
  state.getAllActiveTokens.mockReset();
  state.logAdminAction.mockResolvedValue(undefined);
});

describe('createCampaign', () => {
  it('rejects a zero or negative amount', async () => {
    await expect(
      createCampaign(
        {
          title: 'Diwali',
          amountPaise: 0,
          audienceMaxBalancePaise: null,
          deliveryMode: 'auto_credit',
          claimWindowDays: null,
          creditExpiryDays: null,
          scheduledSendAt: null,
        },
        ADMIN_PHONE,
      ),
    ).rejects.toThrow(/greater than zero/);
    expect(state.insertGiftCampaign).not.toHaveBeenCalled();
  });

  it('rejects a self_claim campaign with no claim window', async () => {
    await expect(
      createCampaign(
        {
          title: 'Diwali',
          amountPaise: 5000,
          audienceMaxBalancePaise: null,
          deliveryMode: 'self_claim',
          claimWindowDays: null,
          creditExpiryDays: null,
          scheduledSendAt: null,
        },
        ADMIN_PHONE,
      ),
    ).rejects.toThrow(/claim window/);
  });

  it('defaults status to draft when no scheduledSendAt is given', async () => {
    state.insertGiftCampaign.mockResolvedValue({ id: 'c1', status: 'draft' });
    await createCampaign(
      {
        title: 'Diwali',
        amountPaise: 5000,
        audienceMaxBalancePaise: null,
        deliveryMode: 'auto_credit',
        claimWindowDays: null,
        creditExpiryDays: null,
        scheduledSendAt: null,
      },
      ADMIN_PHONE,
    );
    expect(state.insertGiftCampaign).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('sets status to scheduled when scheduledSendAt is given', async () => {
    state.insertGiftCampaign.mockResolvedValue({ id: 'c1', status: 'scheduled' });
    const sendAt = new Date('2026-11-08T09:00:00Z');
    await createCampaign(
      {
        title: 'Diwali',
        amountPaise: 5000,
        audienceMaxBalancePaise: null,
        deliveryMode: 'auto_credit',
        claimWindowDays: null,
        creditExpiryDays: null,
        scheduledSendAt: sendAt,
      },
      ADMIN_PHONE,
    );
    expect(state.insertGiftCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'scheduled', scheduledSendAt: sendAt }),
    );
  });

  it('derives the key from the title and logs the admin action', async () => {
    state.insertGiftCampaign.mockImplementation((input) =>
      Promise.resolve({ id: 'c1', ...input }),
    );
    const row = await createCampaign(
      {
        title: 'Diwali 2026',
        amountPaise: 5000,
        audienceMaxBalancePaise: 25000,
        deliveryMode: 'auto_credit',
        claimWindowDays: null,
        creditExpiryDays: 14,
        scheduledSendAt: null,
      },
      ADMIN_PHONE,
    );
    expect(row.key).toMatch(/^diwali_2026_[a-f0-9]{8}$/);
    expect(state.logAdminAction).toHaveBeenCalled();
  });
});

describe('previewAudience', () => {
  it('counts eligible and pushable users and totals the cost', async () => {
    state.resolveAudience.mockResolvedValue([
      { userId: 'u1', walletBalancePaise: 1000, locale: 'en', createdAt: new Date() },
      { userId: 'u2', walletBalancePaise: 2000, locale: 'hi', createdAt: new Date() },
      { userId: 'u3', walletBalancePaise: 3000, locale: null, createdAt: new Date() },
    ]);
    state.getAllActiveTokens.mockResolvedValue([
      { userId: 'u1', token: 't1' },
      { userId: 'u3', token: 't3' },
    ]);

    const preview = await previewAudience(5000, 25000);
    expect(preview).toEqual({ eligibleCount: 3, pushableCount: 2, totalCostPaise: 15000 });
  });
});

describe('cancelCampaign', () => {
  it('throws a conflict if the campaign was already sent or canceled', async () => {
    state.cancelGiftCampaignIfPending.mockResolvedValue(false);
    await expect(cancelCampaign('c1', ADMIN_PHONE)).rejects.toThrow(/draft or scheduled/);
  });

  it('logs the admin action on success', async () => {
    state.cancelGiftCampaignIfPending.mockResolvedValue(true);
    await cancelCampaign('c1', ADMIN_PHONE);
    expect(state.logAdminAction).toHaveBeenCalledWith(
      ADMIN_PHONE,
      'DELETE /v1/admin/gift-campaigns/c1',
      {},
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/gift-campaigns-service.spec.ts`
Expected: FAIL — `createCampaign`/`previewAudience`/`cancelCampaign` are not exported yet.

- [ ] **Step 3: Append to `gift-campaigns.service.ts`**

```typescript
import { Errors } from '../../lib/errors.js';
import { logAdminAction } from '../admin/admin.repo.js';
import { getAllActiveTokens } from '../device-tokens/device-tokens.repo.js';
import {
  cancelGiftCampaignIfPending,
  generateCampaignKey,
  insertGiftCampaign,
  resolveAudience,
  type CreateGiftCampaignRow,
} from './gift-campaigns.repo.js';
import type { GiftCampaignRow } from '../../db/schema.js';

export interface CreateGiftCampaignInput {
  title: string;
  amountPaise: number;
  audienceMaxBalancePaise: number | null;
  deliveryMode: 'self_claim' | 'auto_credit';
  claimWindowDays: number | null;
  creditExpiryDays: number | null;
  scheduledSendAt: Date | null;
}

export async function createCampaign(
  input: CreateGiftCampaignInput,
  adminPhone: string,
): Promise<GiftCampaignRow> {
  if (input.amountPaise <= 0) {
    throw Errors.badRequest('Amount must be greater than zero');
  }
  if (input.deliveryMode === 'self_claim' && (!input.claimWindowDays || input.claimWindowDays <= 0)) {
    throw Errors.badRequest('Self-claim campaigns need a claim window of at least 1 day');
  }

  const key = generateCampaignKey(input.title);
  const row: CreateGiftCampaignRow = {
    key,
    title: input.title,
    amountPaise: input.amountPaise,
    audienceMaxBalancePaise: input.audienceMaxBalancePaise,
    deliveryMode: input.deliveryMode,
    claimWindowDays: input.claimWindowDays,
    creditExpiryDays: input.creditExpiryDays,
    scheduledSendAt: input.scheduledSendAt,
    status: input.scheduledSendAt ? 'scheduled' : 'draft',
    createdBy: adminPhone,
  };
  const created = await insertGiftCampaign(row);
  await logAdminAction(adminPhone, 'POST /v1/admin/gift-campaigns', { key, title: input.title });
  return created;
}

export interface AudiencePreview {
  eligibleCount: number;
  pushableCount: number;
  totalCostPaise: number;
}

/** Dry run — no wallet or push side effects. Used by the admin UI before every send/schedule. */
export async function previewAudience(
  amountPaise: number,
  maxBalancePaise: number | null,
): Promise<AudiencePreview> {
  const [audience, activeTokens] = await Promise.all([
    resolveAudience(maxBalancePaise),
    getAllActiveTokens(),
  ]);
  const pushableUserIds = new Set(activeTokens.map((t) => t.userId));
  const pushableCount = audience.filter((m) => pushableUserIds.has(m.userId)).length;
  return {
    eligibleCount: audience.length,
    pushableCount,
    totalCostPaise: audience.length * amountPaise,
  };
}

export async function cancelCampaign(id: string, adminPhone: string): Promise<void> {
  const canceled = await cancelGiftCampaignIfPending(id);
  if (!canceled) {
    throw Errors.conflict('Only draft or scheduled campaigns can be canceled');
  }
  await logAdminAction(adminPhone, `DELETE /v1/admin/gift-campaigns/${id}`, {});
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && npx vitest run test/gift-campaigns-service.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaigns.service.ts backend/test/gift-campaigns-service.spec.ts
git commit -m "feat(gift-campaigns): service layer — create, preview audience, cancel"
```

---

### Task 10: `gift-campaigns.service.ts` — `executeSend` (TDD, mocked repo)

**Files:**
- Modify: `backend/src/modules/gift-campaigns/gift-campaigns.service.ts`
- Modify: `backend/test/gift-campaigns-service.spec.ts`

This is the function both the manual "Send Now" admin action and the daily cron sweep call — it must be idempotent-safe to call only once per campaign (both callers only ever invoke it for a `draft`/`scheduled` row and immediately mark it `sent`).

- [ ] **Step 1: Add failing tests to the existing spec file**

```typescript
// add these mocks to the vi.hoisted() state object and vi.mock() blocks at the top:
//   claimCampaignBonus: vi.fn(),
//   notifyUser: vi.fn().mockResolvedValue(undefined),
//   markGiftCampaignSent: vi.fn().mockResolvedValue(undefined),
//
// vi.mock('../src/modules/users/users.repo.js', () => ({ claimCampaignBonus: state.claimCampaignBonus }));
// vi.mock('../src/lib/notifications/notify-user.js', () => ({ notifyUser: state.notifyUser }));
// add markGiftCampaignSent to the gift-campaigns.repo.js mock block

describe('executeSend', () => {
  const auto_credit_campaign = {
    id: 'c1',
    key: 'diwali_2026_abc123',
    title: 'Diwali 2026',
    amountPaise: 5000,
    audienceMaxBalancePaise: null,
    deliveryMode: 'auto_credit' as const,
    claimWindowDays: null,
    creditExpiryDays: 14,
  };

  it('credits every eligible user directly for auto_credit campaigns', async () => {
    state.resolveAudience.mockResolvedValue([
      { userId: 'u1', walletBalancePaise: 1000, locale: 'en', createdAt: new Date() },
      { userId: 'u2', walletBalancePaise: 2000, locale: 'hi', createdAt: new Date() },
    ]);
    state.claimCampaignBonus.mockResolvedValue({ claimed: true, walletBalancePaise: 6000 });

    await executeSend(auto_credit_campaign as unknown as GiftCampaignRow);

    expect(state.claimCampaignBonus).toHaveBeenCalledTimes(2);
    expect(state.claimCampaignBonus).toHaveBeenCalledWith(
      'u1',
      'diwali_2026_abc123',
      5000,
      expect.any(Date),
    );
    expect(state.notifyUser).toHaveBeenCalledTimes(2);
  });

  it('does not credit anyone for self_claim campaigns — only notifies', async () => {
    state.resolveAudience.mockResolvedValue([
      { userId: 'u1', walletBalancePaise: 1000, locale: 'en', createdAt: new Date() },
    ]);

    await executeSend({
      ...auto_credit_campaign,
      deliveryMode: 'self_claim',
      claimWindowDays: 5,
    } as unknown as GiftCampaignRow);

    expect(state.claimCampaignBonus).not.toHaveBeenCalled();
    expect(state.notifyUser).toHaveBeenCalledTimes(1);
  });

  it('marks the campaign sent with a validUntil derived from claimWindowDays for self_claim', async () => {
    state.resolveAudience.mockResolvedValue([]);
    await executeSend({
      ...auto_credit_campaign,
      deliveryMode: 'self_claim',
      claimWindowDays: 5,
    } as unknown as GiftCampaignRow);

    expect(state.markGiftCampaignSent).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ validUntil: expect.any(Date) }),
    );
  });

  it('marks auto_credit campaigns sent with a null validUntil (no claim window)', async () => {
    state.resolveAudience.mockResolvedValue([]);
    await executeSend(auto_credit_campaign as unknown as GiftCampaignRow);
    expect(state.markGiftCampaignSent).toHaveBeenCalledWith('c1', expect.objectContaining({ validUntil: null }));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/gift-campaigns-service.spec.ts`
Expected: FAIL — `executeSend` is not exported yet.

- [ ] **Step 3: Append `executeSend` to `gift-campaigns.service.ts`**

```typescript
import pLimit from 'p-limit';
import { claimCampaignBonus } from '../users/users.repo.js';
import { notifyUser } from '../../lib/notifications/notify-user.js';
import { markGiftCampaignSent } from './gift-campaigns.repo.js';
import { getGiftCampaignPushCopy, normalizeLang } from './gift-campaign-copy.js';

/** Matches the horoscope batch job's concurrency — plenty at this app's user counts (~hundreds, not millions). */
const SEND_CONCURRENCY = 10;

function formatRupeeLabel(paise: number): string {
  return `₹${Math.round(paise / 100)}`;
}

/**
 * Shared by the manual "Send Now" admin action and the daily cron sweep.
 * Callers are responsible for only invoking this once per campaign (both
 * only ever call it for a draft/scheduled row, then this marks it sent).
 */
export async function executeSend(campaign: GiftCampaignRow): Promise<void> {
  const now = new Date();
  const audience = await resolveAudience(campaign.audienceMaxBalancePaise);
  const expiresAt = campaign.creditExpiryDays
    ? new Date(now.getTime() + campaign.creditExpiryDays * 24 * 60 * 60 * 1000)
    : undefined;
  const limit = pLimit(SEND_CONCURRENCY);
  const amountLabel = formatRupeeLabel(campaign.amountPaise);

  await Promise.all(
    audience.map((member) =>
      limit(async () => {
        if (campaign.deliveryMode === 'auto_credit') {
          await claimCampaignBonus(member.userId, campaign.key, campaign.amountPaise, expiresAt);
        }
        const copy = getGiftCampaignPushCopy(
          normalizeLang(member.locale),
          campaign.deliveryMode,
          campaign.title,
          amountLabel,
        );
        await notifyUser(member.userId, {
          title: copy.title,
          body: copy.body,
          type: 'gift_campaign',
          link: '/wallet',
        });
      }),
    ),
  );

  const validUntil =
    campaign.deliveryMode === 'self_claim' && campaign.claimWindowDays
      ? new Date(now.getTime() + campaign.claimWindowDays * 24 * 60 * 60 * 1000)
      : null;
  await markGiftCampaignSent(campaign.id, { sentAt: now, validFrom: now, validUntil });
}
```

Check `p-limit` is already a dependency (it's imported in `horoscope.service.ts` per Task descriptions above) — no new install needed.

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && npx vitest run test/gift-campaigns-service.spec.ts`
Expected: PASS (13 tests total in the file).

- [ ] **Step 5: Add `sendCampaignNow` (the admin-triggered wrapper)** — append:

```typescript
import { getGiftCampaignById } from './gift-campaigns.repo.js';

export async function sendCampaignNow(id: string, adminPhone: string): Promise<GiftCampaignRow> {
  const campaign = await getGiftCampaignById(id);
  if (!campaign) throw Errors.notFound('Unknown campaign');
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw Errors.conflict('This campaign has already been sent or canceled');
  }
  await executeSend(campaign);
  await logAdminAction(adminPhone, `POST /v1/admin/gift-campaigns/${id}/send`, {});
  const updated = await getGiftCampaignById(id);
  return updated!;
}
```

(Consolidate the two separate `import { getGiftCampaignById } ...` lines from this step and Task 9 into the single existing import block from `./gift-campaigns.repo.js` at the top of the file.)

- [ ] **Step 6: Type-check and run the full backend suite**

Run: `cd backend && npm run build && npm test`
Expected: build clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/gift-campaigns/gift-campaigns.service.ts backend/test/gift-campaigns-service.spec.ts
git commit -m "feat(gift-campaigns): executeSend and the manual send-now admin action"
```

---

### Task 11: Admin routes — `admin-gift-campaigns.schemas.ts` + `admin-gift-campaigns.routes.ts`

**Files:**
- Create: `backend/src/modules/admin/admin-gift-campaigns.schemas.ts`
- Create: `backend/src/modules/admin/admin-gift-campaigns.routes.ts`
- Modify: `backend/src/app.ts`

Mirrors `admin-groups.routes.ts`/`admin-groups.schemas.ts` exactly — `requireAdmin` per-route (not router-wide, per that file's own documented reason), its own `adminPhoneOf`/`auditRead` helpers duplicated rather than shared.

- [ ] **Step 1: Write the schemas file**

```typescript
import { z } from '@hono/zod-openapi';

export const GiftCampaignRowSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    title: z.string(),
    amountPaise: z.number().int(),
    audienceMaxBalancePaise: z.number().int().nullable(),
    deliveryMode: z.enum(['self_claim', 'auto_credit']),
    claimWindowDays: z.number().int().nullable(),
    creditExpiryDays: z.number().int().nullable(),
    scheduledSendAt: z.string().nullable(),
    status: z.enum(['draft', 'scheduled', 'sent', 'canceled']),
    validFrom: z.string().nullable(),
    validUntil: z.string().nullable(),
    sentAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi('GiftCampaignRow');

export const GiftCampaignsResponseSchema = z
  .object({ campaigns: z.array(GiftCampaignRowSchema) })
  .openapi('GiftCampaignsResponse');

export const CreateGiftCampaignBodySchema = z
  .object({
    title: z.string().min(1),
    amountPaise: z.number().int().positive(),
    audienceMaxBalancePaise: z.number().int().positive().nullable(),
    deliveryMode: z.enum(['self_claim', 'auto_credit']),
    claimWindowDays: z.number().int().positive().nullable(),
    creditExpiryDays: z.number().int().positive().nullable(),
    scheduledSendAt: z.string().datetime().nullable(),
  })
  .openapi('CreateGiftCampaignBody');

export const GiftCampaignIdParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .openapi({ param: { name: 'id', in: 'path' } }),
});

export const PreviewAudienceBodySchema = z
  .object({
    amountPaise: z.number().int().positive(),
    audienceMaxBalancePaise: z.number().int().positive().nullable(),
  })
  .openapi('PreviewAudienceBody');

export const AudiencePreviewResponseSchema = z
  .object({
    eligibleCount: z.number().int(),
    pushableCount: z.number().int(),
    totalCostPaise: z.number().int(),
  })
  .openapi('AudiencePreviewResponse');
```

- [ ] **Step 2: Write the routes file**

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { requireAdmin } from '../../middleware/auth.js';
import { logger } from '../../lib/logger.js';
import {
  GiftCampaignsResponseSchema,
  CreateGiftCampaignBodySchema,
  GiftCampaignRowSchema,
  GiftCampaignIdParamSchema,
  PreviewAudienceBodySchema,
  AudiencePreviewResponseSchema,
} from './admin-gift-campaigns.schemas.js';
import { logAdminAction } from './admin.repo.js';
import {
  listGiftCampaigns,
  getGiftCampaignById,
} from '../gift-campaigns/gift-campaigns.repo.js';
import {
  createCampaign,
  previewAudience,
  cancelCampaign,
  sendCampaignNow,
} from '../gift-campaigns/gift-campaigns.service.js';
import { Errors } from '../../lib/errors.js';
import type { GiftCampaignRow } from '../../db/schema.js';

const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
      requestId: z.string().optional(),
    }),
  })
  .openapi('AdminGiftCampaignsError');

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ErrorSchema } },
});

export const adminGiftCampaignsRouter = new OpenAPIHono();

/** Same identity-from-already-validated-token shortcut as admin-groups.routes.ts's own adminPhoneOf. */
function adminPhoneOf(c: { get: (key: 'firebaseToken') => { phone_number?: string } }): string {
  return c.get('firebaseToken').phone_number ?? 'unknown';
}

async function auditRead(
  c: { get: (key: 'firebaseToken') => { phone_number?: string } },
  route: string,
  params: unknown,
): Promise<void> {
  await logAdminAction(adminPhoneOf(c), route, params).catch((err: unknown) =>
    logger.warn({ err, route }, 'admin_audit_log insert failed'),
  );
}

function toDto(row: GiftCampaignRow) {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    amountPaise: row.amountPaise,
    audienceMaxBalancePaise: row.audienceMaxBalancePaise,
    deliveryMode: row.deliveryMode,
    claimWindowDays: row.claimWindowDays,
    creditExpiryDays: row.creditExpiryDays,
    scheduledSendAt: row.scheduledSendAt?.toISOString() ?? null,
    status: row.status,
    validFrom: row.validFrom?.toISOString() ?? null,
    validUntil: row.validUntil?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* GET /admin/gift-campaigns                                                  */
/* -------------------------------------------------------------------------- */

const listRoute = createRoute({
  method: 'get',
  path: '/admin/gift-campaigns',
  tags: ['Admin'],
  summary: 'List every gift campaign, newest first',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  responses: {
    200: { description: 'Campaign list', content: { 'application/json': { schema: GiftCampaignsResponseSchema } } },
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminGiftCampaignsRouter.openapi(listRoute, async (c) => {
  const rows = await listGiftCampaigns();
  await auditRead(c, 'GET /v1/admin/gift-campaigns', {});
  return c.json({ campaigns: rows.map(toDto).reverse() }, 200);
});

/* -------------------------------------------------------------------------- */
/* POST /admin/gift-campaigns                                                 */
/* -------------------------------------------------------------------------- */

const createRoute_ = createRoute({
  method: 'post',
  path: '/admin/gift-campaigns',
  tags: ['Admin'],
  summary: 'Create a gift campaign (draft, or scheduled if scheduledSendAt is given)',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  request: {
    body: { required: true, content: { 'application/json': { schema: CreateGiftCampaignBodySchema } } },
  },
  responses: {
    200: { description: 'Created campaign', content: { 'application/json': { schema: GiftCampaignRowSchema } } },
    400: errorResponse('Invalid amount or missing claim window for a self-claim campaign'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminGiftCampaignsRouter.openapi(createRoute_, async (c) => {
  const body = c.req.valid('json');
  const row = await createCampaign(
    { ...body, scheduledSendAt: body.scheduledSendAt ? new Date(body.scheduledSendAt) : null },
    adminPhoneOf(c),
  );
  return c.json(toDto(row), 200);
});

/* -------------------------------------------------------------------------- */
/* POST /admin/gift-campaigns/preview                                        */
/* -------------------------------------------------------------------------- */

const previewRoute = createRoute({
  method: 'post',
  path: '/admin/gift-campaigns/preview',
  tags: ['Admin'],
  summary: 'Dry-run: eligible/pushable audience size and total cost for a not-yet-created campaign',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  request: {
    body: { required: true, content: { 'application/json': { schema: PreviewAudienceBodySchema } } },
  },
  responses: {
    200: { description: 'Audience preview', content: { 'application/json': { schema: AudiencePreviewResponseSchema } } },
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminGiftCampaignsRouter.openapi(previewRoute, async (c) => {
  const { amountPaise, audienceMaxBalancePaise } = c.req.valid('json');
  const preview = await previewAudience(amountPaise, audienceMaxBalancePaise);
  return c.json(preview, 200);
});

/* -------------------------------------------------------------------------- */
/* POST /admin/gift-campaigns/{id}/send                                      */
/* -------------------------------------------------------------------------- */

const sendRoute = createRoute({
  method: 'post',
  path: '/admin/gift-campaigns/{id}/send',
  tags: ['Admin'],
  summary: 'Send a draft or scheduled campaign immediately',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  request: { params: GiftCampaignIdParamSchema },
  responses: {
    200: { description: 'Sent campaign', content: { 'application/json': { schema: GiftCampaignRowSchema } } },
    404: errorResponse('Unknown campaign'),
    409: errorResponse('Already sent or canceled'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminGiftCampaignsRouter.openapi(sendRoute, async (c) => {
  const { id } = c.req.valid('param');
  const row = await sendCampaignNow(id, adminPhoneOf(c));
  return c.json(toDto(row), 200);
});

/* -------------------------------------------------------------------------- */
/* DELETE /admin/gift-campaigns/{id}                                         */
/* -------------------------------------------------------------------------- */

const cancelRoute = createRoute({
  method: 'delete',
  path: '/admin/gift-campaigns/{id}',
  tags: ['Admin'],
  summary: 'Cancel a draft or scheduled campaign',
  security: [{ bearerAuth: [] }],
  middleware: [requireAdmin] as const,
  request: { params: GiftCampaignIdParamSchema },
  responses: {
    204: { description: 'Canceled' },
    404: errorResponse('Unknown campaign'),
    409: errorResponse('Already sent or canceled'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Admin access required'),
  },
});

adminGiftCampaignsRouter.openapi(cancelRoute, async (c) => {
  const { id } = c.req.valid('param');
  const existing = await getGiftCampaignById(id);
  if (!existing) throw Errors.notFound('Unknown campaign');
  await cancelCampaign(id, adminPhoneOf(c));
  return c.body(null, 204);
});
```

- [ ] **Step 3: Mount the router in `app.ts`.** Find the `adminGroupsRouter` import/mount (around lines 17 and 108) and add alongside:

```typescript
import { adminGiftCampaignsRouter } from './modules/admin/admin-gift-campaigns.routes.js';
```

```typescript
  app.route('/v1', adminGiftCampaignsRouter);
```

- [ ] **Step 4: Type-check**

Run: `cd backend && npm run build`
Expected: no errors.

- [ ] **Step 5: Manual smoke test against a running dev server**

Run: `cd backend && npm run dev` (in one terminal), then from another terminal, get an admin bearer token the way the existing admin UI does (or check `test/admin-routes.spec.ts` for how other admin route tests authenticate) and:

```bash
curl -s http://localhost:3000/v1/admin/gift-campaigns -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

Expected: `{"campaigns":[]}`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/admin/admin-gift-campaigns.schemas.ts backend/src/modules/admin/admin-gift-campaigns.routes.ts backend/src/app.ts
git commit -m "feat(admin): gift-campaigns CRUD + preview + send routes"
```

---

### Task 12: Cron sweep — scheduled sends + expiry clawback

**Files:**
- Create: `backend/src/modules/cron/gift-campaign-sweep.service.ts`
- Modify: `backend/src/modules/cron/cron.routes.ts`
- Create: `backend/scripts/cron-festival-campaigns.sh`
- Test: `backend/test/gift-campaign-sweep.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  findDueScheduledCampaigns: vi.fn(),
  findDueExpiredGrants: vi.fn(),
  applyExpiryClawback: vi.fn().mockResolvedValue(undefined),
  markGrantExpired: vi.fn().mockResolvedValue(undefined),
  executeSend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/modules/gift-campaigns/gift-campaigns.repo.js', () => ({
  findDueScheduledCampaigns: state.findDueScheduledCampaigns,
  findDueExpiredGrants: state.findDueExpiredGrants,
  applyExpiryClawback: state.applyExpiryClawback,
  markGrantExpired: state.markGrantExpired,
}));

vi.mock('../src/modules/gift-campaigns/gift-campaigns.service.js', () => ({
  executeSend: state.executeSend,
}));

const { sweepDueCampaigns, sweepExpiredGrants } = await import(
  '../src/modules/cron/gift-campaign-sweep.service.js'
);

beforeEach(() => {
  for (const fn of Object.values(state)) fn.mockClear();
});

describe('sweepDueCampaigns', () => {
  it('sends every due campaign and reports the count', async () => {
    state.findDueScheduledCampaigns.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    const result = await sweepDueCampaigns(new Date('2026-11-08T09:00:00Z'));
    expect(state.executeSend).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 2 });
  });
});

describe('sweepExpiredGrants', () => {
  it('claws back the lesser of the grant amount and current balance', async () => {
    state.findDueExpiredGrants.mockResolvedValue([
      { id: 'g1', userId: 'u1', delta: 5000, reason: 'diwali_2026_abc', currentBalancePaise: 2000 },
    ]);
    const result = await sweepExpiredGrants(new Date('2026-12-01T00:00:00Z'));
    expect(state.applyExpiryClawback).toHaveBeenCalledWith('g1', 'u1', 2000, 'diwali_2026_abc_expired');
    expect(result).toEqual({ expired: 1 });
  });

  it('marks a grant expired without a wallet write when nothing is left to claw back', async () => {
    state.findDueExpiredGrants.mockResolvedValue([
      { id: 'g1', userId: 'u1', delta: 5000, reason: 'diwali_2026_abc', currentBalancePaise: 0 },
    ]);
    await sweepExpiredGrants(new Date('2026-12-01T00:00:00Z'));
    expect(state.applyExpiryClawback).not.toHaveBeenCalled();
    expect(state.markGrantExpired).toHaveBeenCalledWith('g1');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd backend && npx vitest run test/gift-campaign-sweep.spec.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the sweep service**

```typescript
import {
  findDueScheduledCampaigns,
  findDueExpiredGrants,
  applyExpiryClawback,
  markGrantExpired,
} from '../gift-campaigns/gift-campaigns.repo.js';
import { executeSend } from '../gift-campaigns/gift-campaigns.service.js';

/** The claim-window/schedule half of the daily gift-campaigns sweep. */
export async function sweepDueCampaigns(now: Date = new Date()): Promise<{ sent: number }> {
  const due = await findDueScheduledCampaigns(now);
  for (const campaign of due) {
    await executeSend(campaign);
  }
  return { sent: due.length };
}

/**
 * The credit-expiry half. Clawback is `min(originally granted, currently
 * held)` — see the design spec's note on why this is an approximation, not a
 * per-rupee spend-ordering ledger.
 */
export async function sweepExpiredGrants(now: Date = new Date()): Promise<{ expired: number }> {
  const due = await findDueExpiredGrants(now);
  for (const grant of due) {
    const clawbackPaise = Math.max(0, Math.min(grant.delta, grant.currentBalancePaise));
    if (clawbackPaise > 0) {
      await applyExpiryClawback(grant.id, grant.userId, clawbackPaise, `${grant.reason}_expired`);
    } else {
      await markGrantExpired(grant.id);
    }
  }
  return { expired: due.length };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `cd backend && npx vitest run test/gift-campaign-sweep.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the cron route.** In `cron.routes.ts`, add the import near the other cron service imports:

```typescript
import { sweepDueCampaigns, sweepExpiredGrants } from './gift-campaign-sweep.service.js';
```

and, following the exact shape of the `saturnPhasesRoute`/`lowBalanceAlertRoute` pair just above the final export in the file:

```typescript
// ---------------------------------------------------------------------------
// Gift campaigns — fires any admin-scheduled campaign whose send time has
// arrived, and claws back any credited-but-expired gift past its
// credit_expiry_days. Wired to run once a day (see
// scripts/cron-festival-campaigns.sh). See gift-campaign-sweep.service.ts.
// ---------------------------------------------------------------------------

const festivalCampaignsRoute = createRoute({
  method: 'post',
  path: '/cron/festival-campaigns',
  tags: ['Cron'],
  summary: 'Send due scheduled gift campaigns and claw back expired unused credit',
  description:
    'Machine-to-machine endpoint, meant to run once a day via the OS crontab. Two independent ' +
    'sweeps: any gift_campaigns row with status=scheduled and scheduled_send_at in the past is ' +
    'sent (audience resolved, credited if auto_credit, notified either way); any ' +
    'wallet_transactions grant past its expires_at has its still-unspent portion clawed back. ' +
    'Authenticated via the X-Cron-Secret header.',
  responses: {
    200: {
      description: 'Sweep completed',
      content: {
        'application/json': { schema: z.object({ sent: z.number(), expired: z.number() }) },
      },
    },
    403: errorResponse('Invalid or missing cron secret'),
  },
});

cronRouter.openapi(festivalCampaignsRoute, async (c) => {
  const { sent } = await sweepDueCampaigns();
  const { expired } = await sweepExpiredGrants();
  return c.json({ sent, expired }, 200);
});
```

- [ ] **Step 6: Write the crontab shell script**, matching `cron-low-balance-alert.sh` exactly but for the new endpoint:

```bash
#!/usr/bin/env bash
#
# Sends any admin-scheduled gift campaign whose fire time has arrived, and
# claws back any expired-but-unspent gift credit — see
# gift-campaign-sweep.service.ts.
#
# Wired into the EC2 crontab to run once a day, 09:00 IST:
#   30 3 * * * /home/ec2-user/aroha-backend/scripts/cron-festival-campaigns.sh \
#     >> /home/ec2-user/cron-festival-campaigns.log 2>&1
#
# Reads CRON_SECRET from the app's .env (never hard-coded in the crontab) and
# calls the internal, secret-protected endpoint on localhost.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
SECRET="$(grep -E '^CRON_SECRET=' "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
TELEGRAM_BOT_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN=' "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
TELEGRAM_ALERT_CHAT_ID="$(grep -E '^TELEGRAM_ALERT_CHAT_ID=' "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"

if [ -z "$SECRET" ]; then
  echo "$(date -u +%FT%TZ) ERROR: CRON_SECRET not set in $DIR/.env" >&2
  exit 1
fi

CURL_EXIT=0
curl -fsS --max-time 60 -X POST \
  -H "X-Cron-Secret: $SECRET" \
  -H 'Content-Type: application/json' \
  "http://127.0.0.1:${PORT}/internal/cron/festival-campaigns" || CURL_EXIT=$?

if [ "$CURL_EXIT" -ne 0 ]; then
  echo "$(date -u +%FT%TZ) ERROR: cron-festival-campaigns.sh failed (curl exit $CURL_EXIT)" >&2
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_ALERT_CHAT_ID" ]; then
    curl -fsS --max-time 10 -X POST \
      -H 'Content-Type: application/json' \
      -d "{\"chat_id\":\"${TELEGRAM_ALERT_CHAT_ID}\",\"text\":\"cron-festival-campaigns.sh failed (curl exit ${CURL_EXIT})\"}" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      >/dev/null 2>&1 || echo "$(date -u +%FT%TZ) WARN: Telegram alert POST failed" >&2
  fi
  exit "$CURL_EXIT"
fi
```

Make it executable: `chmod +x backend/scripts/cron-festival-campaigns.sh`

Note the actual EC2 crontab line addition is a **separate, deliberate ops step** (SSH to the box, edit crontab) — not part of this plan's automated steps. Flag it explicitly when this plan reaches deployment; do not add it unattended.

- [ ] **Step 7: Type-check and run the full backend suite**

Run: `cd backend && npm run build && npm test`
Expected: build clean, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/cron/gift-campaign-sweep.service.ts backend/src/modules/cron/cron.routes.ts backend/scripts/cron-festival-campaigns.sh backend/test/gift-campaign-sweep.spec.ts
git commit -m "feat(cron): daily sweep — send due gift campaigns, claw back expired credit"
```

---

### Task 13: Expose `activeClaimableCampaign` on `GET /v1/me`

**Files:**
- Modify: `backend/src/modules/users/users.schemas.ts`
- Modify: `backend/src/modules/users/users.service.ts`
- Modify: `backend/src/modules/users/users.routes.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Add the field to the schema.** In `users.schemas.ts`, find the `claimedCampaigns` field (around line 282) and add alongside it:

```typescript
    activeClaimableCampaign: z
      .object({
        key: z.string(),
        title: z.string(),
        amountPaise: z.number().int(),
        validUntil: z.string(),
      })
      .nullable(),
```

- [ ] **Step 2: Compute it in `toUserDto`.** In `users.service.ts`, add a new parameter and field. Change the signature (currently ~line 64-70):

```typescript
export function toUserDto(
  row: UserRow,
  profile: ProfileContext,
  features: Record<string, ResolvedFeature>,
  feedbackGiven: boolean,
  claimedCampaigns: string[],
  activeClaimableCampaign: { key: string; title: string; amountPaise: number; validUntil: string } | null,
): UserDto {
```

and add the field next to `claimedCampaigns` in the returned object (~line 143):

```typescript
    claimedCampaigns,
    activeClaimableCampaign,
```

- [ ] **Step 3: Add a repo query for the one live self-claim campaign.** In `gift-campaigns.repo.ts` (from Task 3/4), add `gt` to the existing `drizzle-orm` import line, then append:

```typescript
/** The one self-claim campaign currently in its send→validUntil window, if any (there should only ever be 0 or 1). */
export async function findLiveSelfClaimCampaign(now: Date): Promise<GiftCampaignRow | undefined> {
  const [row] = await db
    .select()
    .from(giftCampaigns)
    .where(
      and(
        eq(giftCampaigns.status, 'sent'),
        eq(giftCampaigns.deliveryMode, 'self_claim'),
        lt(giftCampaigns.validFrom, now),
        gt(giftCampaigns.validUntil, now),
      ),
    )
    .limit(1);
  return row;
}
```

- [ ] **Step 4: Write the resolver in `users.service.ts`**, near `toUserDto`. This queries directly against the static list + `findLiveSelfClaimCampaign` (rather than looping `resolveClaimCampaign` per candidate key) since it needs the actual campaign row for `title`/`validUntil`, not just a pass/fail eligibility check:

```typescript
import { findLiveSelfClaimCampaign } from '../gift-campaigns/gift-campaigns.repo.js';
import { CLAIM_CAMPAIGNS } from '../../config/campaigns.js';
import { istDateString } from '../../lib/astro-tools/transit-events.js';
import { payoutOf } from '../features/features.service.js';

/**
 * Whatever self-claim campaign (static or DB-backed) is currently live AND
 * eligible for this user, or null. Mirrors the exact gates the claim-bonus
 * route itself enforces (the balance ceiling, already-claimed, signed-up-
 * today) so the frontend never offers a claim the route would refuse — same
 * intent as useClaimCampaign's old client-side gates, just computed here
 * since there's no longer one fixed key to hardcode into every client build.
 */

export async function resolveActiveClaimableCampaign(
  user: UserRow,
  claimedCampaigns: string[],
): Promise<{ key: string; title: string; amountPaise: number; validUntil: string } | null> {
  const now = new Date();
  const today = istDateString(now);

  // Static campaigns: at most one is ever "today" — CLAIM_CAMPAIGNS is small, a linear scan is fine.
  const staticLive = CLAIM_CAMPAIGNS.find((c) => c.istDate === today);
  if (
    staticLive &&
    !claimedCampaigns.includes(staticLive.key) &&
    istDateString(user.createdAt) !== staticLive.istDate &&
    (staticLive.maxBalancePaise === undefined || user.walletBalancePaise < staticLive.maxBalancePaise)
  ) {
    const amountPaise = await payoutOf(user.id, staticLive.featureKey, staticLive.fallbackPaise);
    if (amountPaise > 0) {
      return {
        key: staticLive.key,
        title: staticLive.key,
        amountPaise,
        validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  const dbLive = await findLiveSelfClaimCampaign(now);
  if (
    dbLive &&
    !claimedCampaigns.includes(dbLive.key) &&
    istDateString(user.createdAt) !== istDateString(dbLive.sentAt ?? now) &&
    (dbLive.audienceMaxBalancePaise === null || user.walletBalancePaise < dbLive.audienceMaxBalancePaise)
  ) {
    return {
      key: dbLive.key,
      title: dbLive.title,
      amountPaise: dbLive.amountPaise,
      validUntil: dbLive.validUntil!.toISOString(),
    };
  }

  return null;
}
```

`title` for a static campaign falls back to its raw key (e.g. `"independence_day_2026"`) since those never had a human-readable title field — acceptable, they're historical and the frontend's copy doesn't actually need to display the raw title verbatim (see Task 14).

- [ ] **Step 5: Wire it into all 3 DTO call sites.**

In `users.routes.ts`, both `usersRouter.openapi(getMeRoute, ...)` and `usersRouter.openapi(patchMeRoute, ...)` handlers (~lines 262-263 and 276-277) change from:

```typescript
  const claimedCampaigns = await getClaimedCampaignKeys(user.id, CLAIM_CAMPAIGN_KEYS);
  return c.json(toUserDto(user, profile, features, feedbackGiven, claimedCampaigns), 200);
```

to:

```typescript
  const claimedCampaigns = await getClaimedCampaignKeys(user.id, CLAIM_CAMPAIGN_KEYS);
  const activeClaimableCampaign = await resolveActiveClaimableCampaign(user, claimedCampaigns);
  return c.json(toUserDto(user, profile, features, feedbackGiven, claimedCampaigns, activeClaimableCampaign), 200);
```

(substituting `next` for `user` in the `patchMeRoute` handler, matching what's already there), and add `resolveActiveClaimableCampaign` to the `users.service.js` import list at the top of the file.

In `auth.routes.ts` (~line 72-76):

```typescript
  const claimedCampaigns = created
    ? []
    : await getClaimedCampaignKeys(user.id, CLAIM_CAMPAIGN_KEYS);
  const activeClaimableCampaign = await resolveActiveClaimableCampaign(user, claimedCampaigns);
  user: toUserDto(user, profile, features, feedbackGiven, claimedCampaigns, activeClaimableCampaign),
```

(adjust to match the exact surrounding variable names in that file — read the ~15 lines around line 72 first to confirm `user`/`profile`/`features`/`feedbackGiven` are in scope there the same way, and add the corresponding import.)

- [ ] **Step 6: Type-check**

Run: `cd backend && npm run build`
Expected: no errors — this is the step that will surface any of the 3 call sites missed.

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npm test`
Expected: all pass. If any existing test constructs a `UserDto` or calls `toUserDto` directly with a fixed argument list, it will fail to compile/run until updated with the new 6th argument — fix any such call sites the same way.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/users/users.schemas.ts backend/src/modules/users/users.service.ts backend/src/modules/users/users.routes.ts backend/src/modules/auth/auth.routes.ts backend/src/modules/gift-campaigns/gift-campaigns.repo.ts
git commit -m "feat(users): expose activeClaimableCampaign on GET/PATCH /v1/me and sign-in"
```

---

### Task 14: Frontend — i18n copy (rename `topUpBonus` → `festivalGift`, generalize the body)

**Files:**
- Modify: `i18n/resources.ts`

`topUpBonus.*` is referenced only from `components/TopUpBonusPrompt.tsx` (being deleted in Task 15) — confirmed via repo-wide grep, safe to rename in place rather than duplicate 77 strings. Only `eyebrow`/`title` stay, `body` swaps its "wallet running low" framing for `{{title}}` (the campaign's own title, e.g. "Diwali 2026"). Every other key (`dismiss`/`cta`/`claiming`/`claimedTitle`/`claimedBody`/`chatCta`/`chatPrompt`/`error`/`retry`) is untouched, already-translated text.

- [ ] **Step 1: English block** (currently at line 1276-1289) — rename the key and edit `body`:

```typescript
      festivalGift: {
        eyebrow: "On the house",
        title: "{{amount}} for you",
        body: "To celebrate {{title}}, here's {{amount}} from us — no strings. Claim it today and ask Aroha AI whatever is on your mind.",
        dismiss: "Maybe later",
        cta: "Claim {{amount}}",
        claiming: "Claiming…",
        claimedTitle: "{{amount}} added!",
        claimedBody: "Your balance is {{balance}}. Want more? Share Aroha with friends and family and earn every time one of them joins.",
        chatCta: "Ask the stars a question",
        chatPrompt: "What do the stars say about the months ahead for me?",
        error: "Something went wrong. Please try again.",
        retry: "Retry",
      },
```

- [ ] **Step 2: Hindi block** (line 3822-3835):

```typescript
      festivalGift: {
        eyebrow: "हमारी ओर से",
        title: "आपके लिए {{amount}}",
        body: "{{title}} के अवसर पर, हमारी ओर से {{amount}} — बिना किसी शर्त के। आज ही पाएं और Aroha AI से जो मन में है वो पूछें।",
        dismiss: "बाद में",
        cta: "{{amount}} पाएं",
        claiming: "जोड़ा जा रहा है…",
        claimedTitle: "{{amount}} जुड़ गए!",
        claimedBody: "आपका बैलेंस अब {{balance}} है। और चाहिए? Aroha को दोस्तों और परिवार के साथ शेयर करें — हर जुड़ने वाले दोस्त पर कमाएं।",
        chatCta: "सितारों से एक सवाल पूछें",
        chatPrompt: "आने वाले महीनों के बारे में मेरे सितारे क्या कहते हैं?",
        error: "कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।",
        retry: "फिर से कोशिश करें",
      },
```

- [ ] **Step 3: Bengali block** (line 5846-5859):

```typescript
      festivalGift: {
        eyebrow: "আমাদের পক্ষ থেকে",
        title: "আপনার জন্য {{amount}}",
        body: "{{title}} উপলক্ষে, আমাদের পক্ষ থেকে {{amount}} — কোনো শর্ত ছাড়াই। আজই নিন এবং Aroha AI-কে মনের যে কোনো প্রশ্ন করুন।",
        dismiss: "পরে",
        cta: "{{amount}} নিন",
        claiming: "যোগ করা হচ্ছে…",
        claimedTitle: "{{amount}} যোগ হয়েছে!",
        claimedBody: "আপনার ব্যালেন্স এখন {{balance}}। আরও চান? Aroha বন্ধু ও পরিবারের সাথে শেয়ার করুন — প্রতিটি বন্ধু যোগ দিলেই উপার্জন করুন।",
        chatCta: "তারাদের একটি প্রশ্ন জিজ্ঞাসা করুন",
        chatPrompt: "আগামী মাসগুলি সম্পর্কে আমার তারারা কী বলে?",
        error: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
      },
```

- [ ] **Step 4: Marathi block** (line 7871-7884):

```typescript
      festivalGift: {
        eyebrow: "आमच्याकडून",
        title: "तुमच्यासाठी {{amount}}",
        body: "{{title}} निमित्ताने, आमच्याकडून {{amount}} — कोणत्याही अटीशिवाय. आजच मिळवा आणि Aroha AI ला मनातलं काहीही विचारा.",
        dismiss: "नंतर",
        cta: "{{amount}} मिळवा",
        claiming: "जोडले जात आहे…",
        claimedTitle: "{{amount}} जोडले गेले!",
        claimedBody: "तुमची शिल्लक आता {{balance}} आहे. आणखी हवे? Aroha मित्र आणि कुटुंबासोबत शेअर करा — सामील होणाऱ्या प्रत्येक मित्रामागे कमवा.",
        chatCta: "ताऱ्यांना एक प्रश्न विचारा",
        chatPrompt: "येणाऱ्या महिन्यांबद्दल माझे तारे काय सांगतात?",
        error: "काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.",
        retry: "पुन्हा प्रयत्न करा",
      },
```

- [ ] **Step 5: Telugu block** (line 9892-9905):

```typescript
      festivalGift: {
        eyebrow: "మా తరపు నుండి",
        title: "మీ కోసం {{amount}}",
        body: "{{title}} సందర్భంగా, మా తరపు నుండి {{amount}} — ఎలాంటి షరతులు లేవు. ఈ రోజే పొందండి, మీ మనసులోని ఏ ప్రశ్ననైనా Aroha AI ని అడగండి.",
        dismiss: "తర్వాత",
        cta: "{{amount}} పొందండి",
        claiming: "జోడిస్తోంది…",
        claimedTitle: "{{amount}} జోడించబడింది!",
        claimedBody: "మీ బ్యాలెన్స్ ఇప్పుడు {{balance}}. ఇంకా కావాలా? Aroha ని స్నేహితులు, కుటుంబంతో పంచుకోండి — చేరిన ప్రతి స్నేహితుడికీ సంపాదించండి.",
        chatCta: "నక్షత్రాలను ఒక ప్రశ్న అడగండి",
        chatPrompt: "రాబోయే నెలల గురించి నా నక్షత్రాలు ఏమి చెబుతున్నాయి?",
        error: "ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
        retry: "మళ్లీ ప్రయత్నించండి",
      },
```

- [ ] **Step 6: Tamil block** (line 11919-11932):

```typescript
      festivalGift: {
        eyebrow: "எங்கள் சார்பாக",
        title: "உங்களுக்கு {{amount}}",
        body: "{{title}} முன்னிட்டு, எங்கள் சார்பாக {{amount}} — எந்த நிபந்தனையும் இல்லை. இன்றே பெற்று, மனதில் உள்ள எதையும் Aroha AI-டம் கேளுங்கள்.",
        dismiss: "பின்னர்",
        cta: "{{amount}} பெறுங்கள்",
        claiming: "சேர்க்கப்படுகிறது…",
        claimedTitle: "{{amount}} சேர்க்கப்பட்டது!",
        claimedBody: "உங்கள் இருப்பு இப்போது {{balance}}. இன்னும் வேண்டுமா? Aroha-வை நண்பர்கள், குடும்பத்துடன் பகிருங்கள் — இணையும் ஒவ்வொரு நண்பருக்கும் சம்பாதியுங்கள்.",
        chatCta: "நட்சத்திரங்களிடம் ஒரு கேள்வி கேளுங்கள்",
        chatPrompt: "வரும் மாதங்களைப் பற்றி என் நட்சத்திரங்கள் என்ன சொல்கின்றன?",
        error: "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
        retry: "மீண்டும் முயற்சிக்கவும்",
      },
```

- [ ] **Step 7: Gujarati block** (line 13938-13951):

```typescript
      festivalGift: {
        eyebrow: "અમારા તરફથી",
        title: "તમારા માટે {{amount}}",
        body: "{{title}} નિમિત્તે, અમારા તરફથી {{amount}} — કોઈ શરત વગર. આજે જ મેળવો અને Aroha AI ને મનમાં જે હોય તે પૂછો.",
        dismiss: "પછી",
        cta: "{{amount}} મેળવો",
        claiming: "ઉમેરાઈ રહ્યું છે…",
        claimedTitle: "{{amount}} ઉમેરાયા!",
        claimedBody: "તમારું બેલેન્સ હવે {{balance}} છે. વધુ જોઈએ છે? Aroha ને મિત્રો અને પરિવાર સાથે શેર કરો — જોડાનાર દરેક મિત્ર પર કમાઓ.",
        chatCta: "તારાઓને એક પ્રશ્ન પૂછો",
        chatPrompt: "આવનારા મહિનાઓ વિશે મારા તારા શું કહે છે?",
        error: "કંઈક ખોટું થયું. ફરી પ્રયાસ કરો.",
        retry: "ફરી પ્રયાસ કરો",
      },
```

- [ ] **Step 8: Verify no other file still references the old key**

Run (repo root): `grep -rn "topUpBonus\." --include="*.tsx" --include="*.ts" .`
Expected: no matches (Task 15 deletes the one file that had them; if this repo-wide check still shows a match anywhere else, stop and investigate before proceeding — something depends on the old key that wasn't accounted for).

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(i18n): generalize topUpBonus copy into festivalGift across 7 languages"
```

---

### Task 15: Frontend — generic `FestivalGiftModal`, replacing `TopUpBonusPrompt` + `useClaimCampaign`

**Files:**
- Create: `components/FestivalGiftModal.tsx`
- Delete: `components/TopUpBonusPrompt.tsx`
- Delete: `hooks/useClaimCampaign.ts`
- Modify: `app/layout.tsx`
- Modify: `lib/api.ts`

`useClaimCampaign` is used only by `TopUpBonusPrompt` (confirmed via grep) — with only one consumer left and that consumer now reading `user.activeClaimableCampaign` instead of taking hardcoded props, the hook is an abstraction with no remaining reason to exist as a separate file; its mechanics fold directly into the new component.

- [ ] **Step 1: Add `activeClaimableCampaign` to the `User` type.** In `lib/api.ts`, next to `claimedCampaigns` (line 84):

```typescript
  claimedCampaigns: string[];
  /**
   * Whichever self-claim gift campaign (festival or custom) is currently
   * live and eligible for this user, or null. Server-computed — see
   * resolveActiveClaimableCampaign in the backend's users.service.ts.
   */
  activeClaimableCampaign: {
    key: string;
    title: string;
    amountPaise: number;
    validUntil: string;
  } | null;
```

- [ ] **Step 2: Write `FestivalGiftModal.tsx`** — same visual treatment as `TopUpBonusPrompt.tsx` (gift icon, gold gradient card, offer/claiming/claimed/error states), driven by `user.activeClaimableCampaign` instead of hardcoded props:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useFeature } from "@/hooks/useFeature";
import { useReferralAmounts } from "@/hooks/useReferralAmounts";
import { formatRupees } from "@/lib/format";
import { api, ApiError } from "@/lib/api";
import { CHAT_PENDING_CONTEXT_KEY, type ChatPendingPayload } from "@/lib/chat-handoff";
import ShareOptionsSheet from "@/components/ShareOptionsSheet";

type Status = "offer" | "claiming" | "claimed" | "error";

/**
 * Generic replacement for the old per-campaign hardcoded modal
 * (TopUpBonusPrompt.tsx + useClaimCampaign.ts) — driven entirely by
 * `user.activeClaimableCampaign`, which the backend computes from either the
 * static CLAIM_CAMPAIGNS array or an admin-created gift_campaigns row. A new
 * festival needs zero frontend changes: it's a form submission in
 * /admin/gift-campaigns, not a new component + layout.tsx mount + deploy.
 */
export default function FestivalGiftModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const chatFeature = useFeature("nav.askAI");
  const referralAmounts = useReferralAmounts();

  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<Status>("offer");
  const [newBalancePaise, setNewBalancePaise] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const campaign = user?.activeClaimableCampaign ?? null;
  const dismissKey = campaign ? `aroha:festivalGift:${campaign.key}:v1` : null;

  useEffect(() => {
    setDismissed(false);
    if (typeof window === "undefined" || !dismissKey) return;
    if (window.localStorage.getItem(dismissKey)) setDismissed(true);
  }, [dismissKey]);

  const visible =
    !!campaign && permissionsResolved && !!user?.profileCompletedAt && !dismissed;

  const dismiss = () => {
    if (dismissKey) {
      try {
        window.localStorage.setItem(dismissKey, "1");
      } catch {
        // localStorage unavailable — the modal just reappears next open, same as ShareAppPrompt's fallback.
      }
    }
    setDismissed(true);
  };

  useDismissOnBackPress(visible && status !== "claiming", dismiss);

  const claim = async () => {
    if (!campaign) return;
    setStatus("claiming");
    try {
      const result = await api.claimCampaignBonus(campaign.key);
      await refresh();
      setNewBalancePaise(result.walletBalancePaise);
      setStatus("claimed");
    } catch (err) {
      setStatus("error");
    }
  };

  const goToChat = () => {
    const payload: ChatPendingPayload = { message: t("festivalGift.chatPrompt") };
    sessionStorage.setItem(CHAT_PENDING_CONTEXT_KEY, JSON.stringify(payload));
    dismiss();
    router.push("/ai-chat");
  };

  if (!campaign) return null;
  const amount = formatRupees(campaign.amountPaise);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26 }}
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-card border border-gold/20"
            >
              <div className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-600" />

              <div className="p-6 flex flex-col items-center text-center">
                <span className="text-gold mb-3">
                  <Gift size={48} />
                </span>

                {status === "offer" || status === "claiming" ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted mb-1">
                      {t("festivalGift.eyebrow")}
                    </p>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("festivalGift.title", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.body", { amount, title: campaign.title })}
                    </p>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={dismiss}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity disabled:opacity-50"
                      >
                        {t("festivalGift.dismiss")}
                      </button>
                      <button
                        onClick={claim}
                        disabled={status === "claiming"}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity disabled:opacity-70"
                      >
                        {status === "claiming"
                          ? t("festivalGift.claiming")
                          : t("festivalGift.cta", { amount })}
                      </button>
                    </div>
                  </>
                ) : status === "claimed" ? (
                  <>
                    <h2 className="text-xl font-display text-foreground mb-2">
                      {t("festivalGift.claimedTitle", { amount })}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.claimedBody", { balance: formatRupees(newBalancePaise) })}
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      {chatFeature.enabled && (
                        <button
                          onClick={goToChat}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                        >
                          <Sparkles size={16} />
                          {t("festivalGift.chatCta")}
                        </button>
                      )}
                      {user?.referralCode && (
                        <button
                          onClick={() => setSheetOpen(true)}
                          className="py-3 rounded-xl border border-gold/20 text-foreground text-sm font-medium transition-opacity"
                        >
                          {t("sharePrompt.title", referralAmounts)}
                        </button>
                      )}
                      <button onClick={dismiss} className="py-2 text-sm text-muted">
                        {t("common.close")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted leading-relaxed mb-5">
                      {t("festivalGift.error")}
                    </p>
                    <button
                      onClick={claim}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold transition-opacity"
                    >
                      {t("festivalGift.retry")}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {user?.referralCode && (
        <ShareOptionsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} code={user.referralCode} />
      )}
    </>
  );
}
```

Note what moved server-side and dropped out of this component versus the old hook: the balance ceiling, already-claimed, signed-up-today, feature-enabled, and date-window checks. All of those are now baked into whether `activeClaimableCampaign` is non-null at all (see Task 13's `resolveActiveClaimableCampaign`) — the component only adds its own client-only concerns (permissions resolved, profile complete, per-device dismiss).

- [ ] **Step 3: Delete the old files**

```bash
rm components/TopUpBonusPrompt.tsx hooks/useClaimCampaign.ts
```

- [ ] **Step 4: Swap the mount in `app/layout.tsx`.** Replace:

```typescript
import TopUpBonusPrompt from "@/components/TopUpBonusPrompt";
```

with:

```typescript
import FestivalGiftModal from "@/components/FestivalGiftModal";
```

and:

```typescript
                        <TopUpBonusPrompt />
```

with:

```typescript
                        <FestivalGiftModal />
```

- [ ] **Step 5: Build and manually verify**

Run (repo root): `npm run build`
Expected: no TypeScript errors (this will catch any remaining reference to the deleted files or old hook).

Then: `npm run dev`, sign in as a test user with no active campaign — confirm nothing renders. This can't be fully exercised end-to-end until Task 16-17 give the admin a way to actually send a campaign; a full click-through happens in Task 19's verification step.

- [ ] **Step 6: Commit**

```bash
git add components/FestivalGiftModal.tsx app/layout.tsx lib/api.ts
git rm components/TopUpBonusPrompt.tsx hooks/useClaimCampaign.ts
git commit -m "feat(campaigns): replace per-campaign hardcoded modal with a generic one"
```

---

### Task 16: Frontend — `lib/admin-api.ts` gift-campaign client

**Files:**
- Modify: `lib/admin-api.ts`

- [ ] **Step 1: Add types and methods**, following the `AdminGroupRow`/`listGroups`/`createGroup`/`deleteGroup` pattern (around lines 146-160 and 306-313):

```typescript
// ─── Gift Campaigns ───────────────────────────────────────────────────────

export interface AdminGiftCampaignRow {
  id: string;
  key: string;
  title: string;
  amountPaise: number;
  audienceMaxBalancePaise: number | null;
  deliveryMode: "self_claim" | "auto_credit";
  claimWindowDays: number | null;
  creditExpiryDays: number | null;
  scheduledSendAt: string | null;
  status: "draft" | "scheduled" | "sent" | "canceled";
  validFrom: string | null;
  validUntil: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface CreateGiftCampaignBody {
  title: string;
  amountPaise: number;
  audienceMaxBalancePaise: number | null;
  deliveryMode: "self_claim" | "auto_credit";
  claimWindowDays: number | null;
  creditExpiryDays: number | null;
  scheduledSendAt: string | null;
}

export interface AudiencePreview {
  eligibleCount: number;
  pushableCount: number;
  totalCostPaise: number;
}
```

and, in the `adminApi` object, alongside `listGroups`/`createGroup`/`deleteGroup`:

```typescript
  listGiftCampaigns: () =>
    request<{ campaigns: AdminGiftCampaignRow[] }>("/v1/admin/gift-campaigns", { auth: true }),

  createGiftCampaign: (body: CreateGiftCampaignBody) =>
    request<AdminGiftCampaignRow>("/v1/admin/gift-campaigns", { method: "POST", body, auth: true }),

  previewGiftCampaignAudience: (amountPaise: number, audienceMaxBalancePaise: number | null) =>
    request<AudiencePreview>("/v1/admin/gift-campaigns/preview", {
      method: "POST",
      body: { amountPaise, audienceMaxBalancePaise },
      auth: true,
    }),

  sendGiftCampaignNow: (id: string) =>
    request<AdminGiftCampaignRow>(`/v1/admin/gift-campaigns/${id}/send`, { method: "POST", auth: true }),

  cancelGiftCampaign: (id: string) =>
    request<void>(`/v1/admin/gift-campaigns/${id}`, { method: "DELETE", auth: true }),
```

- [ ] **Step 2: Type-check**

Run (repo root): `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/admin-api.ts
git commit -m "feat(admin): gift-campaigns API client"
```

---

### Task 17: Frontend — `/admin/gift-campaigns` page + nav entry

**Files:**
- Create: `app/admin/gift-campaigns/page.tsx`
- Modify: `app/admin/layout.tsx`

Follows `app/admin/groups/page.tsx`'s list + create-modal shape, reusing `BottomSheetModal`/`ConfirmModal`/`ErrorRetry` per this repo's "prefer reusable components" convention rather than building new modal chrome.

- [ ] **Step 1: Add the nav entry.** In `app/admin/layout.tsx`, add to `SECTIONS` (currently lines 44-53), after `"/admin/referrals"`:

```typescript
  { href: "/admin/gift-campaigns", label: "Gift Campaigns" },
```

- [ ] **Step 2: Write the page**

```typescript
"use client";

// Deliberate i18n exception: /admin is an internal owner-only tool — stays
// plain hardcoded English per the codebase's own rule (see layout.tsx).

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  type AdminGiftCampaignRow,
  type CreateGiftCampaignBody,
  type AudiencePreview,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import ErrorRetry from "@/components/admin/ErrorRetry";
import ConfirmModal from "@/components/admin/ConfirmModal";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/** Pre-authored suggestions only — the admin can still type any custom title. Dates are best-known-so-far; lunar ones can move ±1 day. */
const FESTIVAL_SUGGESTIONS: { title: string; date: string }[] = [
  { title: "Eid Milad-un-Nabi 2026", date: "2026-08-25" },
  { title: "Raksha Bandhan 2026", date: "2026-08-28" },
  { title: "Janmashtami 2026", date: "2026-09-04" },
  { title: "Ganesh Chaturthi 2026", date: "2026-09-14" },
  { title: "Gandhi Jayanti 2026", date: "2026-10-02" },
  { title: "Navratri 2026", date: "2026-10-11" },
  { title: "Dussehra 2026", date: "2026-10-20" },
  { title: "Karva Chauth 2026", date: "2026-10-29" },
  { title: "Diwali 2026", date: "2026-11-08" },
  { title: "Bhai Dooj 2026", date: "2026-11-11" },
  { title: "Guru Nanak Gurpurab 2026", date: "2026-11-24" },
  { title: "Christmas Eve 2026", date: "2026-12-24" },
  { title: "Christmas 2026", date: "2026-12-25" },
  { title: "New Year 2027", date: "2027-01-01" },
  { title: "Lohri 2027", date: "2027-01-13" },
  { title: "Makar Sankranti 2027", date: "2027-01-14" },
  { title: "Republic Day 2027", date: "2027-01-26" },
  { title: "Ramadan Begins 2027", date: "2027-02-09" },
  { title: "Eid-ul-Fitr 2027", date: "2027-03-10" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: AdminGiftCampaignRow["status"]): string {
  switch (status) {
    case "draft":
      return "⚪ draft";
    case "scheduled":
      return "🟡 scheduled";
    case "sent":
      return "✅ sent";
    case "canceled":
      return "⚫ canceled";
  }
}

function NewCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: AdminGiftCampaignRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [maxBalanceRupees, setMaxBalanceRupees] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"self_claim" | "auto_credit">("auto_credit");
  const [claimWindowDays, setClaimWindowDays] = useState("5");
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [creditExpiryDays, setCreditExpiryDays] = useState("14");
  const [scheduledSendAt, setScheduledSendAt] = useState("");
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPaise = Math.round(parseFloat(amountRupees || "0") * 100);
  const maxBalancePaise = maxBalanceRupees.trim() ? Math.round(parseFloat(maxBalanceRupees) * 100) : null;

  async function runPreview() {
    if (!amountPaise) return;
    setPreviewBusy(true);
    try {
      const result = await adminApi.previewGiftCampaignAudience(amountPaise, maxBalancePaise);
      setPreview(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to preview audience");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !amountPaise) {
      setError("Title and a positive amount are required");
      return;
    }
    setBusy(true);
    setError(null);
    const body: CreateGiftCampaignBody = {
      title: title.trim(),
      amountPaise,
      audienceMaxBalancePaise: maxBalancePaise,
      deliveryMode,
      claimWindowDays: deliveryMode === "self_claim" ? parseInt(claimWindowDays, 10) || null : null,
      creditExpiryDays: expiryEnabled ? parseInt(creditExpiryDays, 10) || null : null,
      scheduledSendAt: scheduledSendAt ? new Date(scheduledSendAt).toISOString() : null,
    };
    try {
      const row = await adminApi.createGiftCampaign(body);
      onCreated(row);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheetModal
      onClose={() => !busy && onClose()}
      closeLabel="Close"
      header={<h2 className="text-base font-semibold text-foreground">New Gift Campaign</h2>}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted block mb-1">Festival or custom title</label>
          <input
            type="text"
            list="festival-suggestions"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Diwali 2026"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
          <datalist id="festival-suggestions">
            {FESTIVAL_SUGGESTIONS.map((f) => (
              <option key={f.title} value={f.title}>{`${f.date}`}</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Amount (₹)</label>
          <input
            type="number"
            min="1"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Only wallets under ₹ (blank = everyone)</label>
          <input
            type="number"
            min="1"
            value={maxBalanceRupees}
            onChange={(e) => setMaxBalanceRupees(e.target.value)}
            placeholder="e.g. 250"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted block mb-2">Delivery</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMode("auto_credit")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${deliveryMode === "auto_credit" ? "bg-gold text-black border-gold" : "border-border text-muted"}`}
            >
              Auto-credit
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode("self_claim")}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${deliveryMode === "self_claim" ? "bg-gold text-black border-gold" : "border-border text-muted"}`}
            >
              Self-claim
            </button>
          </div>
        </div>

        {deliveryMode === "self_claim" && (
          <div>
            <label className="text-xs text-muted block mb-1">Claim window (days)</label>
            <input
              type="number"
              min="1"
              value={claimWindowDays}
              onChange={(e) => setClaimWindowDays(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-xs text-muted mb-1">
            <input type="checkbox" checked={expiryEnabled} onChange={(e) => setExpiryEnabled(e.target.checked)} />
            Credit expires if unspent
          </label>
          {expiryEnabled && (
            <input
              type="number"
              min="1"
              value={creditExpiryDays}
              onChange={(e) => setCreditExpiryDays(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
              placeholder="Days after credit"
            />
          )}
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Schedule for (blank = save as draft, send manually)</label>
          <input
            type="datetime-local"
            value={scheduledSendAt}
            onChange={(e) => setScheduledSendAt(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          />
        </div>

        <button
          type="button"
          onClick={runPreview}
          disabled={!amountPaise || previewBusy}
          className="w-full py-2 rounded-xl border border-border text-foreground text-xs font-medium disabled:opacity-50"
        >
          {previewBusy ? "Checking…" : "Preview audience"}
        </button>
        {preview && (
          <p className="text-xs text-muted text-center">
            {preview.eligibleCount} eligible ({preview.pushableCount} pushable) · total cost{" "}
            {formatRupees(preview.totalCostPaise)}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="w-full px-4 py-3 rounded-2xl bg-gold text-black text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Campaign"}
        </button>
      </div>
    </BottomSheetModal>
  );
}

export default function AdminGiftCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminGiftCampaignRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminGiftCampaignRow | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [sendBusyId, setSendBusyId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listGiftCampaigns()
      .then((res) => setCampaigns(res.campaigns))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleSendNow(row: AdminGiftCampaignRow) {
    setSendBusyId(row.id);
    setSendError(null);
    try {
      const updated = await adminApi.sendGiftCampaignNow(row.id);
      setCampaigns((prev) => prev && prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send campaign");
    } finally {
      setSendBusyId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await adminApi.cancelGiftCampaign(cancelTarget.id);
      setCampaigns((prev) =>
        prev && prev.map((c) => (c.id === cancelTarget.id ? { ...c, status: "canceled" } : c)),
      );
      setCancelTarget(null);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel campaign");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gold">Gift Campaigns</h1>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="px-4 py-2 rounded-full bg-gold text-black text-sm font-medium"
        >
          New Campaign
        </button>
      </div>

      {loading && !campaigns && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchCampaigns} />}
      {sendError && <p className="text-sm text-red-400 mb-3">{sendError}</p>}

      {campaigns && !error && (
        campaigns.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">
            No gift campaigns yet. Create one for an upcoming festival or occasion.
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted">{statusBadge(c.status)}</span>
                </div>
                <p className="text-xs text-muted mb-2">
                  {formatRupees(c.amountPaise)} ·{" "}
                  {c.audienceMaxBalancePaise ? `wallets under ${formatRupees(c.audienceMaxBalancePaise)}` : "all users"}{" "}
                  · {c.deliveryMode === "self_claim" ? `self-claim, ${c.claimWindowDays}-day window` : "auto-credit"}
                  {c.creditExpiryDays ? ` · expires in ${c.creditExpiryDays} days` : ""}
                </p>
                <p className="text-xs text-muted mb-3">
                  {c.status === "scheduled" && `Scheduled for ${formatDateTime(c.scheduledSendAt)}`}
                  {c.status === "sent" && `Sent ${formatDateTime(c.sentAt)}`}
                  {c.status === "draft" && "Not scheduled — send manually when ready"}
                  {c.status === "canceled" && "Canceled"}
                </p>
                {(c.status === "draft" || c.status === "scheduled") && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendNow(c)}
                      disabled={sendBusyId === c.id}
                      className="px-3 py-1.5 rounded-full bg-gold text-black text-xs font-medium disabled:opacity-50"
                    >
                      {sendBusyId === c.id ? "Sending…" : "Send Now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelTarget(c)}
                      className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                    >
                      {c.status === "scheduled" ? "Cancel" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreated={(row) => {
            setCampaigns((prev) => (prev ? [row, ...prev] : [row]));
            setShowNew(false);
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel Campaign"
          body={
            <>
              Cancel <strong className="text-foreground">{cancelTarget.title}</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Cancel Campaign"
          busy={cancelBusy}
          error={cancelError}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
```

Before wiring this up, confirm `formatRupees` accepts a `number | null` the way it's called in the preview line (`formatRupees(preview.totalCostPaise)` is always a number, fine) — and confirm `ConfirmModal`'s exact prop names (`title`/`body`/`confirmLabel`/`busy`/`error`/`onConfirm`/`onCancel`) by reading `components/admin/ConfirmModal.tsx` before this step; adjust prop names if they differ from the groups page's usage.

- [ ] **Step 3: Build**

Run (repo root): `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/gift-campaigns/page.tsx app/admin/layout.tsx
git commit -m "feat(admin): gift campaigns list + create UI"
```

---

### Task 18: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start both servers**

```bash
cd backend && npm run dev
```
```bash
npm run dev   # repo root, separate terminal
```

- [ ] **Step 2: Create and send an `auto_credit` campaign**

In the browser, sign in as an admin, go to `/admin/gift-campaigns`, create a campaign: title "Test Gift", amount ₹10, audience blank (everyone), delivery auto-credit, no expiry, no schedule. Click "Preview audience" — confirm it shows a real eligible/pushable count from your dev DB's actual user table. Click "Send Now".

Expected: campaign flips to `✅ sent`; querying a test user's wallet balance (or `GET /v1/me` as that user) shows it increased by ₹10 and a `wallet_transactions` row exists with `reason` = the generated key.

- [ ] **Step 3: Create and claim a `self_claim` campaign**

Create a second campaign: delivery self-claim, 5-day claim window, amount ₹20, audience "under ₹99999" (broad enough to include your test user). Send it. Sign in as that test user in the app (not `/admin`) — the new `FestivalGiftModal` should appear with the campaign's title interpolated into the body text, in whatever language that test user's `locale` is set to. Claim it, confirm the balance updates and the modal shows the claimed state.

- [ ] **Step 4: Verify the claim-bonus route's existing guardrails still work**

As the same user, try refreshing and claiming again (directly via `POST /v1/me/claim-bonus/<key>` if the modal has already dismissed itself) — expect `409 claimed: false` behavior (already claimed), matching pre-existing idempotency.

- [ ] **Step 5: Take a screenshot of the admin UI** for the record (matches the "working picture" the design promised) and send it.

- [ ] **Step 6: Run both full test suites one last time**

```bash
cd backend && npm run build && npm test
```
```bash
npm run build   # repo root
```
Expected: both build clean; backend test count is the pre-existing baseline plus this plan's ~20 new tests, all passing.

- [ ] **Step 7: Final commit (if verification surfaced any fixes)**

Only if Steps 2-6 required code changes — commit those separately with a clear message per fix, not bundled into a vague "fixes" commit.

---

## Explicitly not in this plan (per the design's out-of-scope section)

- Adding the new EC2 crontab line for `cron-festival-campaigns.sh` — a deliberate, separate ops action (SSH to prod), not automated here.
- Migrating the 3 historical `CLAIM_CAMPAIGNS` static entries into `gift_campaigns`.
- Per-language custom copy per festival, or any audience targeting beyond a wallet-balance ceiling.
