# Payment History (replaces Recharge History)

## Problem

`app/settings/history/page.tsx` (added in `a704ed8`) shows only recharge
attempts: it calls `GET /v1/billing/orders`, which reads the Postgres
`orders` table (`jyotish-backend/src/modules/billing/billing.repo.ts`) —
credit-pack purchases only, with ₹ amount and gateway status. The user wants
this renamed to "Payment History" and expanded to show every credit
transaction: recharges *and* spends (AI chat, Vastu report, Gemstone report,
House Insight unlock).

Today, none of the four spend paths record anything queryable. Each is a
bare atomic decrement with no row written anywhere:

- `deductCredits`/`deductWalletBalance(userId, amount)` — used by both chat
  (`astro.routes.ts`, `CHAT_MESSAGE_COST = 2`) and Vastu
  (`vastu.service.ts`, `VASTU_CREDIT_COST = 5`)
- `unlockHouseForUser(userId, houseNumber)` — `users.repo.ts`, cost `5`
  hardcoded
- `unlockGemstoneForUser(userId)` — `users.repo.ts`,
  `GEMSTONE_UNLOCK_COST = 10`

There is, however, a `wallet_transactions` table (renamed from
`credit_transactions`) already shaped like a general-purpose ledger —
`userId`, `delta`, `reason`, `balanceAfter`, `createdAt` — but the only
place that ever inserts into it today is the recharge-confirmation path in
`billing.repo.ts`. It's the right table for this; it's just never been
written to on the spend side.

Because no spend has ever been logged, there is no way to reconstruct
accurate history for activity that already happened. Per product decision,
this ships **forward-only**: payment history reflects everything from
deploy day onward; nothing before that is backfilled or approximated.

## Design

### 1. Ledger writes on every spend (`jyotish-backend`)

No schema migration — `wallet_transactions` already exists with the right
columns. Add an insert at each of the four spend call sites, in the same DB
transaction as the balance decrement (so ledger and balance can never drift
apart even under a crash mid-operation):

| Call site | `reason` written |
|---|---|
| `deductCredits`/`deductWalletBalance` called for chat | `chat_message` |
| same helper, called for Vastu | `vastu_report` |
| `unlockHouseForUser` | `house_unlock:<houseNumber>` |
| `unlockGemstoneForUser` | `gemstone_unlock` |

`deductCredits`/`deductWalletBalance` is shared by two features, so its
signature gains a required `reason` parameter; both call sites (chat,
Vastu) pass their own literal. `unlockHouseForUser`'s hardcoded `5` becomes
a named `HOUSE_UNLOCK_COST` constant, matching the pattern the other three
costs already use (touched code, not a drive-by refactor).

Recharge grants keep writing to `wallet_transactions` exactly as they do
today (`reason: purchase:<packId>`, positive `delta`) — no change there.

### 2. Unified read (`jyotish-backend`)

Recharge display needs ₹ amount + gateway status, which only `orders` has.
Spend display needs credits + running balance, which only
`wallet_transactions` has. Rather than force one table to answer both, the
new repo function reads both and merges:

```ts
async function findTransactionsForUser(userId: string, limit = 50) {
  const [orderRows, ledgerRows] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt)).limit(limit),
    db.select().from(walletTransactions)
      .where(and(eq(walletTransactions.userId, userId), lt(walletTransactions.delta, 0)))
      .orderBy(desc(walletTransactions.createdAt)).limit(limit),
  ]);
  // map each to a common Transaction shape, merge, sort by createdAt desc, slice(0, limit)
}
```

`ledgerRows` is filtered to `delta < 0` specifically so recharge ledger
rows (positive delta) aren't double-counted alongside the `orders` rows
that already represent them.

Reason string → transaction kind (backend-side, so the client never
pattern-matches raw reason strings):

```ts
function parseReason(reason: string): { kind: TransactionKind; houseNumber?: number } {
  if (reason === 'chat_message') return { kind: 'chat' };
  if (reason === 'vastu_report') return { kind: 'vastu_report' };
  if (reason === 'gemstone_unlock') return { kind: 'gemstone_unlock' };
  if (reason.startsWith('house_unlock:')) return { kind: 'house_unlock', houseNumber: Number(reason.slice(13)) };
  throw new Error(`unrecognized wallet_transactions reason: ${reason}`);
}
```

Response shape (discriminated union on `kind`):

```ts
type Transaction =
  | { id: string; kind: 'recharge'; createdAt: string; amountPaise: number; status: OrderStatus }
  | { id: string; kind: 'chat' | 'vastu_report' | 'gemstone_unlock'; createdAt: string; credits: number; balanceAfter: number }
  | { id: string; kind: 'house_unlock'; createdAt: string; credits: number; balanceAfter: number; houseNumber: number };
```

Route: rename `GET /v1/billing/orders` → `GET /v1/billing/transactions`,
returning `{ transactions: Transaction[] }`. Nothing else in the codebase
calls the old route, so it's renamed in place rather than kept alongside a
new one.

### 3. Frontend (`frontend` repo)

- `lib/api.ts`: `Order` type + `orderHistory()` → `Transaction` union +
  `transactionHistory()`, hitting the renamed endpoint.
- `app/settings/history/page.tsx`: renders the merged list. Recharge rows
  keep today's look (₹ amount, status pill). Spend rows get a per-kind icon
  and label ("AI Chat", "Vastu Report", "Gemstone Report", "House {{n}}
  Insight Unlock"), `-N credits` in place of a ₹ amount, and a small
  secondary "Balance: N" line using `balanceAfter` (already returned by the
  API, cheap to surface).
- `app/settings/page.tsx`: link label switches from `settings.rechargeHistory`
  to `settings.paymentHistory`.
- `i18n/resources.ts`, all 7 languages (en, hi, bn, mr, te, ta, gu):
  - `settings.rechargeHistory` → `settings.paymentHistory`
  - `orderHistory.*` namespace → `paymentHistory.*` (title, empty state
    reworded to "No transactions yet" instead of recharge-specific copy,
    existing status labels carried over unchanged)
  - new keys: `paymentHistory.chat`, `paymentHistory.vastuReport`,
    `paymentHistory.gemstoneUnlock`, `paymentHistory.houseUnlock` (the last
    interpolated with `{{houseNumber}}`), `paymentHistory.balanceLabel`

### 4. Testing

- Backend: unit tests for `parseReason` (all four reason shapes + the
  unrecognized-reason throw), for `findTransactionsForUser` (merge order,
  the `delta < 0` filter, the `limit` cap across both sources), and for each
  of the four call sites asserting a `wallet_transactions` row now appears
  with the right `reason`/`delta` alongside the existing balance-decrement
  assertions.
- Frontend: existing patterns for this screen (loading/empty/list states)
  extended to cover a mixed list with both a recharge row and each spend
  kind rendering its correct label/amount.

### 5. Rollout

Backend local checkout (`jyotish-backend`, `C:\dev\aroha-astrology\jyotish-backend`)
is 26 commits behind `origin/main` and carries someone else's uncommitted,
unrelated WIP (a `credits` → `wallet_balance` rename that duplicates work
already merged upstream). Work happens on a fresh branch cut from
`origin/main`, not on top of that local state, and the existing uncommitted
changes are left untouched (not stashed away or discarded).

Frontend work happens in the current checkout (already on `main`, already
matches `origin/main` plus unpushed local commits, already contains the
recharge-history commit being replaced).

Per user instruction, once implemented and locally verified this is pushed
and deployed the same way recent features have shipped: backend via the
existing manual SSH/tar-to-EC2 process, frontend via Vercel.

### Out of scope

- Backfilling historical spend activity (explicitly declined — see
  Problem).
- Pagination beyond the existing `limit = 50` (matches current recharge
  history behavior; not changed here).
- Any change to how `orders` or existing recharge flows work.
