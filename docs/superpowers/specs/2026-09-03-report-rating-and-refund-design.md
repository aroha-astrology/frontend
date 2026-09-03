# Report rating + low-rating refund

## Problem

Once a user finishes reading a generated report, we have no signal on whether it was any good, and no per-report feedback loop — the existing `FeedbackSheet`/`FeedbackPrompt` system is a once-ever, app-wide rating that explicitly avoids interrupting the report page. We want a per-report rating, prompted at a moment that reflects real engagement (they scrolled through it), and a way for a bad reading to self-correct financially.

## Trigger (client, `app/reports/[id]/page.tsx`)

- A scroll listener on the report page counts distinct scroll gestures once `state === "ready"`. At 2-3 scrolls the report becomes **armed** — but only if this report hasn't already been rated (tracked client-side via `localStorage`, same idiom as `FEEDBACK_SEEN_KEY`; this is a UX nicety only, not the abuse guard — see Data model).
- **Going back while armed** opens the rating modal instead of navigating:
  - Hardware/gesture back → intercepted via the existing `useDismissOnBackPress(armed, openModal)` hook (`providers/back-handler-provider.tsx`), the same mechanism every other dismissible overlay in the app already uses.
  - On-screen back arrow (`IconButton` in `ReportDetailPage`) → its `onClick` checks `armed` first and opens the modal instead of calling `router.back()` directly.
- Submitting or dismissing the modal then performs the real `router.back()`.
- Not armed (still generating, already rated, or under the scroll threshold) → back behaves exactly as today, no interception.

## Rating modal

New `ReportRatingSheet` component: a `BottomSheetModal` with a 1-5 star picker and an optional comment textarea — a slimmed-down `FeedbackSheet` (no mood faces, no reward copy, since this is a repeatable per-report action, distinct from the one-time app rating). Posts to the new endpoint below; on success (or on submit failure) closes and lets the pending back-navigation proceed.

## Data model — new `report_ratings` table

```
id             uuid PK
user_id        uuid FK -> users.id, cascade
report_id      uuid FK -> reports.id, cascade
rating         integer 1-5, not null
comment        text, nullable, encrypted at rest (same convention as user_feedback.comment)
refunded_paise integer, nullable — set when this rating triggered a refund
created_at     timestamptz, default now()

unique (user_id, report_id)
index on report_id
```

A new table rather than reusing `user_feedback`: that table is a once-ever app-wide rating with its own reward/`hasGivenFeedback()` semantics — mixing per-report ratings into it would corrupt both. The `unique(user_id, report_id)` constraint is the **real** guard against rating (and refunding) the same report twice — the localStorage flag above is only there to stop the modal from re-arming, never trusted for correctness.

## API — `POST /v1/reports/:id/rating`

- `requireUser`; body `{ rating: 1-5, comment?: string }`.
- Loads the report by `id`, 404 if missing, 403 if it doesn't belong to the caller, 409 if `status !== 'ready'`.
- Inserts the `report_ratings` row; a duplicate (unique violation) returns 409 — a report can only be rated once.
- If `rating < 3`: immediately credits `reports.pricePaidPaise` (100%) to the user's wallet via the existing `addWalletBalance(userId, amountPaise, reason)` primitive, reusing the **exact same reason format** the objective-failure refund path already uses — `` refund:${reasonForRow(reportKey, periodMonth)} `` (`reports.service.ts`). Reusing this exact string means Payment History's existing `isRefund`/`parseReason` logic renders it correctly with zero frontend changes, and it stays consistent with every other report refund in the ledger. Then stamps `refunded_paise` on the new row in the same DB transaction as the insert.
- Returns `{ id, refundedPaise }`.

## Admin panel — `/admin/report-ratings`

New tab, same shape as the existing `/admin/report-generations` page (`app/admin/report-generations/page.tsx` + its `admin.repo`/`admin.service`/`admin.routes` trio): a table of every rating — user, report key, stars, comment, refunded amount (or "—"), date — newest first, filterable by report key. Read-only; no admin actions needed since the refund already happened automatically. Backed by `GET /v1/admin/report-ratings`, mirroring `getReportGenerations`'s pagination shape (`{ ratings, total, offset, limit }`).

## Accepted risk

Refunds are fully automatic (explicit choice, not a default): nothing stops a user from rating every report they buy below 3 stars and getting each one free while keeping the content — there's no cap on refunds across different reports for one user. The admin table gives visibility to spot a repeat offender by eye; no automated rate-limit is being built now. Revisit if it turns out to be exploited in practice.

## Out of scope

- No changes to the existing app-wide `FeedbackSheet`/`user_feedback` flow.
- No reward/credit for leaving a rating (that already exists, separately, for the one-time app rating).
- No admin approval step for the refund (explicitly rejected in favor of automatic).
- No rate-limiting or fraud detection on refund frequency.
