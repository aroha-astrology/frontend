# Festival Gift Campaigns (Admin Panel)

## Problem

The only mechanism today for gifting wallet credit is `CLAIM_CAMPAIGNS`, a
hardcoded array in `backend/src/config/campaigns.ts` (see
`ClaimCampaignDef`). Standing up a campaign — Independence Day, the ₹100
top-up bonus — means a developer adds an array entry, adds a matching
`referral.*` amount key in `features.ts`, and on the frontend authors a
whole new presentational component (`components/TopUpBonusPrompt.tsx` is
the current live one) hardcoding `campaignKey`/`istDate`/`maxBalancePaise`
as literal constants, then mounts it in `app/layout.tsx`. Every festival
needs a backend deploy *and* a frontend deploy. There is no way for an
admin to create, target, schedule, or send a gift campaign without
engineering involvement, and no way to change an amount or audience after
the fact without redeploying.

Two capabilities don't exist at all today:

- **Auto-credit delivery.** Every existing campaign is claim-only — the
  user must open the app and tap a button. `claimCampaignBonus` (the
  lock-row/credit/ledger-insert primitive in `users.repo.ts`) is only ever
  invoked from the user-initiated claim route.
- **Expiring credit.** `wallet_balance_paise` is one flat number with no
  expiry metadata. Nothing sweeps or claws back unused promotional credit.

This ships an admin-managed, DB-backed campaign system that reuses the
existing credit/ledger/notification primitives instead of replacing them,
and generalizes the one hardcoded frontend modal into a data-driven one so
that adding a festival is a form submission, not a deploy.

## Design

### 1. Schema (`jyotish-backend`, new migration)

New table `gift_campaigns`:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `key` | text, unique | auto-derived slug (slugified title + send date, e.g. `diwali_2026_2026-11-08`); becomes `wallet_transactions.reason` verbatim — no colons (existing `admin.repo.ts` `split_part(reason, ':', 1)` constraint, see `test/claim-campaigns.test.ts`) |
| `title` | text | display name, e.g. "Diwali 2026" or a custom occasion |
| `amount_paise` | integer | |
| `audience_max_balance_paise` | integer, nullable | null = every user |
| `delivery_mode` | text enum `self_claim` \| `auto_credit` | |
| `claim_window_days` | integer, nullable | self-claim only |
| `credit_expiry_days` | integer, nullable | null = never expires; either delivery mode |
| `scheduled_send_at` | timestamptz, nullable | set + status=`scheduled` → cron fires it when due |
| `status` | text enum `draft` \| `scheduled` \| `sent` \| `canceled` | |
| `valid_from` / `valid_until` | timestamptz, nullable | stamped at send time — `valid_from = sentAt`, `valid_until = sentAt + claim_window_days` — and is what the claim route actually checks; `claim_window_days` itself is just the input used to compute it |
| `sent_at` | timestamptz, nullable | |
| `created_by`, `created_at`, `updated_at` | | |

`wallet_transactions` gains two nullable columns: `expires_at`,
`expired_at`. Set on the granting row when a campaign has
`credit_expiry_days`; `expired_at` is stamped by the sweep once processed
(idempotency guard against double-clawback, same shape as the existing
`prior` claim check in `claimCampaignBonus`).

**Expiry is an approximation, deliberately.** The wallet is one fungible
number — there is no FIFO record of which rupees were spent. The sweep
claws back `LEAST(delta, current wallet_balance_paise)`: it never takes
more than the user currently has, but it can't prove the *specific* gifted
rupees are what's left. This matches how every promotional-credit system
on a single-balance wallet works in practice. `ponytail: no per-rupee
spend-ordering; upgrade to a real sub-ledger if a precise "did they spend
the gift or their own money" audit is ever required.`

### 2. Backend primitives (reuse, minimally extended)

- `claimCampaignBonus(userId, campaignKey, amountPaise)` gains an optional
  `expiresAt` param, threaded into the `wallet_transactions` insert.
  Everything else about it (row lock, idempotency via
  `reason == campaignKey`, balance update) is unchanged.
- `findClaimCampaign` becomes async: checks `gift_campaigns` (status=`sent`,
  delivery_mode=`self_claim`, now between `valid_from`/`valid_until`) first,
  falls back to the existing static `CLAIM_CAMPAIGNS` array. The static
  array is left as-is — it's the historical record for Independence Day and
  the two top-up runs, not migrated.
- `notifyUser` / `notifyUsersBatch` (`lib/notifications/notify-user.ts`)
  used unchanged for both delivery modes — self-claim gets "come claim
  your gift", auto-credit gets "you've received ₹X".
- Bulk auto-credit iterates eligible users through `claimCampaignBonus`
  under `p-limit` (same concurrency pattern as the horoscope batch job in
  `horoscope.service.ts`) — at current scale (~124 active users) this is
  comfortably fast without needing a queue.

### 3. Audience resolution

Shared by the admin preview endpoint and the actual send:

```
users where anonymizedAt IS NULL
  and (audience_max_balance_paise IS NULL OR wallet_balance_paise < audience_max_balance_paise)
  and not (signed up same IST day as send — same guard useClaimCampaign already applies)
```

Preview returns both the eligible count and the pushable count (active
`device_push_tokens` join) separately, and the total cost
(`eligible_count * amount_paise`) — this is the dry-run the prior top-up
campaign's own postmortem called out as necessary before committing to
copy or a send (audiences on this app are routinely single-digit-to-low-
hundreds, not the scale the "broadcast" framing implies).

### 4. Admin routes (`requireAdmin`, matches `referrals`/`features` pattern)

- `GET /v1/admin/gift-campaigns` — list, newest first
- `POST /v1/admin/gift-campaigns` — create (`draft`, or `scheduled` if
  `scheduledSendAt` given)
- `PATCH /v1/admin/gift-campaigns/:id` — edit; 409 once status is `sent`
- `DELETE /v1/admin/gift-campaigns/:id` — cancel; 409 once `sent`
- `POST /v1/admin/gift-campaigns/:id/preview` — dry-run count/cost
- `POST /v1/admin/gift-campaigns/:id/send` — immediate manual send

### 5. Scheduling (cron)

One new endpoint, `POST /cron/festival-campaigns`, following the exact
house pattern (`requireCronSecret`, machine-to-machine, registered in
`cron.routes.ts`) — one new OS crontab line on the box, once daily. It runs
two independent sweeps in sequence (same "single combined action" call as
`saturn-phases`, since neither sweep is expensive or LLM-drafted enough to
need phase isolation):

1. Any `gift_campaigns` row with `status = scheduled` and
   `scheduled_send_at <= now()` → send.
2. Any `wallet_transactions` row with `expires_at <= now()` and
   `expired_at IS NULL` → claw back.

### 6. Frontend: one generic modal replaces the hardcoded pattern

`GET /v1/me` gains one computed field, `activeClaimableCampaign` — null,
or `{ key, title, amountPaise, validUntil }` for whichever self-claim
campaign (DB or legacy static) is currently live *and* eligible for this
user (same eligibility gates `useClaimCampaign` already checks
client-side, computed server-side here since there's no longer a fixed key
to check against).

`components/TopUpBonusPrompt.tsx` is replaced by a single
`FestivalGiftModal.tsx` that reads `activeClaimableCampaign` instead of
taking campaign config as hardcoded props, and calls the same
`claim-bonus/{key}` route. Same visual treatment (gift icon, gold gradient
card, dismiss/claim buttons) — only the copy source changes. New i18n keys
under `festivalGift.*` (7 languages) replace the campaign-specific
`topUpBonus.*` keys; `{amount}` and `{title}` interpolate into the copy.
Festival titles are shown as their common transliterated form in every
locale (i.e. "Diwali" stays "Diwali") — no per-festival, per-language copy
authoring.

Auto-credit campaigns need no frontend change at all — the money is just
there next time `/v1/me` is fetched; the push is the only signal.

### 7. Admin UI

New tab `/admin/gift-campaigns`, added to `SECTIONS` in `app/admin/layout.tsx`,
same plain-table style as every other admin page (hardcoded English, no
i18n — matches the documented `/admin` exception).

List view: one row per campaign — title, status badge, schedule/sent time,
amount + audience + delivery-mode summary line, eligible/pushable count
(live preview call), and status-appropriate actions (`Preview` + `Schedule`
+ `Send Now` + `Delete` while `draft`; `Cancel` while `scheduled`; read-only
once `sent`).

Create form: festival dropdown (seeded list below) or a custom title →
amount (₹) → "only wallets under ₹___, blank = everyone" → delivery-mode
toggle → claim-window-days (self-claim) or expiry-days toggle (either
mode, optional) → `Send Now` or `Schedule for` a date/time picker (IST).

### 8. Seed festival list

Pre-authored as festival-dropdown options (not database rows — the
dropdown just pre-fills title/suggested date, the admin still picks
amount/audience/mode/timing per send). Dates verified via web search
2026-08-20, not memory — Hindu/Islamic dates are lunar and can still move
±1 day on final panchang/moon-sighting confirmation:

| Date | Festival | Tradition |
|---|---|---|
| 2026-08-25/26 | Eid Milad-un-Nabi | Muslim |
| 2026-08-28 | Raksha Bandhan | Hindu |
| 2026-09-04 | Janmashtami | Hindu |
| 2026-09-14 | Ganesh Chaturthi | Hindu |
| 2026-10-02 | Gandhi Jayanti | National |
| 2026-10-11 | Navratri begins | Hindu |
| 2026-10-20 | Dussehra | Hindu |
| 2026-10-29 | Karva Chauth | Hindu |
| 2026-11-08 | Diwali (flagship send) | Hindu |
| 2026-11-11 | Bhai Dooj | Hindu |
| 2026-11-24 | Guru Nanak Gurpurab | Punjabi/Sikh |
| 2026-12-24/25 | Christmas Eve / Day | Christian |
| 2027-01-01 | New Year | Christian/general |
| 2027-01-13/14 | Lohri / Makar Sankranti (Maghi) | Punjabi/Hindu |
| 2027-01-26 | Republic Day | National |
| 2027-02-09 | Ramadan begins | Muslim |
| 2027-03-10 (approx) | Eid-ul-Fitr | Muslim |

### 9. Out of scope

- Per-language custom copy per festival.
- Targeting beyond a wallet-balance ceiling (no locale/activity/cohort
  targeting).
- Precise FIFO spend-ordering for expiry — see the clamp approximation in
  §1.
- Migrating the 3 existing static `CLAIM_CAMPAIGNS` entries into the new
  table.
