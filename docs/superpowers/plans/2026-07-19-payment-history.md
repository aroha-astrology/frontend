# Payment History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Recharge History" to "Payment History" and expand it to show every wallet transaction — recharges, AI chat/Vastu/Gemstone/House-unlock/profile-creation spends, and refunds — not just recharge attempts.

**Architecture:** `wallet_transactions` already exists as a general-purpose ledger table but is only ever written on recharge grants today. Every spend/refund call site (10 total, across 5 files) gains a ledger insert in the same DB transaction as its balance change. A new backend endpoint (`GET /v1/billing/transactions`) merges `orders` (recharges) with the debit/refund side of `wallet_transactions`, and the frontend history screen renders the merged, per-kind-labeled list.

**Tech Stack:** Hono + drizzle-orm + Postgres (`jyotish-backend`, repo `github.com/aroha-astrology/backend.git`, local checkout at `C:\dev\aroha-astrology\jyotish-backend`), vitest for backend tests; Next.js + react-i18next (`frontend` repo, this working directory).

**Reference:** Full design rationale in `docs/superpowers/specs/2026-07-19-payment-history-design.md`.

---

## Before you start

Fetch fresh and branch off `origin/main` — do not build on the local `main` in `jyotish-backend`, which is 26+ commits stale and carries someone else's uncommitted, unrelated WIP (a duplicate credits→wallet_balance rename) that must not be touched or lost.

- [ ] **Step 1: Fetch and create the feature branch**

```bash
cd "C:\dev\aroha-astrology\jyotish-backend"
git fetch origin
git status --short   # confirm the existing uncommitted WIP is still there, untouched
git branch feature/payment-history origin/main
git worktree add ../jyotish-backend-payment-history feature/payment-history
```

Using a worktree (rather than switching the existing checkout's branch) leaves the uncommitted WIP exactly where it is, undisturbed, in the original working tree. All backend steps below run inside `C:\dev\aroha-astrology\jyotish-backend-payment-history`.

Expected: worktree created cleanly, `git -C ../jyotish-backend-payment-history log -1 --oneline` shows the same commit as `origin/main`.

---

## Task 1: `WalletTransactionRow` type export

**Files:**
- Modify: `src/db/schema.ts:663-664` (right after `NewOrderRow`)

- [ ] **Step 1: Add the type export**

Find:
```ts
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
```

Add immediately after it:
```ts

export type WalletTransactionRow = typeof walletTransactions.$inferSelect;
export type NewWalletTransactionRow = typeof walletTransactions.$inferInsert;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(billing): export WalletTransactionRow type"
```

---

## Task 2: `deductWalletBalance` — reason param + ledger write

**Files:**
- Modify: `src/modules/users/users.repo.ts:1-14` (imports), `:139-148` (function body)
- Test: `test/users-repo-wallet.spec.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `test/users-repo-wallet.spec.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';

const state = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('../src/config/db.js', () => {
  const sqlClient: any = (..._args: unknown[]) => Promise.resolve([]);
  sqlClient.end = vi.fn().mockResolvedValue(undefined);
  return { db: { transaction: state.transaction }, sqlClient };
});

import { walletTransactions } from '../src/db/schema.js';
import {
  deductWalletBalance,
  addWalletBalance,
  unlockHouseForUser,
  unlockGemstoneForUser,
  HOUSE_UNLOCK_COST_PAISE,
  GEMSTONE_UNLOCK_COST_PAISE,
} from '../src/modules/users/users.repo.js';

const dialect = new PgDialect();

interface FakeUpdateChain {
  set: (patch: unknown) => FakeUpdateChain;
  where: (cond: unknown) => FakeUpdateChain;
  returning: () => Promise<unknown[]>;
}

function makeUpdateChain(returningResult: unknown[]) {
  const calls: { set?: unknown; where?: unknown } = {};
  const chain: FakeUpdateChain = {
    set: vi.fn((patch: unknown) => {
      calls.set = patch;
      return chain;
    }),
    where: vi.fn((cond: unknown) => {
      calls.where = cond;
      return chain;
    }),
    returning: vi.fn(() => Promise.resolve(returningResult)),
  };
  return { chain, calls };
}

function makeInsertChain() {
  const calls: { values?: unknown } = {};
  const chain = {
    values: vi.fn((v: unknown) => {
      calls.values = v;
      return Promise.resolve(undefined);
    }),
  };
  return { chain, calls };
}

function compile(cond: unknown) {
  return dialect.sqlToQuery(cond as Parameters<typeof dialect.sqlToQuery>[0]);
}

function setupTransaction(updateResult: unknown[]) {
  const updateChain = makeUpdateChain(updateResult);
  const insertChain = makeInsertChain();
  const updateMock = vi.fn(() => updateChain.chain);
  const insertMock = vi.fn(() => insertChain.chain);
  state.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
    cb({ update: updateMock, insert: insertMock }),
  );
  return { updateChain, insertChain, updateMock, insertMock };
}

beforeEach(() => {
  state.transaction.mockReset();
});

describe('deductWalletBalance', () => {
  it('guards on sufficient balance, decrements, and logs a negative ledger row', async () => {
    const { updateChain, insertMock, insertChain } = setupTransaction([
      { walletBalancePaise: 8000 },
    ]);

    const result = await deductWalletBalance('user-1', 2000, 'chat_message');

    expect(result).toBe(true);
    const query = compile(updateChain.calls.where);
    expect(query.sql).toBe('("users"."id" = $1 and "users"."wallet_balance_paise" >= $2)');
    expect(query.params).toEqual(['user-1', 2000]);
    expect(insertMock).toHaveBeenCalledWith(walletTransactions);
    expect(insertChain.calls.values).toEqual({
      userId: 'user-1',
      delta: -2000,
      reason: 'chat_message',
      balanceAfter: 8000,
    });
  });

  it('returns false and writes no ledger row when the balance is insufficient', async () => {
    const { insertMock } = setupTransaction([]);

    const result = await deductWalletBalance('user-1', 2000, 'chat_message');

    expect(result).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: FAIL — `deductWalletBalance` currently takes only 2 args and never calls `tx.insert`/`db.transaction`.

- [ ] **Step 3: Implement**

In `src/modules/users/users.repo.ts`, change the schema import (top of file) from:
```ts
import {
  users,
  birthProfiles,
  devicePushTokens,
  userConsentLog,
  chatSessions,
  userFacts,
  chatFeedbackReports,
  type NewUserRow,
  type NewUserConsentLogRow,
  type UserRow,
  type PlaceOfBirth,
} from '../../db/schema.js';
```
to:
```ts
import {
  users,
  birthProfiles,
  devicePushTokens,
  userConsentLog,
  chatSessions,
  userFacts,
  chatFeedbackReports,
  walletTransactions,
  type NewUserRow,
  type NewUserConsentLogRow,
  type UserRow,
  type PlaceOfBirth,
} from '../../db/schema.js';
```

Replace:
```ts
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
```
with:
```ts
export async function deductWalletBalance(
  userId: string,
  amountPaise: number,
  reason: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [charged] = await tx
      .update(users)
      .set({ walletBalancePaise: sql`${users.walletBalancePaise} - ${amountPaise}` })
      .where(and(eq(users.id, userId), gte(users.walletBalancePaise, amountPaise)))
      .returning({ walletBalancePaise: users.walletBalancePaise });
    if (!charged) return false;

    await tx.insert(walletTransactions).values({
      userId,
      delta: -amountPaise,
      reason,
      balanceAfter: charged.walletBalancePaise,
    });
    return true;
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: PASS. If the compiled `where` SQL string differs slightly from the assertion above (drizzle's exact spacing/parenthesization), update the assertion to match the real compiled output — don't change the implementation to chase a guessed string.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.repo.ts test/users-repo-wallet.spec.ts
git commit -m "feat(billing): deductWalletBalance writes a wallet_transactions ledger row"
```

---

## Task 3: `addWalletBalance` — reason param + ledger write

**Files:**
- Modify: `src/modules/users/users.repo.ts:150-157`
- Test: `test/users-repo-wallet.spec.ts` (extend)

- [ ] **Step 1: Add the failing test**

Append to `test/users-repo-wallet.spec.ts`:

```ts
describe('addWalletBalance', () => {
  it('increments the balance and logs a positive ledger row', async () => {
    const { updateChain, insertChain } = setupTransaction([{ walletBalancePaise: 10000 }]);

    await addWalletBalance('user-1', 2000, 'refund:chat_message');

    const query = compile(updateChain.calls.where);
    expect(query.params).toEqual(['user-1']);
    expect(insertChain.calls.values).toEqual({
      userId: 'user-1',
      delta: 2000,
      reason: 'refund:chat_message',
      balanceAfter: 10000,
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: FAIL — `addWalletBalance` still takes 2 args, returns `void`, never inserts a ledger row.

- [ ] **Step 3: Implement**

Replace:
```ts
export async function addWalletBalance(userId: string, amountPaise: number): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET wallet_balance_paise = wallet_balance_paise + ${amountPaise}
    WHERE id = ${userId};
  `);
}
```
with:
```ts
export async function addWalletBalance(
  userId: string,
  amountPaise: number,
  reason: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ walletBalancePaise: sql`${users.walletBalancePaise} + ${amountPaise}` })
      .where(eq(users.id, userId))
      .returning({ walletBalancePaise: users.walletBalancePaise });
    if (!updated) return;

    await tx.insert(walletTransactions).values({
      userId,
      delta: amountPaise,
      reason,
      balanceAfter: updated.walletBalancePaise,
    });
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: PASS (adjust the compiled-SQL assertion to match reality if needed, same caveat as Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.repo.ts test/users-repo-wallet.spec.ts
git commit -m "feat(billing): addWalletBalance writes a wallet_transactions ledger row"
```

---

## Task 4: `unlockHouseForUser` — ledger write

**Files:**
- Modify: `src/modules/users/users.repo.ts:346-357`
- Test: `test/users-repo-wallet.spec.ts` (extend)

- [ ] **Step 1: Add the failing tests**

Append:

```ts
describe('unlockHouseForUser', () => {
  it('charges, appends the house, and logs a house_unlock ledger row', async () => {
    const { updateChain, insertChain } = setupTransaction([{ walletBalancePaise: 45000 }]);

    const result = await unlockHouseForUser('user-1', 7);

    expect(result).toBe(true);
    const query = compile(updateChain.calls.where);
    expect(query.params).toEqual(['user-1', HOUSE_UNLOCK_COST_PAISE, 7]);
    expect(insertChain.calls.values).toEqual({
      userId: 'user-1',
      delta: -HOUSE_UNLOCK_COST_PAISE,
      reason: 'house_unlock:7',
      balanceAfter: 45000,
    });
  });

  it('returns false and writes no ledger row when the guard fails', async () => {
    const { insertMock } = setupTransaction([]);

    const result = await unlockHouseForUser('user-1', 7);

    expect(result).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: FAIL — current implementation is a bare `db.execute`, never calls `db.transaction`/`tx.insert`.

- [ ] **Step 3: Implement**

Replace:
```ts
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
```
with:
```ts
export async function unlockHouseForUser(userId: string, houseNumber: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [unlocked] = await tx
      .update(users)
      .set({
        walletBalancePaise: sql`${users.walletBalancePaise} - ${HOUSE_UNLOCK_COST_PAISE}`,
        unlockedHouses: sql`array_append(${users.unlockedHouses}, ${houseNumber})`,
      })
      .where(
        and(
          eq(users.id, userId),
          gte(users.walletBalancePaise, HOUSE_UNLOCK_COST_PAISE),
          sql`NOT (${houseNumber} = ANY(${users.unlockedHouses}))`,
        ),
      )
      .returning({ walletBalancePaise: users.walletBalancePaise });
    if (!unlocked) return false;

    await tx.insert(walletTransactions).values({
      userId,
      delta: -HOUSE_UNLOCK_COST_PAISE,
      reason: `house_unlock:${houseNumber}`,
      balanceAfter: unlocked.walletBalancePaise,
    });
    return true;
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.repo.ts test/users-repo-wallet.spec.ts
git commit -m "feat(billing): unlockHouseForUser writes a wallet_transactions ledger row"
```

---

## Task 5: `unlockGemstoneForUser` — ledger write

**Files:**
- Modify: `src/modules/users/users.repo.ts:368-379`
- Test: `test/users-repo-wallet.spec.ts` (extend)

- [ ] **Step 1: Add the failing test**

Append:

```ts
describe('unlockGemstoneForUser', () => {
  it('charges, flips the flag, and logs a gemstone_unlock ledger row', async () => {
    const { insertChain } = setupTransaction([{ walletBalancePaise: 90000 }]);

    const result = await unlockGemstoneForUser('user-1');

    expect(result).toBe(true);
    expect(insertChain.calls.values).toEqual({
      userId: 'user-1',
      delta: -GEMSTONE_UNLOCK_COST_PAISE,
      reason: 'gemstone_unlock',
      balanceAfter: 90000,
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace:
```ts
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
with:
```ts
export async function unlockGemstoneForUser(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [unlocked] = await tx
      .update(users)
      .set({
        walletBalancePaise: sql`${users.walletBalancePaise} - ${GEMSTONE_UNLOCK_COST_PAISE}`,
        gemstoneUnlockedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, userId),
          gte(users.walletBalancePaise, GEMSTONE_UNLOCK_COST_PAISE),
          isNull(users.gemstoneUnlockedAt),
        ),
      )
      .returning({ walletBalancePaise: users.walletBalancePaise });
    if (!unlocked) return false;

    await tx.insert(walletTransactions).values({
      userId,
      delta: -GEMSTONE_UNLOCK_COST_PAISE,
      reason: 'gemstone_unlock',
      balanceAfter: unlocked.walletBalancePaise,
    });
    return true;
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/users-repo-wallet.spec.ts`
Expected: PASS, all 8 tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.repo.ts test/users-repo-wallet.spec.ts
git commit -m "feat(billing): unlockGemstoneForUser writes a wallet_transactions ledger row"
```

---

## Task 6: Update chat call sites (`astro.routes.ts`)

**Files:**
- Modify: `src/modules/astro/astro.routes.ts:463`, `:508`, `:549`

No new test here — `test/chat-stream-profile.spec.ts` mocks `users.repo.js` without `deductWalletBalance`/`addWalletBalance` at all (it doesn't exercise this charge path), so there's nothing to update there.

- [ ] **Step 1: Pass `reason` at the charge call site**

Find:
```ts
  const charged = await deductWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE);
  if (!charged) {
    throw Errors.conflict('Not enough credits to ask a question');
  }
```
Replace with:
```ts
  const charged = await deductWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE, 'chat_message');
  if (!charged) {
    throw Errors.conflict('Not enough credits to ask a question');
  }
```

- [ ] **Step 2: Pass `reason` at both refund call sites**

Find (inside the "generation succeeded with nothing to show" branch):
```ts
          // Generation "succeeded" with nothing to show (e.g. hit the
          // token ceiling before any content could be flushed) — don't
          // charge for a question that got no answer.
          await addWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE).catch(() => {});
```
Replace with:
```ts
          // Generation "succeeded" with nothing to show (e.g. hit the
          // token ceiling before any content could be flushed) — don't
          // charge for a question that got no answer.
          await addWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE, 'refund:chat_message').catch(() => {});
```

Find (inside the catch block):
```ts
      // emit a terminal event (and never leak internals to the client).
      logger.error({ err, userId: user.id }, 'chat stream failed');
      // Don't charge for a question the LLM never actually answered.
      await addWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE).catch(() => {});
```
Replace with:
```ts
      // emit a terminal event (and never leak internals to the client).
      logger.error({ err, userId: user.id }, 'chat stream failed');
      // Don't charge for a question the LLM never actually answered.
      await addWalletBalance(user.id, CHAT_MESSAGE_COST_PAISE, 'refund:chat_message').catch(() => {});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors (both functions now require a third arg, both call sites supply one).

- [ ] **Step 4: Commit**

```bash
git add src/modules/astro/astro.routes.ts
git commit -m "feat(billing): tag chat charge/refund calls with a wallet_transactions reason"
```

---

## Task 7: Update Vastu call sites (`vastu.service.ts`) + existing test

**Files:**
- Modify: `src/modules/vastu/vastu.service.ts:76`, `:110`, `:140`
- Modify: `test/vastu-service-profile.spec.ts`

- [ ] **Step 1: Update the three call sites**

Find:
```ts
  const charged = await deductWalletBalance(userId, VASTU_COST_PAISE);
  if (!charged) throw Errors.conflict('INSUFFICIENT_CREDITS');
```
Replace with:
```ts
  const charged = await deductWalletBalance(userId, VASTU_COST_PAISE, 'vastu_report');
  if (!charged) throw Errors.conflict('INSUFFICIENT_CREDITS');
```

Find (inside `requestVastuAnalysis`'s catch):
```ts
    return { planId: row.id };
  } catch (err) {
    await addWalletBalance(userId, VASTU_COST_PAISE).catch(() => {});
    throw err;
  }
}
```
Replace with:
```ts
    return { planId: row.id };
  } catch (err) {
    await addWalletBalance(userId, VASTU_COST_PAISE, 'refund:vastu_report').catch(() => {});
    throw err;
  }
}
```

Find (inside `processAnalysis`'s catch):
```ts
    logger.error({ err, planId }, 'vastu LLM analysis failed');
    await markError(planId, err instanceof Error ? err.message : 'Unknown error');
    // Don't charge for a report we couldn't produce.
    await addWalletBalance(userId, VASTU_COST_PAISE).catch(() => {});
  }
}
```
Replace with:
```ts
    logger.error({ err, planId }, 'vastu LLM analysis failed');
    await markError(planId, err instanceof Error ? err.message : 'Unknown error');
    // Don't charge for a report we couldn't produce.
    await addWalletBalance(userId, VASTU_COST_PAISE, 'refund:vastu_report').catch(() => {});
  }
}
```

- [ ] **Step 2: Update the existing test's mock call assertions**

`test/vastu-service-profile.spec.ts` mocks `deductWalletBalance`/`addWalletBalance` wholesale but doesn't currently assert on their call args (it only sets return values via `mockResolvedValue`). Run the suite first to confirm it still passes unchanged (mocks don't care about extra args), then add explicit call-arg assertions so the reason strings are actually verified. Find the test that exercises the happy path (charges then succeeds) and add, right after its existing assertions:

```ts
    expect(state.deductWalletBalance).toHaveBeenCalledWith(
      expect.any(String),
      VASTU_COST_PAISE,
      'vastu_report',
    );
```

(Import `VASTU_COST_PAISE` from `../src/modules/vastu/vastu.service.js` at the top of the test file if not already imported.)

Find the test covering the refund-on-failure path and add:

```ts
    expect(state.addWalletBalance).toHaveBeenCalledWith(
      expect.any(String),
      VASTU_COST_PAISE,
      'refund:vastu_report',
    );
```

- [ ] **Step 3: Run the suite**

Run: `npx vitest run test/vastu-service-profile.spec.ts`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/modules/vastu/vastu.service.ts test/vastu-service-profile.spec.ts
git commit -m "feat(billing): tag Vastu charge/refund calls with a wallet_transactions reason"
```

---

## Task 8: Update profile-creation call sites (`profiles.service.ts`) + existing test

**Files:**
- Modify: `src/modules/birth-profiles/profiles.service.ts:97`, `:104`
- Modify: `test/profiles.spec.ts`

- [ ] **Step 1: Update the two call sites**

Find:
```ts
  const charged = await deductWalletBalance(user.id, PROFILE_CREATION_COST_PAISE);
  if (!charged) throw Errors.conflict('INSUFFICIENT_CREDITS');

  let created: BirthProfileRow;
  try {
    created = await createBirthProfile(user.id, body);
  } catch (err) {
    await addWalletBalance(user.id, PROFILE_CREATION_COST_PAISE).catch(() => {});
    throw err;
  }
```
Replace with:
```ts
  const charged = await deductWalletBalance(user.id, PROFILE_CREATION_COST_PAISE, 'profile_creation');
  if (!charged) throw Errors.conflict('INSUFFICIENT_CREDITS');

  let created: BirthProfileRow;
  try {
    created = await createBirthProfile(user.id, body);
  } catch (err) {
    await addWalletBalance(user.id, PROFILE_CREATION_COST_PAISE, 'refund:profile_creation').catch(() => {});
    throw err;
  }
```

- [ ] **Step 2: Update the existing test's assertions**

In `test/profiles.spec.ts`, find:
```ts
    expect(state.deductWalletBalance).toHaveBeenCalledWith('id-1', 20000);
```
Replace with:
```ts
    expect(state.deductWalletBalance).toHaveBeenCalledWith('id-1', 20000, 'profile_creation');
```

Find:
```ts
    expect(state.addWalletBalance).toHaveBeenCalledWith('id-1', 20000);
```
Replace with:
```ts
    expect(state.addWalletBalance).toHaveBeenCalledWith('id-1', 20000, 'refund:profile_creation');
```

- [ ] **Step 3: Run the suite**

Run: `npx vitest run test/profiles.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/birth-profiles/profiles.service.ts test/profiles.spec.ts
git commit -m "feat(billing): tag profile-creation charge/refund calls with a wallet_transactions reason"
```

---

## Task 9: Owned-profile gemstone unlock — ledger write

**Files:**
- Modify: `src/modules/birth-profiles/birth-profiles.repo.ts:1-8` (imports), `:183-221` (function body)
- Modify: `test/birth-profiles-repo.spec.ts`

- [ ] **Step 1: Extend the test's transaction-mocking helper to also mock `insert`**

In `test/birth-profiles-repo.spec.ts`, the `describe('unlockGemstoneForOwnedProfile', ...)` block's `setupTransaction` currently only wires `update`. Find:
```ts
  function setupTransaction(chargedResult: unknown[], unlockedResult: unknown[]) {
    const usersChain = makeUpdateChain(chargedResult);
    const birthProfilesChain = makeUpdateChain(unlockedResult);
    const updateMock = vi.fn((table: unknown): FakeUpdateChain => {
      if (table === users) return usersChain.chain;
      if (table === birthProfiles) return birthProfilesChain.chain;
      throw new Error(`unexpected table passed to tx.update: ${String(table)}`);
    });
    state.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb({ update: updateMock }),
    );
    return { usersChain, birthProfilesChain, updateMock };
  }

  it('charges the owner and flips the flag when credits suffice and the profile is still locked', async () => {
    const { usersChain, birthProfilesChain } = setupTransaction(
      [{ id: 'user-1' }],
      [{ id: 'profile-1' }],
    );
```
Replace with:
```ts
  function setupTransaction(chargedResult: unknown[], unlockedResult: unknown[]) {
    const usersChain = makeUpdateChain(chargedResult);
    const birthProfilesChain = makeUpdateChain(unlockedResult);
    const insertCalls: { values?: unknown } = {};
    const insertMock = vi.fn(() => ({
      values: vi.fn((v: unknown) => {
        insertCalls.values = v;
        return Promise.resolve(undefined);
      }),
    }));
    const updateMock = vi.fn((table: unknown): FakeUpdateChain => {
      if (table === users) return usersChain.chain;
      if (table === birthProfiles) return birthProfilesChain.chain;
      throw new Error(`unexpected table passed to tx.update: ${String(table)}`);
    });
    state.transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
      cb({ update: updateMock, insert: insertMock }),
    );
    return { usersChain, birthProfilesChain, updateMock, insertMock, insertCalls };
  }

  it('charges the owner and flips the flag when credits suffice and the profile is still locked', async () => {
    const { usersChain, birthProfilesChain, insertCalls } = setupTransaction(
      [{ walletBalancePaise: 76000 }],
      [{ id: 'profile-1' }],
    );
```

- [ ] **Step 2: Add the ledger assertion to that same test**

At the end of the `it('charges the owner and flips the flag...')` test body, add:
```ts

    expect(insertCalls.values).toEqual({
      userId: 'user-1',
      delta: -GEMSTONE_UNLOCK_COST_PAISE,
      reason: 'gemstone_unlock:profile:profile-1',
      balanceAfter: 76000,
    });
```

Also update the other two tests in this `describe` block that call `setupTransaction([{ id: 'user-1' }], ...)` — change that first-arg fake row to `[{ walletBalancePaise: 76000 }]` so the shape matches what the new `.returning()` actually requests (`walletBalancePaise`, not `id`).

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run test/birth-profiles-repo.spec.ts`
Expected: FAIL — current implementation's `.returning({ id: users.id })` never returns `walletBalancePaise`, and there's no `tx.insert` call at all.

- [ ] **Step 4: Implement**

Add `walletTransactions` to the schema import (top of `birth-profiles.repo.ts`):
```ts
import {
  birthProfiles,
  users,
  type BirthProfileRow,
  type NewBirthProfileRow,
  type PlaceOfBirth,
} from '../../db/schema.js';
```
becomes:
```ts
import {
  birthProfiles,
  users,
  walletTransactions,
  type BirthProfileRow,
  type NewBirthProfileRow,
  type PlaceOfBirth,
} from '../../db/schema.js';
```

Replace `unlockGemstoneForOwnedProfile`'s body:
```ts
export async function unlockGemstoneForOwnedProfile(
  id: string,
  ownerUserId: string,
): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const [charged] = await tx
        .update(users)
        .set({
          walletBalancePaise: sql`${users.walletBalancePaise} - ${GEMSTONE_UNLOCK_COST_PAISE}`,
        })
        .where(
          and(eq(users.id, ownerUserId), gte(users.walletBalancePaise, GEMSTONE_UNLOCK_COST_PAISE)),
        )
        .returning({ id: users.id });
      if (!charged) throw new UnlockGuardFailed();

      const [unlocked] = await tx
        .update(birthProfiles)
        .set({ gemstoneUnlockedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(birthProfiles.id, id),
            eq(birthProfiles.ownerUserId, ownerUserId),
            isNull(birthProfiles.deletedAt),
            isNull(birthProfiles.gemstoneUnlockedAt),
          ),
        )
        .returning({ id: birthProfiles.id });
      if (!unlocked) throw new UnlockGuardFailed();

      return true;
    });
  } catch (err) {
    if (err instanceof UnlockGuardFailed) return false;
    throw err;
  }
}
```
with:
```ts
export async function unlockGemstoneForOwnedProfile(
  id: string,
  ownerUserId: string,
): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const [charged] = await tx
        .update(users)
        .set({
          walletBalancePaise: sql`${users.walletBalancePaise} - ${GEMSTONE_UNLOCK_COST_PAISE}`,
        })
        .where(
          and(eq(users.id, ownerUserId), gte(users.walletBalancePaise, GEMSTONE_UNLOCK_COST_PAISE)),
        )
        .returning({ walletBalancePaise: users.walletBalancePaise });
      if (!charged) throw new UnlockGuardFailed();

      const [unlocked] = await tx
        .update(birthProfiles)
        .set({ gemstoneUnlockedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(birthProfiles.id, id),
            eq(birthProfiles.ownerUserId, ownerUserId),
            isNull(birthProfiles.deletedAt),
            isNull(birthProfiles.gemstoneUnlockedAt),
          ),
        )
        .returning({ id: birthProfiles.id });
      if (!unlocked) throw new UnlockGuardFailed();

      await tx.insert(walletTransactions).values({
        userId: ownerUserId,
        delta: -GEMSTONE_UNLOCK_COST_PAISE,
        reason: `gemstone_unlock:profile:${id}`,
        balanceAfter: charged.walletBalancePaise,
      });

      return true;
    });
  } catch (err) {
    if (err instanceof UnlockGuardFailed) return false;
    throw err;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run test/birth-profiles-repo.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/birth-profiles/birth-profiles.repo.ts test/birth-profiles-repo.spec.ts
git commit -m "feat(billing): unlockGemstoneForOwnedProfile writes a wallet_transactions ledger row"
```

---

## Task 10: Owned-profile house unlock — ledger write

**Files:**
- Modify: `src/modules/birth-profiles/birth-profiles.repo.ts:251-290`
- Modify: `test/birth-profiles-repo.spec.ts`

- [ ] **Step 1: Apply the same `setupTransaction` extension to the `unlockHouseForOwnedProfile` describe block**

Its `setupTransaction` is defined separately (duplicated) in that `describe` block — apply the identical change as Task 9 Step 1 (add `insertMock`/`insertCalls`, pass `insert: insertMock` into the `cb({...})` call, return them). Change the happy-path test's first `setupTransaction` arg from `[{ id: 'user-1' }]` to `[{ walletBalancePaise: 40000 }]`, and its other two tests' first args likewise.

- [ ] **Step 2: Add the ledger assertion**

At the end of `it('charges the owner and appends the house when credits suffice and the house is not yet unlocked', ...)`, add:
```ts

    expect(insertCalls.values).toEqual({
      userId: 'user-1',
      delta: -HOUSE_UNLOCK_COST_PAISE,
      reason: 'house_unlock:7:profile:profile-1',
      balanceAfter: 40000,
    });
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run test/birth-profiles-repo.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement**

Replace `unlockHouseForOwnedProfile`'s body:
```ts
export async function unlockHouseForOwnedProfile(
  id: string,
  ownerUserId: string,
  houseNumber: number,
): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const [charged] = await tx
        .update(users)
        .set({ walletBalancePaise: sql`${users.walletBalancePaise} - ${HOUSE_UNLOCK_COST_PAISE}` })
        .where(
          and(eq(users.id, ownerUserId), gte(users.walletBalancePaise, HOUSE_UNLOCK_COST_PAISE)),
        )
        .returning({ id: users.id });
      if (!charged) throw new UnlockGuardFailed();

      const [unlocked] = await tx
        .update(birthProfiles)
        .set({
          unlockedHouses: sql`array_append(coalesce(${birthProfiles.unlockedHouses}, ARRAY[]::integer[]), ${houseNumber})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(birthProfiles.id, id),
            eq(birthProfiles.ownerUserId, ownerUserId),
            isNull(birthProfiles.deletedAt),
            sql`NOT (${houseNumber} = ANY(coalesce(${birthProfiles.unlockedHouses}, ARRAY[]::integer[])))`,
          ),
        )
        .returning({ id: birthProfiles.id });
      if (!unlocked) throw new UnlockGuardFailed();

      return true;
    });
  } catch (err) {
    if (err instanceof UnlockGuardFailed) return false;
    throw err;
  }
}
```
with:
```ts
export async function unlockHouseForOwnedProfile(
  id: string,
  ownerUserId: string,
  houseNumber: number,
): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const [charged] = await tx
        .update(users)
        .set({ walletBalancePaise: sql`${users.walletBalancePaise} - ${HOUSE_UNLOCK_COST_PAISE}` })
        .where(
          and(eq(users.id, ownerUserId), gte(users.walletBalancePaise, HOUSE_UNLOCK_COST_PAISE)),
        )
        .returning({ walletBalancePaise: users.walletBalancePaise });
      if (!charged) throw new UnlockGuardFailed();

      const [unlocked] = await tx
        .update(birthProfiles)
        .set({
          unlockedHouses: sql`array_append(coalesce(${birthProfiles.unlockedHouses}, ARRAY[]::integer[]), ${houseNumber})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(birthProfiles.id, id),
            eq(birthProfiles.ownerUserId, ownerUserId),
            isNull(birthProfiles.deletedAt),
            sql`NOT (${houseNumber} = ANY(coalesce(${birthProfiles.unlockedHouses}, ARRAY[]::integer[])))`,
          ),
        )
        .returning({ id: birthProfiles.id });
      if (!unlocked) throw new UnlockGuardFailed();

      await tx.insert(walletTransactions).values({
        userId: ownerUserId,
        delta: -HOUSE_UNLOCK_COST_PAISE,
        reason: `house_unlock:${houseNumber}:profile:${id}`,
        balanceAfter: charged.walletBalancePaise,
      });

      return true;
    });
  } catch (err) {
    if (err instanceof UnlockGuardFailed) return false;
    throw err;
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run test/birth-profiles-repo.spec.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck the whole backend**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/birth-profiles/birth-profiles.repo.ts test/birth-profiles-repo.spec.ts
git commit -m "feat(billing): unlockHouseForOwnedProfile writes a wallet_transactions ledger row"
```

---

## Task 11: Billing schemas — `Transaction`/`TransactionsResponse`

**Files:**
- Modify: `src/modules/billing/billing.schemas.ts` (add after `OrdersResponseSchema`)

- [ ] **Step 1: Add the schemas**

Find:
```ts
export const OrdersResponseSchema = z
  .object({ orders: z.array(OrderSchema) })
  .openapi('OrdersResponse');
```
Add immediately after it:
```ts

export const TransactionSchema = z
  .discriminatedUnion('kind', [
    z.object({
      id: z.string(),
      kind: z.literal('recharge'),
      createdAt: z.string(),
      amountPaise: z.number(),
      status: z.enum(['pending', 'paid', 'failed', 'cancelled']),
    }),
    z.object({
      id: z.string(),
      kind: z.enum(['chat', 'vastu_report', 'gemstone_unlock', 'profile_creation']),
      createdAt: z.string(),
      amountPaise: z.number(),
      balanceAfterPaise: z.number(),
      isRefund: z.boolean(),
    }),
    z.object({
      id: z.string(),
      kind: z.literal('house_unlock'),
      createdAt: z.string(),
      amountPaise: z.number(),
      balanceAfterPaise: z.number(),
      isRefund: z.boolean(),
      houseNumber: z.number(),
    }),
  ])
  .openapi('Transaction');

export const TransactionsResponseSchema = z
  .object({ transactions: z.array(TransactionSchema) })
  .openapi('TransactionsResponse');
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/modules/billing/billing.schemas.ts
git commit -m "feat(billing): add Transaction/TransactionsResponse schemas"
```

---

## Task 12: `findDebitsForUser` (billing repo)

**Files:**
- Modify: `src/modules/billing/billing.repo.ts`

- [ ] **Step 1: Add the drizzle-orm operators and type needed**

Find:
```ts
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  coupons,
  orders,
  users,
  walletTransactions,
  type CouponRow,
  type NewCouponRow,
  type OrderRow,
  type NewOrderRow,
} from '../../db/schema.js';
```
Replace with:
```ts
import { and, desc, eq, not, like, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  coupons,
  orders,
  users,
  walletTransactions,
  type CouponRow,
  type NewCouponRow,
  type OrderRow,
  type NewOrderRow,
  type WalletTransactionRow,
} from '../../db/schema.js';
```

- [ ] **Step 2: Add `findDebitsForUser`**

Find:
```ts
/** A user's full order history (any status), most recent first — powers the Settings > Recharge History screen. */
export async function findOrdersForUser(userId: string, limit = 50): Promise<OrderRow[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}
```
Add immediately after it:
```ts

/**
 * A user's own wallet_transactions rows EXCEPT recharge grants (those are
 * already represented by `findOrdersForUser`'s `orders` rows, and would be
 * double-counted here) — every spend and every refund, most recent first.
 * Filtered by reason prefix rather than `delta < 0` because a refund row has
 * a POSITIVE delta but still needs to appear; only `purchase:*`-reason rows
 * are excluded.
 */
export async function findDebitsForUser(
  userId: string,
  limit = 50,
): Promise<WalletTransactionRow[]> {
  return db
    .select()
    .from(walletTransactions)
    .where(and(eq(walletTransactions.userId, userId), not(like(walletTransactions.reason, 'purchase:%'))))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/modules/billing/billing.repo.ts
git commit -m "feat(billing): add findDebitsForUser"
```

---

## Task 13: `parseReason` + `listTransactions` (billing service)

**Files:**
- Modify: `src/modules/billing/billing.service.ts`
- Test: `test/billing-transactions.spec.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `test/billing-transactions.spec.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/modules/billing/billing.repo.js', () => ({
  findOrdersForUser: vi.fn(),
  findDebitsForUser: vi.fn(),
}));

import { findOrdersForUser, findDebitsForUser } from '../src/modules/billing/billing.repo.js';
import { parseReason, listTransactions } from '../src/modules/billing/billing.service.js';

describe('parseReason', () => {
  it('parses every charge reason shape', () => {
    expect(parseReason('chat_message')).toEqual({ kind: 'chat', isRefund: false });
    expect(parseReason('vastu_report')).toEqual({ kind: 'vastu_report', isRefund: false });
    expect(parseReason('profile_creation')).toEqual({ kind: 'profile_creation', isRefund: false });
    expect(parseReason('gemstone_unlock')).toEqual({ kind: 'gemstone_unlock', isRefund: false });
    expect(parseReason('gemstone_unlock:profile:abc')).toEqual({
      kind: 'gemstone_unlock',
      isRefund: false,
    });
    expect(parseReason('house_unlock:7')).toEqual({
      kind: 'house_unlock',
      houseNumber: 7,
      isRefund: false,
    });
    expect(parseReason('house_unlock:7:profile:abc')).toEqual({
      kind: 'house_unlock',
      houseNumber: 7,
      isRefund: false,
    });
  });

  it('strips a refund: prefix and sets isRefund', () => {
    expect(parseReason('refund:chat_message')).toEqual({ kind: 'chat', isRefund: true });
    expect(parseReason('refund:house_unlock:3')).toEqual({
      kind: 'house_unlock',
      houseNumber: 3,
      isRefund: true,
    });
  });

  it('throws on an unrecognized reason', () => {
    expect(() => parseReason('something_else')).toThrow('unrecognized wallet_transactions reason');
  });
});

const baseOrder = {
  id: 'order-1',
  userId: 'user-1',
  packId: 'topup_200',
  amountPaise: 20000,
  discountPaise: 0,
  finalAmountPaise: 20000,
  currency: 'INR',
  couponId: null,
  couponCode: null,
  status: 'paid' as const,
  gatewayProvider: 'mock',
  gatewayOrderId: null,
  gatewayPaymentId: null,
  createdAt: new Date('2026-07-10T00:00:00Z'),
  paidAt: new Date('2026-07-10T00:00:01Z'),
};

const baseLedgerRow = {
  id: 'ledger-1',
  userId: 'user-1',
  delta: -2000,
  reason: 'chat_message',
  balanceAfter: 8000,
  createdAt: new Date('2026-07-12T00:00:00Z'),
};

describe('listTransactions', () => {
  it('merges orders and debits sorted by createdAt desc', async () => {
    vi.mocked(findOrdersForUser).mockResolvedValue([baseOrder]);
    vi.mocked(findDebitsForUser).mockResolvedValue([baseLedgerRow]);

    const result = await listTransactions('user-1');

    expect(result).toEqual([
      {
        id: 'ledger-1',
        kind: 'chat',
        createdAt: '2026-07-12T00:00:00.000Z',
        amountPaise: 2000,
        balanceAfterPaise: 8000,
        isRefund: false,
      },
      {
        id: 'order-1',
        kind: 'recharge',
        createdAt: '2026-07-10T00:00:00.000Z',
        amountPaise: 20000,
        status: 'paid',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/billing-transactions.spec.ts`
Expected: FAIL — `parseReason`/`listTransactions` don't exist yet in `billing.service.js`.

- [ ] **Step 3: Implement**

In `src/modules/billing/billing.service.ts`, update the imports:
```ts
import { Errors } from '../../lib/errors.js';
import type { OrderRow } from '../../db/schema.js';
import {
  findActiveCouponByCode,
  insertOrder,
  findOrderByIdForUser,
  findOrdersForUser,
  findLatestOrderForPack,
  confirmOrderAndGrantCredits,
} from './billing.repo.js';
```
becomes:
```ts
import { Errors } from '../../lib/errors.js';
import type { OrderRow, WalletTransactionRow } from '../../db/schema.js';
import {
  findActiveCouponByCode,
  insertOrder,
  findOrderByIdForUser,
  findOrdersForUser,
  findDebitsForUser,
  findLatestOrderForPack,
  confirmOrderAndGrantCredits,
} from './billing.repo.js';
```

Find:
```ts
/** A user's own recharge/order history, most recent first. */
export async function listOrders(userId: string) {
  const rows = await findOrdersForUser(userId);
  return rows.map(toOrderDto);
}
```
Replace with:
```ts
/** A user's own recharge/order history, most recent first. */
export async function listOrders(userId: string) {
  const rows = await findOrdersForUser(userId);
  return rows.map(toOrderDto);
}

type TransactionKind =
  | 'chat'
  | 'vastu_report'
  | 'gemstone_unlock'
  | 'profile_creation'
  | 'house_unlock';

/**
 * Maps a wallet_transactions `reason` string to its display kind. A leading
 * `refund:` is stripped and reported separately via `isRefund` — the UI
 * shows one generic "Refund" treatment regardless of what was refunded.
 * `:profile:<id>` suffixes (owned-profile unlocks) are recognized but not
 * surfaced — the UI shows the same label whichever profile it was for.
 */
export function parseReason(
  reason: string,
): { kind: TransactionKind; houseNumber?: number; isRefund: boolean } {
  const isRefund = reason.startsWith('refund:');
  const base = isRefund ? reason.slice('refund:'.length) : reason;

  if (base === 'chat_message') return { kind: 'chat', isRefund };
  if (base === 'vastu_report') return { kind: 'vastu_report', isRefund };
  if (base === 'profile_creation') return { kind: 'profile_creation', isRefund };
  if (base === 'gemstone_unlock' || base.startsWith('gemstone_unlock:profile:')) {
    return { kind: 'gemstone_unlock', isRefund };
  }
  const houseMatch = base.match(/^house_unlock:(\d+)(?::profile:.+)?$/);
  if (houseMatch) {
    return { kind: 'house_unlock', houseNumber: Number(houseMatch[1]), isRefund };
  }
  throw new Error(`unrecognized wallet_transactions reason: ${reason}`);
}

interface RechargeTransaction {
  id: string;
  kind: 'recharge';
  createdAt: string;
  amountPaise: number;
  status: OrderRow['status'];
}

interface DebitTransaction {
  id: string;
  kind: Exclude<TransactionKind, 'house_unlock'>;
  createdAt: string;
  amountPaise: number;
  balanceAfterPaise: number;
  isRefund: boolean;
}

interface HouseUnlockTransaction {
  id: string;
  kind: 'house_unlock';
  createdAt: string;
  amountPaise: number;
  balanceAfterPaise: number;
  isRefund: boolean;
  houseNumber: number;
}

export type Transaction = RechargeTransaction | DebitTransaction | HouseUnlockTransaction;

function toTransactionDto(row: OrderRow | WalletTransactionRow): Transaction {
  if ('packId' in row) {
    return {
      id: row.id,
      kind: 'recharge',
      createdAt: row.createdAt.toISOString(),
      amountPaise: row.finalAmountPaise,
      status: row.status,
    };
  }
  const { kind, houseNumber, isRefund } = parseReason(row.reason);
  const base = {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    amountPaise: Math.abs(row.delta),
    balanceAfterPaise: row.balanceAfter,
    isRefund,
  };
  if (kind === 'house_unlock') {
    return { ...base, kind, houseNumber: houseNumber as number };
  }
  return { ...base, kind };
}

/** A user's full payment history — recharges plus every spend and refund — most recent first. */
export async function listTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const [orderRows, debitRows] = await Promise.all([
    findOrdersForUser(userId, limit),
    findDebitsForUser(userId, limit),
  ]);
  return [...orderRows, ...debitRows]
    .map(toTransactionDto)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/billing-transactions.spec.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/modules/billing/billing.service.ts test/billing-transactions.spec.ts
git commit -m "feat(billing): add parseReason/listTransactions merging orders and wallet_transactions"
```

---

## Task 14: Rename the route to `GET /v1/billing/transactions`

**Files:**
- Modify: `src/modules/billing/billing.routes.ts`

- [ ] **Step 1: Update imports**

Find:
```ts
import {
  BillingPlanResponseSchema,
  BillingBalanceResponseSchema,
  TopUpAmountsResponseSchema,
  ValidateCouponBodySchema,
  CouponValidationResponseSchema,
  CheckoutBodySchema,
  OrderSchema,
  OrderIdParamSchema,
  OrdersResponseSchema,
  ConfirmOrderResponseSchema,
  ConfirmGooglePlayBodySchema,
} from './billing.schemas.js';
import {
  getTopUpAmounts,
  validateCoupon,
  checkout,
  confirmPayment,
  confirmGooglePlayPurchase,
  listOrders,
  toOrderDto,
} from './billing.service.js';
```
Replace with:
```ts
import {
  BillingPlanResponseSchema,
  BillingBalanceResponseSchema,
  TopUpAmountsResponseSchema,
  ValidateCouponBodySchema,
  CouponValidationResponseSchema,
  CheckoutBodySchema,
  OrderSchema,
  OrderIdParamSchema,
  TransactionsResponseSchema,
  ConfirmOrderResponseSchema,
  ConfirmGooglePlayBodySchema,
} from './billing.schemas.js';
import {
  getTopUpAmounts,
  validateCoupon,
  checkout,
  confirmPayment,
  confirmGooglePlayPurchase,
  listTransactions,
  toOrderDto,
} from './billing.service.js';
```

- [ ] **Step 2: Replace the route definition and handler**

Find:
```ts
/* -------------------------------------------------------------------------- */
/* GET /billing/orders                                                        */
/* -------------------------------------------------------------------------- */

const ordersRoute = createRoute({
  method: 'get',
  path: '/billing/orders',
  tags: ['Billing'],
  summary: "The authenticated user's own recharge/order history, most recent first",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Order history',
      content: { 'application/json': { schema: OrdersResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
  },
});

billingRouter.openapi(ordersRoute, async (c) => {
  const user = c.get('user');
  const orders = await listOrders(user.id);
  return c.json({ orders }, 200);
});
```
Replace with:
```ts
/* -------------------------------------------------------------------------- */
/* GET /billing/transactions                                                  */
/* -------------------------------------------------------------------------- */

const transactionsRoute = createRoute({
  method: 'get',
  path: '/billing/transactions',
  tags: ['Billing'],
  summary:
    "The authenticated user's full payment history — recharges plus every spend and refund — most recent first",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Payment history',
      content: { 'application/json': { schema: TransactionsResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
  },
});

billingRouter.openapi(transactionsRoute, async (c) => {
  const user = c.get('user');
  const transactions = await listTransactions(user.id);
  return c.json({ transactions }, 200);
});
```

- [ ] **Step 3: Typecheck and run the full backend suite**

Run: `npm run typecheck && npm run test`
Expected: no errors; all suites pass (pre-existing unrelated failures, if any, are not introduced by this change — confirm by checking `git stash` + re-running if anything looks suspicious).

- [ ] **Step 4: Commit**

```bash
git add src/modules/billing/billing.routes.ts
git commit -m "feat(billing): rename GET /billing/orders to GET /billing/transactions"
```

---

## Task 15: Push the backend branch, merge, and deploy

- [ ] **Step 1: Final full-suite run**

```bash
cd "C:\dev\aroha-astrology\jyotish-backend-payment-history"
npm run lint
npm run typecheck
npm run test
```
Expected: all green.

- [ ] **Step 2: Push and merge to `main`**

```bash
git push -u origin feature/payment-history
git fetch origin
git log origin/main..HEAD --oneline   # confirm nothing from a concurrent bot push conflicts
git checkout main
git pull origin main
git merge --no-ff feature/payment-history -m "Merge feature/payment-history: payment history ledger + endpoint"
git push origin main
```

If `origin/main` has moved since the branch was cut (the bot pushes independently — see project memory on this), rebase or merge `origin/main` into the feature branch first and re-run the full suite before merging forward.

- [ ] **Step 3: Deploy to EC2**

```bash
tar czf - --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='secrets' --exclude='.env' . | ssh -i "$PEM" ec2-user@13.232.179.137 "tar xzf - -C /home/ec2-user/aroha-backend"
ssh -i "$PEM" ec2-user@13.232.179.137 "cd /home/ec2-user/aroha-backend && npm ci && npm run build && pm2 reload aroha-api && pm2 save"
```
(`$PEM` is the EC2 key path, supplied by the user per-session.) No new migration is needed — `wallet_transactions` already exists.

- [ ] **Step 4: Verify the deploy**

```bash
ssh -i "$PEM" ec2-user@13.232.179.137 "cd /home/ec2-user/aroha-backend && git log -1 --oneline"
curl https://api.arohaastrology.in/healthz
curl https://api.arohaastrology.in/readyz
curl -i https://api.arohaastrology.in/v1/billing/transactions   # expect 401 (unauthenticated), NOT 404 — proves the route registered
```

---

## Task 16: Frontend — `lib/api.ts` Transaction type

**Files:**
- Modify: `lib/api.ts:467-473` (types), `:858-859` (`orderHistory`)

- [ ] **Step 1: Replace the `Order`/`OrderStatus` section with the `Transaction` union**

Find:
```ts
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface Order {
  id: string;
  packId: string;
  amountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  currency: string;
  couponCode: string | null;
  status: OrderStatus;
  gatewayProvider: string;
  createdAt: string;
  paidAt: string | null;
}
```
Keep this exactly as-is (still used by checkout/confirm) and add immediately after it:
```ts

export type TransactionKind =
  | "recharge"
  | "chat"
  | "vastu_report"
  | "gemstone_unlock"
  | "profile_creation"
  | "house_unlock";

export type Transaction =
  | { id: string; kind: "recharge"; createdAt: string; amountPaise: number; status: OrderStatus }
  | {
      id: string;
      kind: Exclude<TransactionKind, "recharge" | "house_unlock">;
      createdAt: string;
      amountPaise: number;
      balanceAfterPaise: number;
      isRefund: boolean;
    }
  | {
      id: string;
      kind: "house_unlock";
      createdAt: string;
      amountPaise: number;
      balanceAfterPaise: number;
      isRefund: boolean;
      houseNumber: number;
    };
```

- [ ] **Step 2: Replace `orderHistory` with `transactionHistory`**

Find:
```ts
  /** The current user's own recharge/order history, most recent first. */
  orderHistory: () => request<{ orders: Order[] }>("/v1/billing/orders", { auth: true }),
```
Replace with:
```ts
  /** The current user's full payment history — recharges plus every spend and refund, most recent first. */
  transactionHistory: () =>
    request<{ transactions: Transaction[] }>("/v1/billing/transactions", { auth: true }),
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: fails at this point — `app/settings/history/page.tsx` still references `api.orderHistory`/`Order` (fixed in Task 17). That's expected; confirm the error is only in that one file.

- [ ] **Step 4: Commit**

```bash
git add lib/api.ts
git commit -m "feat(billing): replace orderHistory with transactionHistory"
```

---

## Task 17: Frontend — render the unified list

**Files:**
- Modify: `app/settings/history/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the page**

Replace the entire file with:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, MessageCircle, Compass, Gem, UserPlus, Home, RotateCcw, Wallet } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import { api, type Transaction, type OrderStatus } from "@/lib/api";
import { formatRupees } from "@/lib/format";

function statusLabel(t: (key: string) => string, status: OrderStatus): string {
  switch (status) {
    case "paid": return t("orderHistory.statusPaid");
    case "pending": return t("orderHistory.statusPending");
    case "failed": return t("orderHistory.statusFailed");
    case "cancelled": return t("orderHistory.statusCancelled");
  }
}

function statusClasses(status: OrderStatus): string {
  switch (status) {
    case "paid": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "pending": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    default: return "text-red-400 bg-red-500/10 border-red-500/30";
  }
}

function kindIcon(kind: Transaction["kind"]) {
  switch (kind) {
    case "recharge": return <Wallet size={16} />;
    case "chat": return <MessageCircle size={16} />;
    case "vastu_report": return <Compass size={16} />;
    case "gemstone_unlock": return <Gem size={16} />;
    case "profile_creation": return <UserPlus size={16} />;
    case "house_unlock": return <Home size={16} />;
  }
}

function kindLabel(t: (key: string, opts?: Record<string, unknown>) => string, txn: Transaction): string {
  switch (txn.kind) {
    case "recharge": return t("paymentHistory.title");
    case "chat": return t("paymentHistory.chat");
    case "vastu_report": return t("paymentHistory.vastuReport");
    case "gemstone_unlock": return t("paymentHistory.gemstoneUnlock");
    case "profile_creation": return t("paymentHistory.profileCreation");
    case "house_unlock": return t("paymentHistory.houseUnlock", { houseNumber: txn.houseNumber });
  }
}

function TransactionRow({ txn, t }: { txn: Transaction; t: (key: string, opts?: Record<string, unknown>) => string }) {
  if (txn.kind === "recharge") {
    return (
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gold">{kindIcon(txn.kind)}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{formatRupees(txn.amountPaise)}</p>
            <p className="text-xs text-muted mt-0.5">{new Date(txn.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusClasses(txn.status)}`}>
          {statusLabel(t, txn.status)}
        </span>
      </Card>
    );
  }

  const isRefund = txn.isRefund;
  return (
    <Card className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-gold">{isRefund ? <RotateCcw size={16} /> : kindIcon(txn.kind)}</span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isRefund ? t("paymentHistory.refund") : kindLabel(t, txn)}
          </p>
          <p className="text-xs text-muted mt-0.5">{new Date(txn.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isRefund ? "text-emerald-400" : "text-red-400"}`}>
          {isRefund ? "+" : "-"}
          {formatRupees(txn.amountPaise)}
        </p>
        <p className="text-[11px] text-muted mt-0.5">
          {t("paymentHistory.balanceLabel", { balance: formatRupees(txn.balanceAfterPaise) })}
        </p>
      </div>
    </Card>
  );
}

export default function PaymentHistoryPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.transactionHistory()
      .then(({ transactions }) => setTransactions(transactions))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen pb-tab-safe bg-background">
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <h1 className="text-lg font-display text-foreground">{t("paymentHistory.title")}</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gold" /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center text-center py-14">
            <Wallet size={28} className="text-muted mb-3" />
            <p className="text-sm text-muted">{t("paymentHistory.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} t={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: fails only on `app/settings/page.tsx`'s `t("settings.rechargeHistory")` and the still-missing `i18n` keys (fixed in Tasks 18–19).

- [ ] **Step 3: Commit**

```bash
git add app/settings/history/page.tsx
git commit -m "feat(billing): render unified payment history (recharges + spends + refunds)"
```

---

## Task 18: Frontend — settings link rename

**Files:**
- Modify: `app/settings/page.tsx:222`

- [ ] **Step 1: Update the link label key**

Find:
```tsx
          <SettingsLink href="/settings/history" icon={<Wallet size={16} />} label={t("settings.rechargeHistory")} />
```
Replace with:
```tsx
          <SettingsLink href="/settings/history" icon={<Wallet size={16} />} label={t("settings.paymentHistory")} />
```

- [ ] **Step 2: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat(billing): rename settings link to Payment History"
```

---

## Task 19: Frontend — i18n keys, all 7 languages

**Files:**
- Modify: `i18n/resources.ts` (7 occurrences of the `rechargeHistory`/`orderHistory` block)

- [ ] **Step 1: English (around line 784)**

Find:
```ts
        rechargeHistory: "Recharge History",
      },
      orderHistory: {
        title: "Recharge History",
        empty: "You haven't made any recharges yet.",
        statusPaid: "Paid",
        statusPending: "Pending",
        statusFailed: "Failed",
        statusCancelled: "Cancelled",
      },
```
Replace with:
```ts
        paymentHistory: "Payment History",
      },
      paymentHistory: {
        title: "Payment History",
        empty: "No transactions yet.",
        statusPaid: "Paid",
        statusPending: "Pending",
        statusFailed: "Failed",
        statusCancelled: "Cancelled",
        chat: "AI Chat",
        vastuReport: "Vastu Report",
        gemstoneUnlock: "Gemstone Report",
        profileCreation: "Additional Profile Created",
        houseUnlock: "House {{houseNumber}} Insight Unlock",
        refund: "Refund",
        balanceLabel: "Balance: {{balance}}",
      },
```

- [ ] **Step 2: Hindi (around line 1456)**

Find:
```ts
        rechargeHistory: "रिचार्ज इतिहास",
      },
      orderHistory: {
        title: "रिचार्ज इतिहास",
        empty: "आपने अभी तक कोई रिचार्ज नहीं किया है।",
        statusPaid: "भुगतान हो गया",
        statusPending: "लंबित",
        statusFailed: "विफल",
        statusCancelled: "रद्द",
      },
```
Replace with:
```ts
        paymentHistory: "भुगतान इतिहास",
      },
      paymentHistory: {
        title: "भुगतान इतिहास",
        empty: "अभी तक कोई लेनदेन नहीं हुआ है।",
        statusPaid: "भुगतान हो गया",
        statusPending: "लंबित",
        statusFailed: "विफल",
        statusCancelled: "रद्द",
        chat: "AI चैट",
        vastuReport: "वास्तु रिपोर्ट",
        gemstoneUnlock: "रत्न रिपोर्ट",
        profileCreation: "अतिरिक्त प्रोफ़ाइल बनाई गई",
        houseUnlock: "हाउस {{houseNumber}} इनसाइट अनलॉक",
        refund: "रिफंड",
        balanceLabel: "बैलेंस: {{balance}}",
      },
```

- [ ] **Step 3: Bengali (around line 2222)**

Find:
```ts
        rechargeHistory: "রিচার্জ ইতিহাস",
      },
      orderHistory: {
        title: "রিচার্জ ইতিহাস",
        empty: "আপনি এখনও কোনো রিচার্জ করেননি।",
        statusPaid: "পরিশোধিত",
        statusPending: "মুলতুবি",
        statusFailed: "ব্যর্থ",
        statusCancelled: "বাতিল",
      },
```
Replace with:
```ts
        paymentHistory: "পেমেন্ট ইতিহাস",
      },
      paymentHistory: {
        title: "পেমেন্ট ইতিহাস",
        empty: "এখনও কোনো লেনদেন হয়নি।",
        statusPaid: "পরিশোধিত",
        statusPending: "মুলতুবি",
        statusFailed: "ব্যর্থ",
        statusCancelled: "বাতিল",
        chat: "AI চ্যাট",
        vastuReport: "বাস্তু রিপোর্ট",
        gemstoneUnlock: "রত্ন রিপোর্ট",
        profileCreation: "অতিরিক্ত প্রোফাইল তৈরি হয়েছে",
        houseUnlock: "হাউস {{houseNumber}} ইনসাইট আনলক",
        refund: "রিফান্ড",
        balanceLabel: "ব্যালেন্স: {{balance}}",
      },
```

- [ ] **Step 4: Marathi (around line 2988)**

Find:
```ts
        rechargeHistory: "रिचार्ज इतिहास",
      },
      orderHistory: {
        title: "रिचार्ज इतिहास",
        empty: "तुम्ही अजून कोणताही रिचार्ज केलेला नाही.",
        statusPaid: "पैसे भरले",
        statusPending: "प्रलंबित",
        statusFailed: "अयशस्वी",
        statusCancelled: "रद्द केले",
      },
```
Replace with:
```ts
        paymentHistory: "पेमेंट इतिहास",
      },
      paymentHistory: {
        title: "पेमेंट इतिहास",
        empty: "अजून कोणताही व्यवहार झालेला नाही.",
        statusPaid: "पैसे भरले",
        statusPending: "प्रलंबित",
        statusFailed: "अयशस्वी",
        statusCancelled: "रद्द केले",
        chat: "AI चॅट",
        vastuReport: "वास्तू अहवाल",
        gemstoneUnlock: "रत्न अहवाल",
        profileCreation: "अतिरिक्त प्रोफाइल तयार केली",
        houseUnlock: "हाऊस {{houseNumber}} इनसाइट अनलॉक",
        refund: "परतावा",
        balanceLabel: "शिल्लक: {{balance}}",
      },
```

- [ ] **Step 5: Telugu (around line 3750)**

Find:
```ts
        rechargeHistory: "రీఛార్జ్ చరిత్ర",
      },
      orderHistory: {
        title: "రీఛార్జ్ చరిత్ర",
        empty: "మీరు ఇంకా ఏ రీఛార్జ్ చేయలేదు.",
        statusPaid: "చెల్లించారు",
        statusPending: "పెండింగ్‌లో ఉంది",
        statusFailed: "విఫలమైంది",
        statusCancelled: "రద్దు చేయబడింది",
      },
```
Replace with:
```ts
        paymentHistory: "చెల్లింపు చరిత్ర",
      },
      paymentHistory: {
        title: "చెల్లింపు చరిత్ర",
        empty: "ఇంకా ఎలాంటి లావాదేవీలు లేవు.",
        statusPaid: "చెల్లించారు",
        statusPending: "పెండింగ్‌లో ఉంది",
        statusFailed: "విఫలమైంది",
        statusCancelled: "రద్దు చేయబడింది",
        chat: "AI చాట్",
        vastuReport: "వాస్తు నివేదిక",
        gemstoneUnlock: "రత్న నివేదిక",
        profileCreation: "అదనపు ప్రొఫైల్ సృష్టించబడింది",
        houseUnlock: "హౌస్ {{houseNumber}} ఇన్‌సైట్ అన్‌లాక్",
        refund: "వాపసు",
        balanceLabel: "బ్యాలెన్స్: {{balance}}",
      },
```

- [ ] **Step 6: Tamil (around line 4516)**

Find:
```ts
        rechargeHistory: "ரீசார்ஜ் வரலாறு",
      },
      orderHistory: {
        title: "ரீசார்ஜ் வரலாறு",
        empty: "நீங்கள் இதுவரை எந்த ரீசார்ஜும் செய்யவில்லை.",
        statusPaid: "செலுத்தப்பட்டது",
        statusPending: "நிலுவையில்",
        statusFailed: "தோல்வியடைந்தது",
        statusCancelled: "ரத்து செய்யப்பட்டது",
      },
```
Replace with:
```ts
        paymentHistory: "கட்டண வரலாறு",
      },
      paymentHistory: {
        title: "கட்டண வரலாறு",
        empty: "இதுவரை எந்த பரிவர்த்தனையும் இல்லை.",
        statusPaid: "செலுத்தப்பட்டது",
        statusPending: "நிலுவையில்",
        statusFailed: "தோல்வியடைந்தது",
        statusCancelled: "ரத்து செய்யப்பட்டது",
        chat: "AI அரட்டை",
        vastuReport: "வாஸ்து அறிக்கை",
        gemstoneUnlock: "மணி அறிக்கை",
        profileCreation: "கூடுதல் சுயவிவரம் உருவாக்கப்பட்டது",
        houseUnlock: "வீடு {{houseNumber}} இன்சைட் அன்லாக்",
        refund: "பணத்திரும்பம்",
        balanceLabel: "இருப்பு: {{balance}}",
      },
```

- [ ] **Step 7: Gujarati (around line 5278)**

Find:
```ts
        rechargeHistory: "રિચાર્જ ઇતિહાસ",
      },
      orderHistory: {
        title: "રિચાર્જ ઇતિહાસ",
        empty: "તમે હજુ સુધી કોઈ રિચાર્જ કર્યું નથી.",
        statusPaid: "ચૂકવેલ",
        statusPending: "બાકી",
        statusFailed: "નિષ્ફળ",
        statusCancelled: "રદ કરેલ",
      },
```
Replace with:
```ts
        paymentHistory: "ચુકવણી ઇતિહાસ",
      },
      paymentHistory: {
        title: "ચુકવણી ઇતિહાસ",
        empty: "હજુ સુધી કોઈ વ્યવહાર થયો નથી.",
        statusPaid: "ચૂકવેલ",
        statusPending: "બાકી",
        statusFailed: "નિષ્ફળ",
        statusCancelled: "રદ કરેલ",
        chat: "AI ચેટ",
        vastuReport: "વાસ્તુ રિપોર્ટ",
        gemstoneUnlock: "રત્ન રિપોર્ટ",
        profileCreation: "વધારાની પ્રોફાઇલ બનાવવામાં આવી",
        houseUnlock: "હાઉસ {{houseNumber}} ઇનસાઇટ અનલોક",
        refund: "રિફંડ",
        balanceLabel: "બેલેન્સ: {{balance}}",
      },
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean — no remaining references to `settings.rechargeHistory`, `orderHistory.*`, `api.orderHistory`, or the old `Order`-only shape.

- [ ] **Step 9: Commit**

```bash
git add i18n/resources.ts
git commit -m "feat(billing): add payment history i18n keys, all 7 languages"
```

---

## Task 20: Verify end-to-end and ship

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 2: Manual verification (dev server)**

Run: `npm run dev`, sign in, spend credits on at least one of: AI chat, Vastu report, Gemstone unlock, House unlock, creating an additional profile (this requires the backend from Task 15 already deployed or run locally against it). Navigate to Settings → Payment History and confirm:
- The screen title reads "Payment History"
- Each spend appears with its correct icon/label and a red `-₹N`
- Any recharge still appears with its ₹ amount and status pill
- The balance line under each spend row is correct

- [ ] **Step 3: Commit is already done per-task — push and deploy**

```bash
git push origin main
```
Vercel deploys automatically on push to `main` (per existing project convention) — confirm the deployment succeeds in the Vercel dashboard and re-check the live site's Settings → Payment History screen once it's live.

---

## Out of scope (per design doc)

Do not attempt: backfilling historical spend activity, pagination beyond `limit = 50`, or any change to `orders`/existing recharge flows.
