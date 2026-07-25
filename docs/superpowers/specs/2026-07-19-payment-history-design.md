# Payment History (replaces Recharge History)

## Problem

`app/settings/history/page.tsx` (added in `a704ed8`) shows only recharge
attempts: it calls `GET /v1/billing/orders`, which reads the Postgres
`orders` table (`jyotish-backend/src/modules/billing/billing.repo.ts`) —
credit-pack purchases only, with ₹ amount and gateway status. The user wants
this renamed to "Payment History" and expanded to show every credit
transaction: recharges *and* spends (AI chat, Vastu report, Gemstone report,
House Insight unlock).

Today, none of the spend paths record anything queryable — each is a bare
atomic decrement (guarded UPDATE) with no row written anywhere:

- `deductWalletBalance(userId, amountPaise)` (`users.repo.ts`) — shared by
  three features, each refunding via the sibling `addWalletBalance` if the
  paid-for work then fails:
  - chat (`astro.routes.ts`, `CHAT_MESSAGE_COST_PAISE = 2000`)
  - Vastu report (`vastu.service.ts`, `VASTU_COST_PAISE = 5000`)
  - creating an additional profile (`profiles.service.ts`,
    `PROFILE_CREATION_COST_PAISE = 20000`)
- `unlockHouseForUser(userId, houseNumber)` (`users.repo.ts`,
  `HOUSE_UNLOCK_COST_PAISE = 5000`) — primary-profile house unlock
- `unlockGemstoneForUser(userId)` (`users.repo.ts`,
  `GEMSTONE_UNLOCK_COST_PAISE = 10000`) — primary-profile gemstone unlock
- `unlockHouseForOwnedProfile(id, ownerUserId, houseNumber)` and
  `unlockGemstoneForOwnedProfile(id, ownerUserId)`
  (`birth-profiles.repo.ts`) — the same two unlocks, for an *additional*
  (non-primary) profile the user owns; each already wraps its two-table
  update in a `db.transaction`

There is, however, a `wallet_transactions` table (renamed from
`credit_transactions`) already shaped like a general-purpose ledger —
`userId`, `delta`, `reason`, `balanceAfter`, `createdAt` — but the only
place that ever inserts into it today is the recharge-confirmation path in
`billing.repo.ts`. It's the right table for this; it's just never been
written to on the spend side.

Refunds matter here too: if a charge is silently reversed (e.g. an LLM
generation fails after the chat/Vastu charge already went through) but only
the charge is logged, payment history would show a permanent debit for
money the user was actually given back — actively misleading. Both sides
get logged.

Because no spend has ever been logged, there is no way to reconstruct
accurate history for activity that already happened. Per product decision,
this ships **forward-only**: payment history reflects everything from
deploy day onward; nothing before that is backfilled or approximated.

## Design

### 1. Ledger writes on every spend and refund (`jyotish-backend`)

No schema migration — `wallet_transactions` already exists with the right
columns, and all four cost constants are already named (`*_COST_PAISE`), so
no constant-naming cleanup is needed either. Add an insert at every charge
*and* refund call site, in the same DB transaction as the balance change
(so ledger and balance can never drift apart even under a crash
mid-operation):

| Function | Call site | `reason` written |
|---|---|---|
| `deductWalletBalance` | chat charge (`astro.routes.ts`) | `chat_message` |
| `addWalletBalance` | chat refund (`astro.routes.ts`, ×2) | `refund:chat_message` |
| `deductWalletBalance` | Vastu charge (`vastu.service.ts`) | `vastu_report` |
| `addWalletBalance` | Vastu refund (`vastu.service.ts`, ×2) | `refund:vastu_report` |
| `deductWalletBalance` | profile-creation charge (`profiles.service.ts`) | `profile_creation` |
| `addWalletBalance` | profile-creation refund (`profiles.service.ts`) | `refund:profile_creation` |
| `unlockHouseForUser` | primary-profile house unlock (`users.repo.ts`) | `house_unlock:<houseNumber>` |
| `unlockGemstoneForUser` | primary-profile gemstone unlock (`users.repo.ts`) | `gemstone_unlock` |
| `unlockHouseForOwnedProfile` | additional-profile house unlock (`birth-profiles.repo.ts`) | `house_unlock:<houseNumber>:profile:<profileId>` |
| `unlockGemstoneForOwnedProfile` | additional-profile gemstone unlock (`birth-profiles.repo.ts`) | `gemstone_unlock:profile:<profileId>` |

`deductWalletBalance`/`addWalletBalance` are shared across three features,
so both gain a required `reason` parameter; every call site (astro.routes.ts,
vastu.service.ts, profiles.service.ts — 7 call sites total) passes its own
literal. Both functions currently do a single raw `db.execute(sql...)`; each
becomes a `db.transaction` wrapping that same UPDATE plus a
`wallet_transactions` insert using the balance the UPDATE's `RETURNING`
already gives back.

`unlockHouseForUser`/`unlockGemstoneForUser` similarly move from a bare
`db.execute` to a `db.transaction` with the ledger insert added.
`unlockHouseForOwnedProfile`/`unlockGemstoneForOwnedProfile` already use
`db.transaction` (two guarded updates across `users` and `birth_profiles`)
— the ledger insert is a third statement added to that existing
transaction, after the `users` update succeeds, using its returned
`walletBalancePaise`. The owned-profile reason strings carry the profile id
for audit purposes even though the UI (per the "distinct per feature, not
per feature per profile" decision) shows the same "House Insight Unlock" /
"Gemstone Report" label regardless of which profile it was for.

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
      .where(and(eq(walletTransactions.userId, userId), not(like(walletTransactions.reason, 'purchase:%'))))
      .orderBy(desc(walletTransactions.createdAt)).limit(limit),
  ]);
  // map each to a common Transaction shape, merge, sort by createdAt desc, slice(0, limit)
}
```

`ledgerRows` excludes `purchase:*`-reason rows specifically — **not**
`delta < 0` — because a refund row has a *positive* delta (money going
back) but still needs to show up here; only recharge-grant rows (also
positive delta, reason `purchase:<packId>`) are already covered by the
`orders` rows and would double-count if included.

Reason string → transaction kind (backend-side, so the client never
pattern-matches raw reason strings). A leading `refund:` is stripped and
noted separately — the UI shows one generic "Refund" kind regardless of
what was refunded, since refunds are rare and the amount/sign already make
their meaning clear:

```ts
function parseReason(reason: string): { kind: TransactionKind; houseNumber?: number; isRefund: boolean } {
  const isRefund = reason.startsWith('refund:');
  const base = isRefund ? reason.slice(7) : reason;
  if (base === 'chat_message') return { kind: 'chat', isRefund };
  if (base === 'vastu_report') return { kind: 'vastu_report', isRefund };
  if (base === 'profile_creation') return { kind: 'profile_creation', isRefund };
  if (base === 'gemstone_unlock' || base.startsWith('gemstone_unlock:profile:')) {
    return { kind: 'gemstone_unlock', isRefund };
  }
  const houseMatch = base.match(/^house_unlock:(\d+)(?::profile:.+)?$/);
  if (houseMatch) return { kind: 'house_unlock', houseNumber: Number(houseMatch[1]), isRefund };
  throw new Error(`unrecognized wallet_transactions reason: ${reason}`);
}
```

Response shape (discriminated union on `kind`; `isRefund` flags any
reversed charge regardless of kind):

```ts
type Transaction =
  | { id: string; kind: 'recharge'; createdAt: string; amountPaise: number; status: OrderStatus }
  | { id: string; kind: 'chat' | 'vastu_report' | 'gemstone_unlock' | 'profile_creation'; createdAt: string; amountPaise: number; balanceAfterPaise: number; isRefund: boolean }
  | { id: string; kind: 'house_unlock'; createdAt: string; amountPaise: number; balanceAfterPaise: number; houseNumber: number; isRefund: boolean };
```

`amountPaise` for spend/refund rows is the ledger row's `|delta|` (always a
positive magnitude; `kind`/`isRefund` convey direction) — same unit and same
`formatRupees()` helper the rest of the app already uses for every other
wallet-paise amount (`WalletBalance.tsx`, `HouseUnlockDrawer.tsx`, etc.).
Nothing in the product UI ever shows a "credits" unit to the user despite
the backend's internal naming — this screen doesn't invent one either.

Route: rename `GET /v1/billing/orders` → `GET /v1/billing/transactions`,
returning `{ transactions: Transaction[] }`. Nothing else in the codebase
calls the old route, so it's renamed in place rather than kept alongside a
new one.

### 3. Frontend (`frontend` repo)

- `lib/api.ts`: `Order` type + `orderHistory()` → `Transaction` union +
  `transactionHistory()`, hitting the renamed endpoint.
- `app/settings/history/page.tsx`: renders the merged list. Recharge rows
  keep today's look (₹ amount, status pill). Spend rows get a per-kind icon
  and label ("AI Chat", "Vastu Report", "Gemstone Report", "Additional
  Profile", "House {{n}} Insight Unlock"), `-{formatRupees(amountPaise)}` in
  the same red/muted style as other spend indicators in the app, and a small
  secondary "Balance: {formatRupees(balanceAfterPaise)}" line (already
  returned by the API, cheap to surface). A row with `isRefund: true`
  renders with a "Refund" label and `+{formatRupees(amountPaise)}` instead.
- `app/settings/page.tsx`: link label switches from `settings.rechargeHistory`
  to `settings.paymentHistory`.
- `i18n/resources.ts`, all 7 languages (en, hi, bn, mr, te, ta, gu):
  - `settings.rechargeHistory` → `settings.paymentHistory`
  - `orderHistory.*` namespace → `paymentHistory.*` (title, empty state
    reworded to "No transactions yet" instead of recharge-specific copy,
    existing status labels carried over unchanged)
  - new keys: `paymentHistory.chat`, `paymentHistory.vastuReport`,
    `paymentHistory.gemstoneUnlock`, `paymentHistory.profileCreation`,
    `paymentHistory.houseUnlock` (interpolated with `{{houseNumber}}`),
    `paymentHistory.refund`, `paymentHistory.balanceLabel`

### 4. Testing

- Backend: unit tests for `parseReason` (every reason shape including the
  `:profile:<id>` and `refund:` variants, plus the unrecognized-reason
  throw), for `findTransactionsForUser` (merge order, the `delta < 0`
  filter, the `limit` cap across both sources), and for each of the ten
  charge/refund call sites in the table above asserting a
  `wallet_transactions` row now appears with the right `reason`/`delta`
  alongside the existing balance-decrement assertions.
- Existing tests that mock `deductWalletBalance`/`addWalletBalance` wholesale
  (`test/vastu-service-profile.spec.ts`, `test/profiles.spec.ts`) assert
  `toHaveBeenCalledWith(userId, amountPaise)` today — these need a third
  `reason` argument added to those assertions once the callers pass one, or
  they'll fail on the signature change alone (not a real regression, just
  the mock call shape moving).
- Frontend: existing patterns for this screen (loading/empty/list states)
  extended to cover a mixed list with a recharge row, each spend kind, and
  a refund row all rendering their correct label/amount/sign.

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
