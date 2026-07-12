# Purchase Plan: "Your Analysis is Ready" Notification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a purchase-plan analysis finishes (status transitions from `processing` → `done`), send the requesting user a targeted FCM push notification telling them their Vedic timing analysis is ready. Tapping the notification deep-links them to the result screen.

**Architecture:** A new `notifyPurchasePlanReady` helper — modelled exactly on `pushDailyHoroscopeReady` in `horoscope.service.ts` — is inserted into the existing `processAnalysis` background task in `purchase-plan.service.ts`, called immediately after `markDone`. It looks up the user's active tokens via `findActiveTokensForUser` and fires `sendPushBatch` with a short, punchy copy block. No new routes, no DB migrations, no cron jobs.

**Tech Stack:** TypeScript, Hono/Zod-OpenAPI, Firebase Admin SDK (FCM).

**Related files:**
- `backend/src/modules/purchase-plan/purchase-plan.service.ts`
- `backend/src/lib/notifications/fcm.ts`
- `backend/src/modules/device-tokens/device-tokens.repo.ts`
- `backend/src/modules/horoscope/horoscope.service.ts` (pattern reference)

---

## Task 1: Add `notifyPurchasePlanReady` to `purchase-plan.service.ts`

**Files:**
- Modify: `backend/src/modules/purchase-plan/purchase-plan.service.ts`

The `processAnalysis` function already calls `markDone(planId, analysis)` once the LLM response is successfully stored. We add a fire-and-forget push call directly after that, following the identical safety pattern used by `pushDailyHoroscopeReady`:
- Never `await` it in a way that can kill the main flow.
- Wrapped in its own `try/catch` so any FCM failure stays silent to the analysis job.
- Only fires on `done` — no notification on `error`.

The helper needs `userId` (already available at call site) so it can call `findActiveTokensForUser(userId)`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/purchase-plan-notify.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── mocks ──────────────────────────────────────────────────────────────────
vi.mock('../src/modules/device-tokens/device-tokens.repo.js', () => ({
  findActiveTokensForUser: vi.fn(),
}));
vi.mock('../src/lib/notifications/fcm.js', () => ({
  sendPushBatch: vi.fn(),
}));
vi.mock('../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { findActiveTokensForUser } from '../src/modules/device-tokens/device-tokens.repo.js';
import { sendPushBatch } from '../src/lib/notifications/fcm.js';
import { notifyPurchasePlanReady } from '../src/modules/purchase-plan/purchase-plan.service.js';

const mockTokens = [{ token: 'tok-abc' }, { token: 'tok-def' }];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findActiveTokensForUser).mockResolvedValue(mockTokens as any);
  vi.mocked(sendPushBatch).mockResolvedValue({ success: 2, failure: 0 });
});

describe('notifyPurchasePlanReady', () => {
  it('sends a push to all active tokens for the user', async () => {
    await notifyPurchasePlanReady('user-123', 'vehicle');

    expect(findActiveTokensForUser).toHaveBeenCalledWith('user-123');
    expect(sendPushBatch).toHaveBeenCalledWith(
      ['tok-abc', 'tok-def'],
      expect.any(String),
      expect.any(String),
      { type: 'purchase_plan_ready', navigate: '/panchang' },
    );
  });

  it('sends nothing when the user has no active tokens', async () => {
    vi.mocked(findActiveTokensForUser).mockResolvedValue([]);
    await notifyPurchasePlanReady('user-123', 'home');
    expect(sendPushBatch).not.toHaveBeenCalled();
  });

  it('does not throw when sendPushBatch rejects', async () => {
    vi.mocked(sendPushBatch).mockRejectedValue(new Error('FCM down'));
    await expect(notifyPurchasePlanReady('user-123', 'commercial')).resolves.toBeUndefined();
  });

  it('does not throw when findActiveTokensForUser rejects', async () => {
    vi.mocked(findActiveTokensForUser).mockRejectedValue(new Error('DB down'));
    await expect(notifyPurchasePlanReady('user-123', 'other')).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run test/purchase-plan-notify.spec.ts`

Expected: FAIL — `notifyPurchasePlanReady` is not exported from `purchase-plan.service.ts`.

- [ ] **Step 3: Implement `notifyPurchasePlanReady` and wire it into `processAnalysis`**

In `backend/src/modules/purchase-plan/purchase-plan.service.ts`:

**3a — Add imports** (after the existing imports block):

```ts
import { findActiveTokensForUser } from '../device-tokens/device-tokens.repo.js';
import { sendPushBatch } from '../../lib/notifications/fcm.js';
```

**3b — Add the `CATEGORY_LABELS` map** (after the `DAILY_PLAN_LIMIT` constant):

```ts
const CATEGORY_LABELS: Record<'vehicle' | 'home' | 'commercial' | 'other', string> = {
  vehicle: 'vehicle',
  home: 'home',
  commercial: 'property',
  other: 'purchase',
};
```

**3c — Add the `notifyPurchasePlanReady` export** (just above `requestPurchasePlanAnalysis`):

```ts
/**
 * Best-effort push notification once a purchase-plan analysis is done.
 * Follows the same fire-and-forget, never-throws contract as
 * `pushDailyHoroscopeReady` in horoscope.service.ts.
 * Exported so it can be unit-tested in isolation.
 */
export async function notifyPurchasePlanReady(
  userId: string,
  category: 'vehicle' | 'home' | 'commercial' | 'other',
): Promise<void> {
  try {
    const tokens = await findActiveTokensForUser(userId);
    if (tokens.length === 0) return;
    const label = CATEGORY_LABELS[category];
    await sendPushBatch(
      tokens.map((t) => t.token),
      '🔮 Your Vedic timing analysis is ready',
      `Your auspicious ${label} purchase timing report is waiting — tap to read it now.`,
      { type: 'purchase_plan_ready', navigate: '/panchang' },
    );
    logger.info({ userId, category }, 'purchase-plan:push sent');
  } catch (err) {
    logger.warn({ err, userId }, 'purchase-plan:push failed');
  }
}
```

> **Copy rationale:** The title is short and punchy (fits one line on a lock-screen). The body names the exact category so the user immediately knows which analysis finished. The `data` payload uses `navigate: '/panchang'` — the Panchang page hosts the purchase-plan feature — and `type: 'purchase_plan_ready'` for future client-side deep-link routing.

**3d — Wire into `processAnalysis`**: thread `userId` as a first arg and call `notifyPurchasePlanReady` immediately after `markDone`:

```diff
-async function processAnalysis(
-  planId: string,
-  input: {
+async function processAnalysis(
+  planId: string,
+  userId: string,
+  input: {
```

Inside `processAnalysis`, after `await markDone(planId, analysis);`:

```ts
    void notifyPurchasePlanReady(userId, input.category).catch(() => {/* already logged */});
```

Update the single call site in `requestPurchasePlanAnalysis`:

```diff
-  void processAnalysis(row.id, {
+  void processAnalysis(row.id, userId, {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run test/purchase-plan-notify.spec.ts`

Expected: PASS — all 4 cases green.

- [ ] **Step 5: TypeScript typecheck**

Run: `cd backend && npx tsc --noEmit`

Expected: no new errors.

---

## Task 2: Verify end-to-end manually (dev environment)

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run dev
```

- [ ] **Step 2: Submit a purchase plan analysis via curl**

```bash
curl -X POST http://localhost:3000/purchase-plan/analyze \
  -H "Authorization: Bearer <YOUR_DEV_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"category":"vehicle","bookingDate":"2026-07-20","language":"en"}'
```

Note the returned `planId`.

- [ ] **Step 3: Poll until done**

```bash
curl http://localhost:3000/purchase-plan/<planId> \
  -H "Authorization: Bearer <YOUR_DEV_JWT>"
```

Wait for `"status":"done"`.

- [ ] **Step 4: Confirm push in logs**

In the backend console, look for:

```
purchase-plan:push sent  { userId: "...", category: "vehicle" }
```

Or, if the test device has no token registered, the function returns silently with no log line (tokensFound: 0 early-return path).

---

## Notes

- **No DB migration** — this is pure in-process logic; we read existing `device_push_tokens` rows.
- **Error isolation** — `processAnalysis` try/catch only calls `markError`. `notifyPurchasePlanReady` fires *after* `markDone` succeeds, outside that catch, so an FCM failure can never flip the plan back to `error`.
- **Token scope** — `findActiveTokensForUser` (not `getAllActiveTokens`) is intentional: we only ping the user whose plan just finished, not every user.
- **Navigate target** — `/panchang` is where the purchase-plan UI lives (confirmed by file structure). If the client-side router needs the `planId` in the data payload for direct deep-linking, add `planId` to the `data` object: `{ type: 'purchase_plan_ready', navigate: '/panchang', planId }`.
- **Idempotency** — the background task is fire-and-forget (pm2 single-instance), so double-firing is not a risk in the current architecture.
