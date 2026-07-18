# Credits → Rupees (₹) Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract "credits" currency with a real-money ₹ wallet balance everywhere a user can see or spend it — live backend, live frontend, mobile, and (per explicit decision) the dead legacy `apps/api` system too — using a fixed 1 credit = ₹10 conversion rate, with existing users' balances migrated at that same rate.

**Architecture:** Three independent systems get the same treatment in parallel: (1) the **live** Hono/Drizzle backend (`jyotish-backend/src`, deployed on EC2) + the **live** Next.js frontend (`frontend/`) it serves + the Capacitor mobile shell around it — this is what real users and real money touch today; (2) the **dead** legacy Next.js/Supabase/Razorpay backend (`jyotish-backend/apps/api`) — no live traffic, lower urgency, same pattern applied for codebase consistency. Money is stored as an integer **paise** column throughout (matches the existing `orders.amountPaise` / `priceInPaise` convention already used in this codebase), displayed via a shared `formatRupees()` helper. Recharging becomes a flat 1:1 top-up (pay ₹X, wallet gets exactly ₹X) — no more volume-discount packs.

**Tech Stack:** Hono + Zod OpenAPI + Drizzle ORM + Postgres (live backend) · Next.js 15 / React 19 + react-i18next (live frontend) · Capacitor + Google Play Billing Library (mobile) · Next.js + Supabase + Razorpair (legacy apps/api)

---

## Part A — Read first: shared decisions & rollout order

**Conversion rate:** 1 credit = ₹10 = 1000 paise. Every existing "N credits" quantity in code/DB becomes `N * 1000` paise.

**Why paise, not rupees:** the codebase already stores money as integer paise in three places (`orders.amountPaise`, `billing.service.ts`'s `priceInPaise`, `coupons.minAmountPaise`) — matching that convention avoids float rounding bugs and needs no new pattern.

**Why 1:1 top-up instead of the old discount packs:** confirmed with the user — the old packs (e.g. pay ₹49, get 60 "credits") were priced nowhere near ₹10/unit. A blind ×10 conversion of "credits granted" while leaving price paid unchanged would create nonsense (pay ₹49, wallet gets ₹600). Recharge is redefined so **wallet credit = amount actually paid** (post any coupon discount), always.

**Google Play Billing constraint (read before touching Part D):** Play Billing one-time products each have exactly one fixed price set in the Play Console — there is no "let the user type any amount" mode on Android. So on **mobile**, "1:1 top-up" is implemented as a small set of fixed-price preset amounts (proposed: ₹50 / ₹100 / ₹200 / ₹500 / ₹1000 — adjust freely, these are placeholders), each a real one-time product that must be created in Play Console with that exact price. This is a **manual, non-code step** — see Task D1. On **web** (`apps/api`'s Razorpay checkout, the only place with a live web gateway), a true arbitrary-amount top-up is possible and is already half-built (`CUSTOM_RATE_RUPEES` in `credits/order/route.ts`) — Part E reuses that.

**Rollout order (do not deploy out of order — see Part F for the full sequence):**
1. Part B (live backend) fully implemented, tested locally, migration ready but **not yet run on prod**.
2. Part C (live frontend) implemented against Part B's new field names, in a feature branch.
3. Deploy backend (Part B) — runs the migration, converts real user balances. Verify balances via `/healthz`-style smoke check before frontend deploy.
4. Deploy frontend (Part C) immediately after — a window where backend has converted but frontend still says "credits" is confusing but not broken (numbers just look 10x too big); the reverse order (frontend first) is actively broken (shows ₹ labels on credit-scale numbers, 10x too small).
5. Part D (mobile Play Console) can happen anytime before or after — the mobile shell has no credit text of its own, it just needs matching product IDs before anyone can top up on Android.
6. Part E (legacy apps/api) is fully independent — no live users, no deploy-order coupling to anything above. Do whenever.

---

## Part B — Live Backend (`C:\dev\aroha-astrology\jyotish-backend`, `src/`)

### Task B1: Schema rename + data migration

**Files:**
- Modify: `src/db/schema.ts:320` (users.credits), `:550-569` (creditTransactions), `:611-642` (orders)
- Create: `src/db/migrations/0024_credits_to_wallet_balance.sql`
- Modify: `src/db/migrations/meta/_journal.json` (new entry — see step 3)

- [ ] **Step 1: Update `src/db/schema.ts`**

Change line 320 from:
```ts
    credits: integer('credits').notNull().default(50),
```
to:
```ts
    walletBalancePaise: integer('wallet_balance_paise').notNull().default(50000),
```

Change the `creditTransactions` table block (lines 550-569) — rename the table and its export:
```ts
export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index('wallet_transactions_user_id_idx').on(table.userId),
  }),
);
```

In the `orders` table (lines 611-642), delete the `credits` field entirely:
```ts
    /** Matches an id in billing.service.ts's TOP_UP_AMOUNTS — not its own table since the catalog is small/static. */
    packId: text('pack_id').notNull(),
    amountPaise: integer('amount_paise').notNull(),
```
(remove the `credits: integer('credits').notNull(),` line that sat between those two)

- [ ] **Step 2: Grep the whole `src/` tree for every remaining reference before writing the migration**

```bash
cd /c/dev/aroha-astrology/jyotish-backend
grep -rn "creditTransactions\|\.credits\b" src/ --include="*.ts" | grep -v "src/db/migrations"
```
Confirm every hit is one you intend to fix in Tasks B2–B6 below. If something unexpected shows up (a caller not covered by this plan), stop and note it — don't silently leave a reference to a column that's about to be renamed out from under it.

- [ ] **Step 3: Create the migration file**

Run:
```bash
cd /c/dev/aroha-astrology/jyotish-backend
npx drizzle-kit generate --custom --name=credits_to_wallet_balance
```
This creates an empty `src/db/migrations/0024_credits_to_wallet_balance.sql` and the matching journal entry — it does NOT introspect the diff (a plain `generate` might emit a destructive DROP+ADD for the rename, which would silently zero every user's balance; `--custom` avoids that entirely by giving you a blank file to hand-write).

Replace the generated file's contents with:
```sql
-- Rename users.credits -> wallet_balance_paise, converting every existing
-- credit-count balance to its paise equivalent at the fixed rate of
-- 1 credit = Rs 10 = 1000 paise.
ALTER TABLE users RENAME COLUMN credits TO wallet_balance_paise;
UPDATE users SET wallet_balance_paise = wallet_balance_paise * 1000;
ALTER TABLE users ALTER COLUMN wallet_balance_paise SET DEFAULT 50000;

-- Rename the ledger table + convert its historical amounts the same way.
ALTER TABLE credit_transactions RENAME TO wallet_transactions;
UPDATE wallet_transactions SET delta = delta * 1000, balance_after = balance_after * 1000;
ALTER INDEX credit_transactions_user_id_idx RENAME TO wallet_transactions_user_id_idx;

-- orders.credits becomes redundant once top-up is always 1:1 with the
-- amount actually paid (amountPaise/finalAmountPaise) — see billing.service.ts.
ALTER TABLE orders DROP COLUMN credits;
```

- [ ] **Step 4: Verify the migration runs cleanly against a local/dev DB**

```bash
npm run db:migrate
```
Expected: migration `0024_credits_to_wallet_balance` applies with no errors. Spot-check: `SELECT id, wallet_balance_paise FROM users LIMIT 5;` — every value should be the old credit count × 1000.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/migrations/0024_credits_to_wallet_balance.sql src/db/migrations/meta/_journal.json
git commit -m "feat(db): rename credits to wallet_balance_paise, migrate existing balances at Rs10/credit"
```

---

### Task B2: `src/modules/users/users.repo.ts` — rename the deduct/add primitives

**Files:**
- Modify: `src/modules/users/users.repo.ts:132-156` (deductCredits/addCredits), `:341-376` (unlockHouseForUser/GEMSTONE_UNLOCK_COST/unlockGemstoneForUser)

- [ ] **Step 1: Rename `deductCredits`/`addCredits`, switch column**

Replace lines 132-156:
```ts
/**
 * Atomically deduct `amountPaise` from the wallet if (and only if) the user
 * has enough. Same claim-style primitive as `unlockHouseForUser` — the
 * balance check and the debit happen in one conditional UPDATE so two
 * concurrent spends can never both succeed against a balance that only
 * covers one of them.
 */
export async function deductWalletBalance(userId: string, amountPaise: number): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE users
    SET wallet_balance_paise = wallet_balance_paise - ${amountPaise}
    WHERE id = ${userId}
      AND wallet_balance_paise >= ${amountPaise}
    RETURNING *;
  `);
  return result.length > 0;
}

/** Add `amountPaise` back to the wallet (e.g. refunding a charge whose async job failed). */
export async function addWalletBalance(userId: string, amountPaise: number): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET wallet_balance_paise = wallet_balance_paise + ${amountPaise}
    WHERE id = ${userId};
  `);
}
```

- [ ] **Step 2: Rewrite `unlockHouseForUser` + gemstone cost + `unlockGemstoneForUser`**

Replace lines 341-376:
```ts
/** Cost in paise to unlock one kundli house's detail view (Rs 50 = 5 credits at the old rate). */
export const HOUSE_UNLOCK_COST_PAISE = 5000;

export async function unlockHouseForUser(userId: string, houseNumber: number) {
  const result = await db.execute(sql`
    UPDATE users
    SET wallet_balance_paise = wallet_balance_paise - ${HOUSE_UNLOCK_COST_PAISE},
        unlocked_houses = array_append(unlocked_houses, ${houseNumber})
    WHERE id = ${userId}
      AND wallet_balance_paise >= ${HOUSE_UNLOCK_COST_PAISE}
      AND NOT (${houseNumber} = ANY(unlocked_houses))
    RETURNING *;
  `);
  return result.length > 0;
}

/** Cost in paise to unlock the full gemstone report (whole report, one-time). Rs 100 = 10 credits at the old rate. */
export const GEMSTONE_UNLOCK_COST_PAISE = 10000;

/**
 * Atomically spend wallet balance to unlock the gemstone report — same
 * combined deduct-and-guard primitive as `unlockHouseForUser`. Returns false
 * if the user has too little balance OR the report is already unlocked, so a
 * second click can never double-charge.
 */
export async function unlockGemstoneForUser(userId: string) {
  const result = await db.execute(sql`
    UPDATE users
    SET wallet_balance_paise = wallet_balance_paise - ${GEMSTONE_UNLOCK_COST_PAISE},
        gemstone_unlocked_at = now()
    WHERE id = ${userId}
      AND wallet_balance_paise >= ${GEMSTONE_UNLOCK_COST_PAISE}
      AND gemstone_unlocked_at IS NULL
    RETURNING *;
  `);
  return result.length > 0;
}
```

- [ ] **Step 3: Fix every caller of the renamed functions**

```bash
grep -rn "deductCredits\|addCredits\b" src/ --include="*.ts"
```
Update each call site (expected: `src/modules/vastu/vastu.service.ts`, `src/modules/astro/astro.routes.ts` — see Tasks B4/B5) to use `deductWalletBalance`/`addWalletBalance` with a paise amount instead of a credit count.

- [ ] **Step 4: Commit**

```bash
git add src/modules/users/users.repo.ts
git commit -m "refactor(users): rename credit-spend primitives to operate on wallet_balance_paise"
```

---

### Task B3: `users.schemas.ts`, `users.service.ts`, `users.routes.ts` — field rename + wording

**Files:**
- Modify: `src/modules/users/users.schemas.ts:245,249` (UserSchema)
- Modify: `src/modules/users/users.service.ts:84-86` (toUserDto)
- Modify: `src/modules/users/users.routes.ts:67,93` (route summaries)

- [ ] **Step 1: `users.schemas.ts`** — change line 245 from `credits: z.number().int(),` to `walletBalancePaise: z.number().int().describe('Wallet balance in paise (100 paise = Rs 1)'),`. Line 249's description `"True once the user has spent credits to unlock the gemstone report"` → `"True once the user has spent wallet balance to unlock the gemstone report"`.

- [ ] **Step 2: `users.service.ts`** — in `toUserDto` (around line 84), change `credits: row.credits,` to `walletBalancePaise: row.walletBalancePaise,`.

- [ ] **Step 3: `users.routes.ts`** — line 67 summary `'Unlock a house using credits'` → `'Unlock a house using wallet balance'`; line 93 summary `'Unlock the full gemstone report using credits (one-time, whole report)'` → `'Unlock the full gemstone report using wallet balance (one-time, whole report)'`.

- [ ] **Step 4: Commit**

```bash
git add src/modules/users/users.schemas.ts src/modules/users/users.service.ts src/modules/users/users.routes.ts
git commit -m "refactor(users): expose walletBalancePaise instead of credits in the user DTO"
```

---

### Task B4: `src/modules/vastu/vastu.service.ts` — cost rename

**Files:**
- Modify: `src/modules/vastu/vastu.service.ts:27` (constant), `:75` (charge), `:109,139` (refund)

- [ ] **Step 1:** Change line 27 from `export const VASTU_CREDIT_COST = 5;` to `export const VASTU_COST_PAISE = 5000;`.
- [ ] **Step 2:** At line 75, change the `deductCredits(userId, VASTU_CREDIT_COST)` call to `deductWalletBalance(userId, VASTU_COST_PAISE)`.
- [ ] **Step 3:** At lines 109 and 139, change the `addCredits(userId, VASTU_CREDIT_COST)` refund calls to `addWalletBalance(userId, VASTU_COST_PAISE)`.
- [ ] **Step 4:** Update the import line at the top of the file from `import { deductCredits, addCredits } from '../users/users.repo.js';` to `import { deductWalletBalance, addWalletBalance } from '../users/users.repo.js';`.
- [ ] **Step 5: Commit**

```bash
git add src/modules/vastu/vastu.service.ts
git commit -m "refactor(vastu): rename credit cost to paise, Rs50 per report"
```

---

### Task B5: `src/modules/astro/astro.routes.ts` — chat message cost rename

**Files:**
- Modify: `src/modules/astro/astro.routes.ts:15` (constant), `:458` (charge), `:500,534` (refund)

- [ ] **Step 1:** Change line 15 from `const CHAT_MESSAGE_COST = 2;` to `const CHAT_MESSAGE_COST_PAISE = 2000;`.
- [ ] **Step 2:** At line 458, change `deductCredits(user.id, CHAT_MESSAGE_COST)` to `deductWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE)`.
- [ ] **Step 3:** At lines 500 and 534, change `addCredits(user.id, CHAT_MESSAGE_COST)` refund calls to `addWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE)`.
- [ ] **Step 4:** Update the `users.repo.js` import the same way as Task B4 Step 4.
- [ ] **Step 5: Commit**

```bash
git add src/modules/astro/astro.routes.ts
git commit -m "refactor(chat): rename per-message credit cost to paise, Rs20 per message"
```

---

### Task B6: Billing module — 1:1 top-up rewrite

**Files:**
- Modify: `src/modules/billing/billing.schemas.ts` (full rewrite of pack/balance/order schemas)
- Modify: `src/modules/billing/billing.service.ts` (full rewrite)
- Modify: `src/modules/billing/billing.repo.ts` (`confirmOrderAndGrantCredits`)
- Modify: `src/modules/billing/billing.routes.ts` (wording + response field renames)

- [ ] **Step 1: `billing.schemas.ts` — replace pack/balance/order shapes**

Replace `BillingBalanceResponseSchema` (lines 11-16):
```ts
export const BillingBalanceResponseSchema = z
  .object({
    walletBalancePaise: z.number().openapi({ example: 0 }),
    currency: z.string().default('INR').openapi({ example: 'INR' }),
  })
  .openapi('BillingBalanceResponse');
```

Replace `CreditPackSchema`/`CreditPacksResponseSchema` (lines 22-35):
```ts
export const TopUpAmountSchema = z
  .object({
    id: z.string().openapi({ example: 'topup_200' }),
    amountPaise: z.number().openapi({ example: 20000 }),
    currency: z.string().openapi({ example: 'INR' }),
    label: z.string().openapi({ example: '₹200' }),
    popular: z.boolean().optional(),
  })
  .openapi('TopUpAmount');

export const TopUpAmountsResponseSchema = z
  .object({ amounts: z.array(TopUpAmountSchema) })
  .openapi('TopUpAmountsResponse');
```

In `OrderSchema` (lines 71-86), delete the `credits: z.number(),` line.

In `ConfirmOrderResponseSchema` (lines 95-100), change `credits: z.number().openapi({ description: "User's new credit balance" }),` to `walletBalancePaise: z.number().openapi({ description: "User's new wallet balance in paise" }),`.

- [ ] **Step 2: `billing.service.ts` — replace `CREDIT_PACKS` with `TOP_UP_AMOUNTS`, rewrite grant logic**

Replace lines 14-40 (the pack catalog + accessors):
```ts
/**
 * Fixed top-up catalog. Each entry is a 1:1 top-up (pay this amount, wallet
 * gets exactly this amount) — the `id`s here MUST match real one-time
 * product IDs configured in the Google Play Console with the same price,
 * since Play Billing products are fixed-price (see Task D1 in the rollout
 * plan). Small and rarely-changing enough to keep as code rather than a DB
 * table — bump amounts here, no migration needed (but DOES need a matching
 * Play Console product edit).
 */
export const TOP_UP_AMOUNTS = [
  { id: 'topup_50', amountPaise: 5000, currency: 'INR', label: '₹50' },
  { id: 'topup_100', amountPaise: 10000, currency: 'INR', label: '₹100' },
  { id: 'topup_200', amountPaise: 20000, currency: 'INR', label: '₹200', popular: true },
  { id: 'topup_500', amountPaise: 50000, currency: 'INR', label: '₹500' },
  { id: 'topup_1000', amountPaise: 100000, currency: 'INR', label: '₹1000' },
] as const;

export function getTopUpAmounts() {
  return TOP_UP_AMOUNTS;
}

function findTopUpAmount(id: string) {
  const amount = TOP_UP_AMOUNTS.find((a) => a.id === id);
  if (!amount) throw Errors.badRequest(`Unknown top-up amount "${id}"`);
  return amount;
}
```
Update every other reference to `findPack`/`CREDIT_PACKS`/`getCreditPacks` in this file to the renamed versions (`findTopUpAmount`/`TOP_UP_AMOUNTS`/`getTopUpAmounts`). Note the old pack object had a `priceInPaise` field; the new one is called `amountPaise` — every place that read `pack.priceInPaise` (inside `resolveCoupon`'s caller in `validateCoupon()`, and inside `checkout()`) must read `amount.amountPaise` instead, not just get renamed in variable name. `computeDiscountPaise()` itself is unaffected (it already takes a raw `amountPaise` number, not the pack object).

In `checkout()` (lines 86-115), remove the `credits: pack.credits,` line from the `insertOrder` call (the `orders` table no longer has that column per Task B1), and change `amountPaise: pack.priceInPaise` to `amountPaise: amount.amountPaise`.

Replace `getUserCredits` (lines 135-139):
```ts
async function getUserWalletBalance(userId: string): Promise<number> {
  const user = await findActiveUserById(userId);
  if (!user) throw Errors.notFound('User not found');
  return user.walletBalancePaise;
}
```
Update its two call sites (around lines 171, 192) from `getUserCredits` / `{ order, credits }` to `getUserWalletBalance` / `{ order, walletBalancePaise }`.

In `confirmGooglePlayPurchase`'s return type and the `{ order, credits }` destructuring throughout the function, rename `credits` → `walletBalancePaise` to match.

In `toOrderDto` (lines 207-222), delete the `credits: order.credits,` line.

- [ ] **Step 2: `billing.repo.ts` — grant `finalAmountPaise`, not a separate credits count**

Replace `confirmOrderAndGrantCredits` (lines 72-110):
```ts
export async function confirmOrderAndGrantCredits(
  orderId: string,
  userId: string,
  gatewayPaymentId: string,
): Promise<{ order: OrderRow; walletBalancePaise: number } | undefined> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ status: 'paid', paidAt: new Date(), gatewayPaymentId })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId), eq(orders.status, 'pending')))
      .returning();

    if (!order) return undefined;

    if (order.couponId) {
      await tx
        .update(coupons)
        .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
        .where(eq(coupons.id, order.couponId));
    }

    const [userRow] = await tx
      .update(users)
      .set({
        walletBalancePaise: sql`${users.walletBalancePaise} + ${order.finalAmountPaise}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ walletBalancePaise: users.walletBalancePaise });

    if (!userRow) throw new Error('User not found while granting purchased wallet balance');

    await tx.insert(walletTransactions).values({
      userId,
      delta: order.finalAmountPaise,
      reason: `purchase:${order.packId}`,
      balanceAfter: userRow.walletBalancePaise,
    });

    return { order, walletBalancePaise: userRow.walletBalancePaise };
  });
}
```
Note: the grant amount is `order.finalAmountPaise` (what was actually paid after any coupon), not a separate credits count — this is what makes recharge genuinely 1:1. Update the file's imports: `creditTransactions` → `walletTransactions`.

- [ ] **Step 3: `billing.routes.ts` — response field + wording updates**

- `balanceRoute` summary: `"Get the authenticated user's credit balance"` → `"Get the authenticated user's wallet balance"`.
- Its handler (line 89): `return c.json({ credits: 0, currency: 'INR' }, 200);` → `return c.json({ walletBalancePaise: 0, currency: 'INR' }, 200);` (still a stub returning 0 — pre-existing, out of scope to actually fix here, just keep the field name consistent).
- `packsRoute` path/summary: rename to `/billing/top-up-amounts`, `'List purchasable credit packs'` → `'List purchasable top-up amounts'`; handler calls `getTopUpAmounts()` and returns `{ amounts: ... }`.
- `checkoutRoute` summary: `"Create a pending order for a credit pack..."` → `"Create a pending order for a top-up amount..."`; body field stays `packId` (still means "which catalog entry", not credit-specific — no rename needed here, see Task B1 Step 1 comment).
- `confirmRoute`/`confirmGooglePlayRoute` handlers: destructure `{ order, walletBalancePaise }` instead of `{ order, credits }`, return `c.json({ order: toOrderDto(order), walletBalancePaise }, 200)`.
- Update the `CreditPack` type alias at the bottom of the file (line 241) to `TopUpAmount = z.infer<typeof TopUpAmountsResponseSchema>['amounts'][number]`.

- [ ] **Step 4: Grep for any remaining stragglers, then run the backend's typecheck/build**

```bash
cd /c/dev/aroha-astrology/jyotish-backend
grep -rn "CREDIT_PACKS\|getCreditPacks\|\bcredits\b" src/modules/billing src/modules/users src/modules/vastu src/modules/astro --include="*.ts"
npm run build
```
Expected: no unexpected hits, `tsup` build succeeds with zero type errors.

- [ ] **Step 5: Update existing tests**

```bash
grep -rln "CREDIT_PACKS\|deductCredits\|\.credits\b\|creditTransactions" src/ --include="*.test.ts"
```
For each matching test file, update it the same way as the production code above (renamed functions/fields, paise-scaled amounts). Run `npm test` and confirm the full suite passes before moving on.

- [ ] **Step 6: Commit**

```bash
git add src/modules/billing/
git commit -m "feat(billing): replace credit packs with 1:1 rupee top-up amounts"
```

---

## Part C — Live Frontend (`C:\dev\aroha-astrology\frontend`)

### Task C1: `lib/api.ts` types + shared `formatRupees` helper

**Files:**
- Modify: `lib/api.ts:27-49` (User), `:399-433` (CreditPack/Order), `:574-594` (unlockHouse/unlockGemstone docs), `:738-775` (billing methods)
- Create: `lib/format.ts`

- [ ] **Step 1: Create the shared formatter**

```ts
// lib/format.ts
/** Formats an integer paise amount as a ₹ string, e.g. 20000 -> "₹200", 4950 -> "₹49.50". */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}
```

- [ ] **Step 2: `User` interface (lines 27-49)** — change:
```ts
  /** Spendable balance for unlocking kundli house details (POST /v1/me/unlock-house). */
  credits: number;
```
to:
```ts
  /** Wallet balance in paise, spendable for unlocking kundli house details (POST /v1/me/unlock-house). */
  walletBalancePaise: number;
```
And in the same block, reword the `gemstoneUnlocked` doc comment from `"...has spent credits to unlock..."` to `"...has spent wallet balance to unlock..."`.

- [ ] **Step 3: Replace `CreditPack` (lines 399-406) and trim `Order` (lines 420-433)**

```ts
export interface TopUpAmount {
  id: string;
  amountPaise: number;
  currency: string;
  label: string;
  popular?: boolean;
}
```
In `Order`, delete the `credits: number;` field.

- [ ] **Step 4: Update the billing methods (lines 738-775)**

```ts
  /** Purchasable top-up amounts. */
  billingTopUpAmounts: () => request<{ amounts: TopUpAmount[] }>("/v1/billing/top-up-amounts", { auth: true }),

  /** Preview the discount a coupon would apply to a top-up amount, without redeeming it. */
  validateCoupon: (code: string, packId: string) =>
    request<CouponValidation>("/v1/billing/coupons/validate", {
      method: "POST",
      body: { code, packId },
      auth: true,
    }),

  /** Create a pending order for a top-up amount (optionally with a coupon applied). */
  checkout: (packId: string, couponCode?: string) =>
    request<Order>("/v1/billing/checkout", {
      method: "POST",
      body: couponCode ? { packId, couponCode } : { packId },
      auth: true,
    }),

  /**
   * Confirm payment for a pending order and grant its value to the wallet.
   * MOCK — stands in for a real gateway webhook until Razorpay/Stripe is
   * wired up; always succeeds for a pending order. Caller should `refresh()`
   * (useAuth) after to pick up the updated wallet balance.
   */
  confirmOrder: (orderId: string) =>
    request<{ order: Order; walletBalancePaise: number }>(`/v1/billing/orders/${orderId}/confirm`, {
      method: "POST",
      auth: true,
    }),

  /** Confirm a Google Play purchase (Android app only) and grant its value to the wallet. */
  confirmGooglePlayOrder: (params: { purchaseToken: string; productId: string }) =>
    request<{ order: Order; walletBalancePaise: number }>("/v1/billing/confirm-google-play", {
      method: "POST",
      body: params,
      auth: true,
    }),
```
Also reword the `unlockHouse`/`unlockGemstone` doc comments (lines 574-594): "Spend credits to..." → "Spend wallet balance to...", "insufficient credits" → "insufficient balance".

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts lib/format.ts
git commit -m "refactor(api): rename credits to walletBalancePaise in the API client"
```

---

### Task C2: Shared `WalletBalance` component (extract the 5 duplicated balance pills)

**Files:**
- Create: `components/ui/WalletBalance.tsx`

There is no existing shared balance component — `TopBar.tsx`, `payment/page.tsx`, `profile/page.tsx`, `HouseGrid.tsx`, and `AnalysisPanel.tsx` each hand-roll their own pill/card. Per this project's "prefer reusable components" convention, extract one now while touching all five call sites anyway.

- [ ] **Step 1: Write the component**

```tsx
// components/ui/WalletBalance.tsx
import { Coins } from "lucide-react";
import { formatRupees } from "@/lib/format";

export default function WalletBalance({
  paise,
  size = "sm",
  className = "",
}: {
  paise: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const textSize = size === "md" ? "text-lg" : "text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-gold ${textSize} ${className}`}>
      <Coins size={size === "md" ? 16 : 15} />
      {formatRupees(paise)}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/WalletBalance.tsx
git commit -m "feat(ui): add shared WalletBalance component"
```

(Used by Tasks C4–C6 below instead of each screen's own inline pill markup.)

---

### Task C3: `app/payment/page.tsx` — rewrite for 1:1 top-up

**Files:**
- Modify: `app/payment/page.tsx` (near-full rewrite)

- [ ] **Step 1: Remove the local `formatRupees`, import the shared one and `WalletBalance`**

Delete lines 14-17 (`function formatRupees...`). Add to the imports at the top:
```ts
import { formatRupees } from "@/lib/format";
import WalletBalance from "@/components/ui/WalletBalance";
import { api, ApiError, type TopUpAmount, type CouponValidation } from "@/lib/api";
```
(replacing the old `import { api, ApiError, type CreditPack, type CouponValidation } from "@/lib/api";`)

- [ ] **Step 2: Rename `PackCard` → `TopUpCard`, drop the credits line**

Replace the whole `PackCard` function (lines 19-57):
```tsx
function TopUpCard({
  amount,
  selected,
  onSelect,
}: {
  amount: TopUpAmount;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-4 rounded-2xl border transition-all ${
        selected
          ? "border-gold bg-gold/10 shadow-[0_0_20px_rgba(223,181,100,0.15)]"
          : "border-gold/15 bg-surface/40 hover:border-gold/35"
      }`}
    >
      {amount.popular && (
        <span className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold text-[#1a0e00]">
          {t("payment.popular")}
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <Sparkles size={14} className="text-gold" />
        <span className="text-lg font-bold text-gold">{formatRupees(amount.amountPaise)}</span>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Update state, data fetch, and derived values**

- `const [packs, setPacks] = useState<CreditPack[]>([]);` → `const [amounts, setAmounts] = useState<TopUpAmount[]>([]);`
- `const [selectedPackId, ...]` → `const [selectedAmountId, ...]` (same pattern, renamed)
- `const [success, setSuccess] = useState<{ credits: number } | null>(null);` → `const [success, setSuccess] = useState<{ walletBalancePaise: number } | null>(null);`
- The `useEffect` fetch: `api.billingPacks()` → `api.billingTopUpAmounts()`, destructure `{ amounts }`, `setPacks(amounts)` → `setAmounts(amounts)`.
- `const selectedPack = packs.find(...)` → `const selectedAmount = amounts.find((a) => a.id === selectedAmountId) ?? null;`
- `discountPaise`/`finalPaise` derivations: replace `selectedPack?.priceInPaise` with `selectedAmount?.amountPaise`.
- `selectPack(id)` → `selectAmount(id)`, same body with renamed setter.

- [ ] **Step 4: Update `handlePay`**

Change the `PlayBilling.purchaseProduct({ productId: selectedPack.id })` and `setSuccess({ credits: selectedPack.credits })` lines to use `selectedAmount.id` and:
```ts
      await refreshUser();
      setSuccess({ walletBalancePaise: selectedAmount.amountPaise });
```
Rename every other `selectedPack` reference in this function to `selectedAmount`.

- [ ] **Step 5: Update the JSX**

- Current-balance card (lines 174-183): replace the `<span>{user?.credits ?? 0} {t("payment.creditsUnit")}</span>` block with `<WalletBalance paise={user?.walletBalancePaise ?? 0} size="md" />`.
- Success body (line 198): `t("payment.successBody", { credits: success.credits })` → `t("payment.successBody", { amount: formatRupees(success.walletBalancePaise) })`.
- Pack list render (lines 218-227): `packs.map((pack) => <PackCard ... pack={pack} ... onSelect={() => selectPack(pack.id)} />)` → `amounts.map((amount) => <TopUpCard key={amount.id} amount={amount} selected={amount.id === selectedAmountId} onSelect={() => selectAmount(amount.id)} />)`.
- Order summary block (lines 269-284): replace every `selectedPack` with `selectedAmount`.
- Pay button label (line 304): unchanged shape — already `t("payment.payButton", { amount: ... })`, just make sure the condition uses `selectedAmount`.

- [ ] **Step 6: Manual smoke test**

Run the frontend dev server, sign in as a test user, open `/payment`, confirm: the current-balance card shows a ₹ amount (not "N Credits"), the amount tiles show only a ₹ price (no separate credit count), and selecting one + completing a (mock/dev) checkout updates the balance by exactly the tile's amount.

- [ ] **Step 7: Commit**

```bash
git add app/payment/page.tsx
git commit -m "feat(payment): rewrite recharge screen for 1:1 rupee top-up"
```

---

### Task C4: `components/TopBar.tsx` + `app/profile/page.tsx`

**Files:**
- Modify: `components/TopBar.tsx:44-55`
- Modify: `app/profile/page.tsx:181-199`

- [ ] **Step 1: `TopBar.tsx`** — replace the `<Coins size={15} />{user.credits}` block (lines 51-54) with:
```tsx
            <WalletBalance paise={user.walletBalancePaise} />
```
Add `import WalletBalance from "@/components/ui/WalletBalance";` to the top; the now-unused `Coins` import from `lucide-react` (line 7) can be dropped if nothing else in the file uses it.

- [ ] **Step 2: `profile/page.tsx`** — replace the balance display (around lines 181-199, `{user?.credits ?? 0} {t("payment.creditsUnit")}`) with `<WalletBalance paise={user?.walletBalancePaise ?? 0} size="md" />`, importing `WalletBalance` the same way.

- [ ] **Step 3: Commit**

```bash
git add components/TopBar.tsx app/profile/page.tsx
git commit -m "refactor(ui): use shared WalletBalance in TopBar and profile page"
```

---

### Task C5: Gemstone + house-unlock screens

**Files:**
- Modify: `components/ui/GemstoneCard.tsx:12` (constant), `:194,211,229,257-259` (usage)
- Modify: `components/ui/HouseGrid.tsx:20,28,50`
- Modify: `components/ui/HouseUnlockDrawer.tsx:23,28,44,52,200,206`
- Modify: `app/kundli/page.tsx:410` (constant), `:406,524-570` (usage)

- [ ] **Step 1: `GemstoneCard.tsx`** — change `const UNLOCK_COST = 10;` to `const UNLOCK_COST_PAISE = 10000;` and replace every `{cost}` / `{{cost}}` interpolation value at lines 194/211/229/257-259 from the credit count to `formatRupees(UNLOCK_COST_PAISE)`; the "Buy credits" fallback CTA link stays (still routes to `/payment`), just reword its i18n key per Task C7.

- [ ] **Step 2: `app/kundli/page.tsx`** — change line 410 `const UNLOCK_COST = 5;` to `const UNLOCK_COST_PAISE = 5000;`; update the `credits`/`user.credits` reads at line 406 to `user.walletBalancePaise`, and thread `UNLOCK_COST_PAISE` (instead of the old credit count) down into `HouseGrid`/`HouseUnlockDrawer` at lines 524-570.

- [ ] **Step 3: `HouseGrid.tsx`** — props at line 20/28 renamed from `credits`/`cost` (credit counts) to `balancePaise`/`costPaise`; the banner text at line 50 (`t('kundli.house.creditsAvailable', { credits })`) becomes `t('kundli.house.creditsAvailable', { amount: formatRupees(balancePaise) })` (i18n key ITSELF can keep its old machine name — only the displayed string and the interpolation variable change; see Task C7 for the new EN copy).

- [ ] **Step 4: `HouseUnlockDrawer.tsx`** — same prop rename (`credits`→`balancePaise`, `cost`→`costPaise`) at lines 23/28; the affordability check at line 44 (`credits >= cost`) becomes `balancePaise >= costPaise`; button/error text at lines 52, 200, 206 interpolate `formatRupees(costPaise)`/`formatRupees(balancePaise)` instead of raw numbers.

- [ ] **Step 5: Manual smoke test**

Open `/kundli`, confirm the balance banner and every house-unlock drawer show ₹ amounts (e.g. "₹50" not "5 credits"), and that unlocking a house with insufficient balance shows the correct ₹ shortfall message.

- [ ] **Step 6: Commit**

```bash
git add components/ui/GemstoneCard.tsx components/ui/HouseGrid.tsx components/ui/HouseUnlockDrawer.tsx app/kundli/page.tsx
git commit -m "refactor(kundli): show unlock costs and balance in rupees"
```

---

### Task C6: AI chat + Vastu screens

**Files:**
- Modify: `components/ai-chat/ChatConversation.tsx:24,26,98,284,495-497,619-632`
- Modify: `components/vastu/VastuPlanner.tsx:21,87,134,242-243`
- Modify: `components/vastu/AnalysisPanel.tsx:50,64,111,149-178,196`

- [ ] **Step 1: `ChatConversation.tsx`** — `const CHAT_MESSAGE_COST = 2;` → `const CHAT_MESSAGE_COST_PAISE = 2000;`; `const LOW_CREDIT_THRESHOLD = 8;` → `const LOW_BALANCE_THRESHOLD_PAISE = 8000;` (same relative threshold, Rs 80 instead of 8 credits); every balance/cost read and interpolation in the low-balance banner and out-of-credit bubble (lines 284, 495-497, 619-632) switches from raw credit numbers to `formatRupees(...)`.

- [ ] **Step 2: `VastuPlanner.tsx`** — `const CREDIT_COST = 5;` → `const COST_PAISE = 5000;`; thread `COST_PAISE` (instead of the credit count) into `AnalysisPanel` at line 242-243.

- [ ] **Step 3: `AnalysisPanel.tsx`** — props renamed from `credits`/`cost` to `balancePaise`/`costPaise`; the balance pill at lines 159-163 becomes `<WalletBalance paise={balancePaise} />` (reuse the Task C2 component instead of its own inline `<Coins/>` markup); the "You need {{cost}} credits (you have {{credits}})" message at lines 149-178 interpolates `formatRupees(costPaise)`/`formatRupees(balancePaise)`.

- [ ] **Step 4: Manual smoke test**

Open the AI chat, confirm the per-message cost note and low-balance warning show ₹ amounts. Open Vastu Planner, confirm the generate-report CTA and insufficient-balance state show ₹50, not "5 credits".

- [ ] **Step 5: Commit**

```bash
git add components/ai-chat/ChatConversation.tsx components/vastu/VastuPlanner.tsx components/vastu/AnalysisPanel.tsx
git commit -m "refactor(chat,vastu): show costs and balance in rupees"
```

---

### Task C7: i18n — `i18n/resources.ts` (all 7 languages)

**Files:**
- Modify: `i18n/resources.ts` — English block starting line 5, mirrored blocks at `hi:789, bn:1517, mr:2242, te:2967, ta:3688, gu:4413`

- [ ] **Step 1: Update the English keys**

Replace these English lines (keep every other key in the file untouched):

| Key | Old (line ~) | New |
|---|---|---|
| `vastu.analysis.generate` | 95 `"Generate Report · {{cost}} credits"` | `"Generate Report · {{cost}}"` |
| `vastu.analysis.confirmSpend` | 96 `"This uses {{cost}} credits. Generate your personalised report?"` | `"This uses {{cost}}. Generate your personalised report?"` |
| `vastu.analysis.notEnough` | 98 `"You need {{cost}} credits (you have {{balance}})."` | `"You need {{cost}} (you have {{balance}})."` |
| `vastu.analysis.getCredits` | 99 `"Get more credits"` | `"Add money"` |
| `aiChatPage.costPerMessage` | 323 `"Each question costs {{cost}} credits"` | `"Each question costs {{cost}}"` |
| `aiChatPage.notEnoughCreditsToAsk` | 324 `"Not enough credits to ask a question"` | `"Not enough balance to ask a question"` |
| `aiChatPage.lowCreditWarning` | 325 `"You're running low on credits ({{credits}} left) — recharge to keep chatting."` | `"You're running low on balance ({{balance}} left) — recharge to keep chatting."` |
| `aiChatPage.outOfCreditReply` | 326 `"You're out of credits. Recharge to continue this conversation."` | `"You're out of balance. Recharge to continue this conversation."` |
| `kundli.gemstone.unlockButton` | 482 `"Unlock for {{cost}} Credits"` | `"Unlock for {{cost}}"` |
| `kundli.gemstone.buyCredits` | 484 `"Buy credits"` | `"Add money"` |
| `kundli.gemstone.notEnough` | 485 `"You need {{cost}} credits to unlock this."` | `"You need {{cost}} to unlock this."` |
| `kundli.house.unlockBody` | 645 `"Spend {{cost}} credits to reveal the deep astrological secrets hidden in this house."` | `"Spend {{cost}} to reveal the deep astrological secrets hidden in this house."` |
| `kundli.house.unlockButton` | 646 `"Unlock for {{cost}} Credits"` | `"Unlock for {{cost}}"` |
| `kundli.house.notEnoughCredits` | 647 `"Not enough credits"` | `"Not enough balance"` |
| `kundli.house.creditsAvailable` | 652 `"You have {{credits}} credits"` | `"You have {{amount}}"` |
| `kundli.house.unlockHint` | 653 `"Unlock a house for {{cost}} credits"` | `"Unlock a house for {{cost}}"` |
| `payment.title` | 687 `"Buy Credits"` | `"Add Money"` |
| `payment.subtitle` | 688 `"Top up your balance to unlock more insights"` | (unchanged — already generic) |
| `payment.currentBalance` | 689 `"Current Balance"` | (unchanged) |
| `payment.creditsUnit` | 690 `"Credits"` | **delete this key** — no longer needed, nothing displays a bare unit word anymore (the ₹ symbol is the unit) |
| `payment.buyCredits` | 691 `"Buy Credits"` | `"Add Money"` |
| `payment.payButton` | 703 `"Pay ₹{{amount}}"` | (unchanged — already correct) |
| `payment.successBody` | 707 `"{{credits}} credits have been added to your account."` | `"{{amount}} has been added to your account."` |

Every `{{cost}}`/`{{balance}}`/`{{amount}}` placeholder above is filled by the calling component with an already-formatted `formatRupees(...)` string (e.g. `"₹50"`), per Tasks C3–C6 — so these English strings need no `₹` literal of their own except where one already existed (`payment.payButton`).

- [ ] **Step 2: Mirror into the other 6 languages**

For each of `hi` (line ≈789+offset), `bn` (≈1517+offset), `mr` (≈2242+offset), `te` (≈2967+offset), `ta` (≈3688+offset), `gu` (≈4413+offset): find the same key at the equivalent relative position and apply the **same transformation** — remove the localized word for "credit(s)" and the interpolation variable it wrapped, keep everything else (tone, sentence structure, other words) exactly as the existing human translator wrote it. Do **not** invent new phrasing beyond deleting the credit-specific word/placeholder — this repo's existing translations are already reviewed; the smallest possible diff per language is the safest one.

`payment.payButton` is already ₹-formatted correctly in every language (e.g. Hindi `"₹{{amount}} भुगतान करें"`, Tamil `"₹{{amount}} செலுத்தவும்"`) — use that key's existing per-language phrasing as your template for how "₹{{amount}}" reads naturally in each script when adapting the other 22 keys (11 keys × 2, since `payment.creditsUnit` is deleted rather than translated).

Since this step touches native-script text in 6 languages this plan's author cannot fluently verify, **have a native or fluent speaker of each language spot-check the diff before merging**, same as any other translation change in this repo.

- [ ] **Step 3: Commit**

```bash
git add i18n/resources.ts
git commit -m "i18n: replace credit terminology with rupee amounts across all 7 languages"
```

---

## Part D — Mobile (`C:\dev\aroha-astrology\mobile`)

The mobile app is a thin Capacitor WebView shell around `frontend` — it has no credit-related text of its own (confirmed: 0 matches repo-wide). The only thing that needs attention is keeping the Play Billing product catalog in sync with the backend's new `TOP_UP_AMOUNTS` (Task B6).

### Task D1: Google Play Console — create the new top-up products (manual, no code)

- [ ] **Step 1:** In the Google Play Console for this app's package (`com.aroha.astrology`), create 5 new **managed (one-time) in-app products**: `topup_50` (₹50), `topup_100` (₹100), `topup_200` (₹200), `topup_500` (₹500), `topup_1000` (₹1000) — IDs must match `TOP_UP_AMOUNTS` in `billing.service.ts` exactly.
- [ ] **Step 2:** Deactivate (don't delete — Play Console doesn't allow reusing a deleted product ID) the old `starter`/`popular`/`value`/`mega` products once the new ones are live and confirmed working, so they stop appearing in any client caches.
- [ ] **Step 3:** This step has no git commit — it's console configuration, not code.

### Task D2: Verify `play-billing.ts` / `PlayBillingPlugin.java` need no code change

**Files (read-only verification):**
- `frontend/lib/play-billing.ts`
- `mobile/android/app/src/main/java/com/aroha/astrology/PlayBillingPlugin.java`

- [ ] **Step 1:** Confirm `purchaseProduct({ productId })` and `queryUnconsumedPurchases()` take/return a generic `productId` string with no hardcoded pack IDs or credit-count assumptions baked into the native plugin. Per the earlier research pass these are already generic passthroughs to the Billing Library — expected outcome is **no code change needed**, only the product IDs passed in from `app/payment/page.tsx` (Task C3, already using `selectedAmount.id`) need to match Task D1's new SKUs.
- [ ] **Step 2:** If the verification in Step 1 turns up a hardcoded assumption, stop and report it — do not guess a fix without seeing the actual code, since this plugin is what native purchases depend on.

---

## Part E — Legacy `apps/api` cleanup (independent — no live users, no urgency, no deploy-order coupling to Parts B–D)

This system (Next.js + Supabase + Razorpay, "Dhanam"-branded) has zero live traffic — confirmed via [[aroha-backend-architecture]] memory: the live frontend/mobile talk only to `src/`. Do this whenever convenient; nothing here can break the real product.

### Task E1: Supabase migration — rename + convert + fix the RPCs

**Files:**
- Create: `supabase/migrations/058_credits_to_wallet_balance.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================================
-- 058: credits_to_wallet_balance
-- Same conversion as the live backend (see jyotish-backend/src's
-- 0024_credits_to_wallet_balance.sql): 1 credit = Rs 10 = 1000 paise.
-- This system has no live traffic, but gets the same treatment for
-- codebase consistency.
-- ============================================================================

-- users
ALTER TABLE public.users RENAME COLUMN credits TO wallet_balance_paise;
UPDATE public.users SET wallet_balance_paise = wallet_balance_paise * 1000;
ALTER TABLE public.users ALTER COLUMN wallet_balance_paise SET DEFAULT 50000;

-- credit_transactions -> wallet_transactions
ALTER TABLE public.credit_transactions RENAME TO wallet_transactions;
UPDATE public.wallet_transactions SET amount = amount * 1000;

-- credit_orders -> wallet_orders; drop the now-redundant separate credits count
-- (post-conversion, granted amount == amount_paise, always 1:1)
ALTER TABLE public.credit_orders RENAME TO wallet_orders;
ALTER TABLE public.wallet_orders DROP COLUMN credits;

-- RPCs embed the column name as literal SQL text, so the rename above breaks
-- them until redefined here.
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance int;
BEGIN
  UPDATE users
     SET wallet_balance_paise = wallet_balance_paise - p_amount
   WHERE id = p_user_id
     AND wallet_balance_paise >= p_amount
  RETURNING wallet_balance_paise INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_TOKENS: Not enough balance to complete this action';
  END IF;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_credits(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Amount must be positive';
  END IF;

  UPDATE users
     SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + p_amount
   WHERE id = p_user_id
  RETURNING wallet_balance_paise INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: No users row for id %', p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(uuid, int) TO authenticated;
```

- [ ] **Step 2: Find and fix `add_credits`**

This RPC has no migration file in this repo (called from `grantPurchase.ts` as a fallback, per code comments it "may only exist applied directly to the DB"). Before this migration is safe to run against a real Supabase project:
```bash
# Against the actual Supabase project (via its SQL editor or `supabase db dump`):
# look up the current body of public.add_credits(uuid, int)
```
If it exists, append a `CREATE OR REPLACE FUNCTION public.add_credits(...)` to this migration with `credits` replaced by `wallet_balance_paise`, mirroring the pattern above. If it turns out not to exist at all in this Supabase project (plausible — the code already treats it as optional, falling back to `increment_credits`), note that in the migration file as a comment and skip it.

- [ ] **Step 3: Update the `handle_new_user()` trigger** (currently defined in `057_signup_bonus_50_tokens.sql`)

Add to this same migration file:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := CASE
    WHEN NEW.email LIKE '%@phone.arohaastrology.in' THEN NULL
    WHEN NEW.email LIKE '%@phone.jyotishai.app'      THEN NULL  -- legacy
    ELSE NEW.email
  END;

  INSERT INTO public.users (id, email, phone, name, wallet_balance_paise)
  VALUES (
    NEW.id,
    v_email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', ''),
    50000
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50000, 'signup_bonus', 'Welcome bonus — Rs 500')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/058_credits_to_wallet_balance.sql
git commit -m "feat(db): rename credits to wallet_balance_paise in the legacy apps/api schema"
```

---

### Task E2: `apps/api/src/lib/credits/` — rename module, simplify to 1:1

**Files:**
- Modify: `apps/api/src/lib/credits/packs.ts`
- Rename+modify: `apps/api/src/lib/credits/deductCredits.ts` → `apps/api/src/lib/credits/deductWalletBalance.ts`
- Modify: `apps/api/src/lib/credits/grantPurchase.ts`

- [ ] **Step 1: `packs.ts`** — this system has a real, live Razorpay web checkout (unlike the mobile Play Billing constraint in Part D), so it can keep true arbitrary-amount top-up. Replace the whole file:
```ts
// Minimum/maximum top-up amount, in rupees. No packs — 1 rupee paid = 1 rupee credited.
export const MIN_TOPUP_RUPEES = 10;
export const MAX_TOPUP_RUPEES = 10000;

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
```
(The fixed-tier `CREDIT_PACKS` array and `getPack()` are deleted entirely — Task E4 updates `credits/order/route.ts` to stop calling them.)

- [ ] **Step 2: Rename `deductCredits.ts` → `deductWalletBalance.ts`, convert to paise**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type DebitType = 'feature_debit' | 'chat_debit' | 'report_debit';

interface DeductResult {
  success: boolean;
  walletBalancePaise?: number;
  error?: string;
}

/**
 * Atomically deducts paise from the user's wallet via the deduct_credits RPC.
 * Returns { success: false, error: 'INSUFFICIENT_TOKENS' } when balance is too low.
 */
export async function deductWalletBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  amountPaise: number,
  type: DebitType,
  description: string,
): Promise<DeductResult> {
  const { data: newBalance, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amountPaise,
  });

  if (error) {
    const isInsufficient =
      error.message?.includes('INSUFFICIENT_TOKENS') ||
      error.code === 'P0001';
    return {
      success: false,
      error: isInsufficient ? 'INSUFFICIENT_TOKENS' : 'Failed to deduct wallet balance',
    };
  }

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: -amountPaise,
    type,
    description,
  });

  return { success: true, walletBalancePaise: newBalance as number };
}

/**
 * Refund paise previously deducted (e.g. when AI output fails validation and we don't store it).
 * Logs a positive wallet_transactions row so admins can audit refunds.
 * Best-effort: errors are logged but not thrown — the caller's primary flow already failed.
 */
export async function refundWalletBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  amountPaise: number,
  description: string,
): Promise<void> {
  try {
    const { error: rpcError } = await supabase.rpc('increment_credits', {
      p_user_id: userId,
      p_amount: amountPaise,
    });
    if (rpcError) {
      console.error('[refundWalletBalance] increment_credits RPC failed:', rpcError);
      return;
    }
    const { error: insertError } = await supabase.from('wallet_transactions').insert({
      user_id: userId,
      amount: amountPaise,
      type: 'refund',
      description,
    });
    if (insertError) {
      console.warn(`[refundWalletBalance] audit row failed (refund itself succeeded): ${insertError.message}`);
    }
  } catch (err) {
    console.error('[refundWalletBalance] unexpected error:', err);
  }
}
```

- [ ] **Step 3: `grantPurchase.ts`** — grant `amount_paise` directly (1:1), table renamed

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

// Idempotently grants wallet balance for a paid Razorpay order.
//
// Looks up the order in `wallet_orders` (server-side truth — client cannot
// influence the amount here), atomically marks it 'paid', records a
// wallet_transactions row keyed by razorpay_payment_id (UNIQUE), and adds
// amount_paise to users.wallet_balance_paise (always 1:1 — no separate
// "credits" count anymore). Safe to call multiple times for the same payment.
//
// Returns the new wallet balance, or null if the order is not found.

export interface GrantResult {
  walletBalancePaise: number;
  orderId: string;
  added: number;
  alreadyProcessed: boolean;
}

export async function grantPurchase(
  supabase: SupabaseClient,
  args: { razorpayOrderId: string; razorpayPaymentId: string },
): Promise<GrantResult | null> {
  const { razorpayOrderId, razorpayPaymentId } = args;

  const { data: order, error: orderErr } = await supabase
    .from('wallet_orders')
    .select('id, user_id, amount_paise, status, razorpay_payment_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  if (orderErr || !order) return null;

  if (order.status === 'paid') {
    const { data: u } = await supabase
      .from('users')
      .select('wallet_balance_paise')
      .eq('id', order.user_id)
      .single();
    return {
      walletBalancePaise: u?.wallet_balance_paise ?? 0,
      orderId: order.id,
      added: order.amount_paise,
      alreadyProcessed: true,
    };
  }

  const { error: txErr } = await supabase.from('wallet_transactions').insert({
    user_id: order.user_id,
    amount: order.amount_paise,
    type: 'purchase',
    description: `Added Rs ${(order.amount_paise / 100).toFixed(2)} (order ${razorpayOrderId})`,
    razorpay_payment_id: razorpayPaymentId,
  });

  if (txErr && txErr.code === '23505') {
    const { data: u } = await supabase
      .from('users')
      .select('wallet_balance_paise')
      .eq('id', order.user_id)
      .single();
    await supabase
      .from('wallet_orders')
      .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    return {
      walletBalancePaise: u?.wallet_balance_paise ?? 0,
      orderId: order.id,
      added: order.amount_paise,
      alreadyProcessed: true,
    };
  }
  if (txErr) throw txErr;

  const { error: rpcErr } = await supabase.rpc('add_credits', {
    p_user_id: order.user_id,
    p_amount: order.amount_paise,
  });
  if (rpcErr) {
    const { error: incErr } = await supabase.rpc('increment_credits', {
      p_user_id: order.user_id,
      p_amount: order.amount_paise,
    });
    if (incErr) {
      const { data: cur } = await supabase
        .from('users')
        .select('wallet_balance_paise')
        .eq('id', order.user_id)
        .single();
      const next = (cur?.wallet_balance_paise ?? 0) + order.amount_paise;
      const { error: upErr } = await supabase
        .from('users')
        .update({ wallet_balance_paise: next })
        .eq('id', order.user_id);
      if (upErr) throw upErr;
    }
  }

  await supabase
    .from('wallet_orders')
    .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  const { data: after } = await supabase
    .from('users')
    .select('wallet_balance_paise')
    .eq('id', order.user_id)
    .single();

  return {
    walletBalancePaise: after?.wallet_balance_paise ?? 0,
    orderId: order.id,
    added: order.amount_paise,
    alreadyProcessed: false,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git rm apps/api/src/lib/credits/deductCredits.ts
git add apps/api/src/lib/credits/packs.ts apps/api/src/lib/credits/deductWalletBalance.ts apps/api/src/lib/credits/grantPurchase.ts
git commit -m "refactor(credits): rename shared helpers to operate on paise, simplify to 1:1 top-up"
```

---

### Task E3: Per-route cost-constant conversion (18 feature routes)

**Files:** each row is `File:line`, old constant/literal, new constant/literal. Every one of these files imports `deductCredits`/`refundCredits` from `@/lib/credits/deductCredits` — update the import to `deductWalletBalance`/`refundWalletBalance` from `@/lib/credits/deductWalletBalance` in every file in this table, and multiply the cost literal by 1000 (paise per credit):

| File | Line | Old | New |
|---|---|---|---|
| `apps/api/src/app/api/dreams/route.ts` | 24 | `1` | `1000` |
| `apps/api/src/app/api/kp-system/route.ts` | 131 | `1` | `1000` |
| `apps/api/src/app/api/match/calculate/route.ts` | 26 | `1` | `1000` |
| `apps/api/src/app/api/gochar/route.ts` | 39 | `1` | `1000` |
| `apps/api/src/app/api/chat/stream/route.ts` | 175 | `2` | `2000` |
| `apps/api/src/app/api/chat/route.ts` | 188-190 | `1` | `1000` |
| `apps/api/src/app/api/video/generate/route.ts` | 25 | `1` | `1000` |
| `apps/api/src/app/api/predictions/personalized/route.ts` | 80 | `1` | `1000` |
| `apps/api/src/app/api/muhurta/calculate/route.ts` | 17 | `1` | `1000` |
| `apps/api/src/app/api/baby-names/route.ts` | 128 | `1` | `1000` |
| `apps/api/src/app/api/palm/compare/route.ts` | 32 | `1` | `1000` |
| `apps/api/src/app/api/predictions/generate/route.ts` | 246 | `1` | `1000` |
| `apps/api/src/app/api/prashna/route.ts` | 78 | `1` | `1000` |
| `apps/api/src/app/api/vastu/analyze/route.ts` | 216 | `1` | `1000` |
| `apps/api/src/app/api/palm/analyze/stream/route.ts` | 54 | `1` | `1000` |
| `apps/api/src/app/api/palm/analyze/route.ts` | 49 | `1` | `1000` |
| `apps/api/src/app/api/palm/enqueue/route.ts` | 109 | `1` | `1000` |
| `apps/api/src/app/api/couple/route.ts` | 46 | `1` | `1000` |
| `apps/api/src/app/api/varshaphal/route.ts` | 31 | `1` | `1000` |
| `apps/api/src/app/api/numerology/report/route.ts` | 44 | `1` | `1000` |
| `apps/api/src/app/api/tarot/route.ts` | 18, 71 | `TAROT_COST = 2` | `TAROT_COST_PAISE = 2000` |
| `apps/api/src/app/api/purchase-plan/analyze/route.ts` | 314-316 | `5` | `5000` |
| `apps/api/src/app/api/reports/generate/route.ts` | 10-14 | `{basic:1, standard:2, premium:3}` | `{basic:1000, standard:2000, premium:3000}` (route is currently feature-flagged off — update anyway for when it's re-enabled) |
| `apps/api/src/app/api/credits/refund-short-call/route.ts` | 48 | `1` | `1000` |

- [ ] **Step 1:** Work through the table above file by file. For each: update the import (renamed helper module), multiply the cost literal(s) by 1000, and rename any local variable literally called `credits`/`cost` in credit-units to make clear it's now paise (e.g. `const cost = 1;` → `const costPaise = 1000;`) — don't leave a paise-valued variable named like a credit count.

- [ ] **Step 2:** `apps/api/src/app/api/puja-bookings/route.ts` and `apps/api/src/app/api/credits/jaap-reward/route.ts` use *variable*, DB-driven amounts (`pujas.suggested_dhanam`, `mantras.reward_credits`) rather than a hardcoded literal — these need their own migration to convert the underlying DB values ×1000 (add to the Task E1 migration: `UPDATE pujas SET suggested_dhanam = suggested_dhanam * 1000; UPDATE puja_offerings SET dhanam_cost = dhanam_cost * 1000; UPDATE mantras SET reward_credits = reward_credits * 1000;`), then update `computeBookingDhanam()` in `puja-bookings/route.ts:65-68` and the read in `credits/jaap-reward/route.ts:74` to call `deductWalletBalance`/`refundWalletBalance` instead of the old helpers — the per-row DB values already carry the right (now paise) magnitude once that UPDATE runs, no code-side multiplication needed in these two files.

- [ ] **Step 3: Build check**

```bash
cd /c/dev/aroha-astrology/jyotish-backend/apps/api
grep -rln "from '@/lib/credits/deductCredits'" src/
```
Expected: zero results (everything now imports from `deductWalletBalance`). Then run this app's typecheck/build command and fix any remaining errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app/api/
git commit -m "refactor(routes): convert per-feature credit costs to paise across apps/api"
```

---

### Task E4: Purchase/admin routes

**Files:**
- Modify: `apps/api/src/app/api/credits/order/route.ts` (simplify — drop packs, keep custom-amount flow)
- Modify: `apps/api/src/app/api/credits/verify/route.ts`
- Modify: `apps/api/src/app/api/webhooks/razorpay/route.ts`
- Modify: `apps/api/src/app/api/credits/purchase/route.ts` (the drifted duplicate — see note below)
- Modify: `apps/api/src/app/api/credits/balance/route.ts`, `apps/api/src/app/api/credits/history/route.ts`
- Modify: `apps/api/src/app/api/admin/add-credits/route.ts`

- [ ] **Step 1: `credits/order/route.ts` — drop pack lookup, keep only the amount-based flow**

This route already has the right shape for 1:1 (`CUSTOM_RATE_RUPEES = 10`, i.e. exactly the target rate) — simplify it to be the *only* path, no packs:

Replace lines 27-51 (pack/custom branching) with:
```ts
    const amountRupees = Number(body.amount_rupees ?? 0);
    if (!Number.isInteger(amountRupees) || amountRupees < MIN_TOPUP_RUPEES || amountRupees > MAX_TOPUP_RUPEES) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Amount must be between Rs ${MIN_TOPUP_RUPEES} and Rs ${MAX_TOPUP_RUPEES}` },
        { status: 400 },
      );
    }
    const totalRupees = amountRupees;
```
Update the import at line 4 from `import { getPack, rupeesToPaise } from '@/lib/credits/packs';` to `import { MIN_TOPUP_RUPEES, MAX_TOPUP_RUPEES, rupeesToPaise } from '@/lib/credits/packs';`. Remove the now-dead `rawIds`/`packs`/`validPacks`/`packCredits`/`packRupees`/`totalCredits`/`comboPackId` variables (lines 28-51) — `comboPackId` can become a simple generated string like `` `topup_${amountRupees}_${Date.now().toString(36)}` `` if `wallet_orders.pack_id` still requires a non-null value (check the column's nullability in Task E1's migration — it's fine to make it nullable there instead if a synthetic ID feels wrong).

Update the `wallet_orders` insert (was `credit_orders`, lines 74-83) to drop the `credits: totalCredits,` field (that column no longer exists per Task E1).

- [ ] **Step 2: `credits/verify/route.ts`, `webhooks/razorpay/route.ts`** — these call `grantPurchase()` and read its result — update any destructuring of `.credits` from the old `GrantResult` shape to `.walletBalancePaise` per Task E2 Step 3's new interface. Update any `credit_orders`/`credit_transactions` table references to `wallet_orders`/`wallet_transactions`.

- [ ] **Step 3: `credits/purchase/route.ts` — the drifted duplicate**

This route independently re-implements the same purchase flow with its own separate (and already-inconsistent) `CREDIT_PACKS` definition, bypassing `grantPurchase()`. Given Task E2 removed the packs concept from `packs.ts` entirely, this route can no longer reference a pack table that doesn't exist. Two options — pick one and note the choice in the commit message:
  - **(a) Delete this route** and redirect its caller(s) to `credits/order` + `credits/verify` (the consolidated flow) — recommended, since this duplication was already flagged as unintentional drift in the research pass, and this task is a natural point to retire it.
  - **(b) If some caller still needs it**, rewrite it to call the same amount-based flow as Step 1, not its own pack table.
  Before choosing, grep the frontend/legacy UI for calls to this specific endpoint: `grep -rn "credits/purchase" apps/api/src apps/web 2>/dev/null` (recall `apps/web` doesn't exist in this repo — check wherever the legacy UI pages actually live) to confirm nothing breaks if deleted.

- [ ] **Step 4: `credits/balance/route.ts`, `credits/history/route.ts`** — rename the `credits` field in their JSON response to `walletBalancePaise`; `history`'s underlying query switches from `credit_transactions` to `wallet_transactions`.

- [ ] **Step 5: `admin/add-credits/route.ts`** — rename the range-checked `amount` param's unit and its response field:
```ts
  const { userId, amountPaise, note } = body as { userId: string; amountPaise: number; note?: string };

  if (!userId || !Number.isInteger(amountPaise) || amountPaise < 1000 || amountPaise > 1000000) {
    return NextResponse.json({ error: 'userId and amountPaise (1000-1000000, i.e. Rs10-Rs10000) are required' }, { status: 400 });
  }
```
Update the `credit_transactions` insert (table renamed) and the description string, and rename the final response field from `credits` to `walletBalancePaise` (reading from the renamed `wallet_balance_paise` column).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app/api/credits/ apps/api/src/app/api/webhooks/razorpay/route.ts apps/api/src/app/api/admin/add-credits/route.ts
git commit -m "refactor(billing): simplify purchase flow to 1:1 rupee top-up, retire duplicate route"
```

---

### Task E5: apps/api frontend pages — UI text

**Files:** `apps/api/src/app/credits/page.tsx`, `rewards/page.tsx`, `dashboard/page.tsx`, `components/Navbar.tsx`, `components/SideNav.tsx`, `components/TokenToast.tsx`, `hooks/useCreditsQuery.ts`, `i18n/dictionary.ts` (this app's own dictionary, separate from `frontend`'s)

Since this system has zero live users, this task is genuinely optional polish — do it only if you're already deep in this repo and want full consistency, otherwise it's safe to leave stale indefinitely (nobody sees it).

- [ ] **Step 1:** `grep -rn "credit" apps/api/src/app apps/api/src/components apps/api/src/hooks --include="*.tsx" --include="*.ts"` and work through the same pattern as Part C (Tasks C3-C7) applied to this app's own copy of the same UI ideas — rename `useCreditsQuery` → `useWalletBalanceQuery`, swap displayed numbers for `formatRupees(...)`, drop the "Dhanam"/"credits" unit words. There is no fixed task list here since this app's pages weren't read in detail during research (deprioritized as dead code) — treat `grep`'s output as your worklist.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app apps/api/src/components apps/api/src/hooks apps/api/src/i18n
git commit -m "refactor(ui): replace credit terminology with rupees in the legacy apps/api UI"
```

---

## Part F — Production rollout & verification

- [ ] **Step 1: Pre-deploy checks (live backend)**

```bash
ssh -i "<PEM path>" ec2-user@13.232.179.137 "cd /home/ec2-user/aroha-backend && git log -1 --oneline"
```
Confirm prod's current commit before assuming anything about its state — per [[aroha-backend-architecture]], prod staleness has recurred multiple times; never trust a prior deploy claim.

- [ ] **Step 2: Deploy backend (Part B)**

Follow the established deploy mechanics from [[aroha-backend-architecture]]: `tar czf - --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='secrets' --exclude='.env' . | ssh -i "<PEM>" ec2-user@13.232.179.137 "tar xzf - -C /home/ec2-user/aroha-backend"`, then over SSH: `npm ci` (deps unchanged in this plan, but check) → `npm run build` → **`npm run db:migrate`** (this is the step that actually converts every real user's balance — verify the migration file is exactly what Task B1 produced before running) → `pm2 reload aroha-api --update-env` → `pm2 save`.

- [ ] **Step 3: Verify the migration landed correctly**

```bash
ssh -i "<PEM>" ec2-user@13.232.179.137 "cd /home/ec2-user/aroha-backend && node -e \"
const postgres = require('postgres');
require('dotenv').config();
const sql = postgres(process.env.DATABASE_URL);
sql\\\`SELECT count(*)::int as n, sum(wallet_balance_paise)::bigint as total_paise FROM users\\\`.then(r => { console.log(r[0]); process.exit(0); });
\""
```
Sanity-check: `total_paise` should be a plausible number (roughly 10x what the old `sum(credits)` would have been) and no user should have a negative balance. Also hit `/healthz` and `/readyz`, and an authenticated `GET /v1/me` smoke call to confirm `walletBalancePaise` (not `credits`) appears in the response.

- [ ] **Step 4: Deploy frontend (Part C)**

Push to `origin/main` (or the branch Vercel tracks) — deploy is automatic. Confirm via the live site that `/payment`, `/kundli`, AI chat, and Vastu all show ₹ amounts, not credit counts, and that a real (or sandboxed) purchase correctly increments the wallet by exactly the amount paid.

- [ ] **Step 5: Play Console (Part D)** — do whenever Task D1's products are ready; no coupling to Steps 1-4.

- [ ] **Step 6: Legacy apps/api (Part E)** — deploy whenever, independently; it has its own Vercel project and Supabase project, no shared blast radius with Steps 1-5.

- [ ] **Step 7: Update memory**

Once live and verified, save a project memory recording: the new field names (`walletBalancePaise` everywhere `credits` used to be), the fixed rate (1 credit = ₹10 = 1000 paise), the new deployed revision, and the Play Console product IDs — future sessions asking "how much does X cost" or "grant this user credits" need to know the unit changed.
