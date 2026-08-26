# UTM source attribution in admin panel

## Problem

No visibility into which direct app-domain link (push notification, WhatsApp/Telegram broadcast, QR code, support link) brought a user in. The backend already has an unused `users.referral_source` column and a fully wired `PATCH /v1/me` write-path for it — nothing has ever populated it.

Out of scope: blog/ad traffic funneled through the Play Store. The mobile app is a WebView shell with no native install-referrer wiring, so a `?utm_source=` on a landing-page/Play-Store link is lost at the install hop. That traffic stays PostHog-only (aggregate). This feature only covers links that point directly at `app.arohaastrology.in`.

## Design

Mirrors the existing `?ref=CODE` capture mechanism exactly.

1. **Capture** — `ReferralCapture` (mounted once at the app root, before any redirect can strip the query string) also reads `utm_source`/`utm_campaign` off the URL and stashes them in `localStorage` as `"<source>/<campaign>"` (or just `"<source>"` if no campaign).
2. **Apply** — onboarding submit reads the stashed value and sends it as `referralSource` in the `PATCH /v1/me` body, then clears it — same lifecycle as `referredByCode`.
3. **Surface** — `GET /v1/admin/users` starts selecting `referralSource`; the admin Users table gets a "Source" column.

## Changes

- `frontend/lib/referral.ts` — add `capturePendingUtmSource` / `getPendingUtmSource` / `clearPendingUtmSource`, same shape as the existing referral-code trio.
- `frontend/components/ReferralCapture.tsx` — call the new capture function.
- `frontend/app/onboarding/page.tsx` — set `body.referralSource` from it; clear it after a successful submit alongside `clearPendingReferralCode()`.
- `jyotish-backend/src/modules/users/users.repo.ts` — add `referralSource: users.referralSource` to `listUsersPage`'s select.
- `jyotish-backend/src/modules/admin/admin.schemas.ts` — add `referralSource: z.string().nullable()` to `AdminUserRowSchema`.
- `frontend/lib/admin-api.ts` — add `referralSource: string | null` to `AdminUserRow`.
- `frontend/app/admin/users/page.tsx` — render the new column.

No migration needed — the column and its `PATCH /v1/me` write-path already exist and are already in the allowed-update-fields list.

## Testing

Extend whatever existing test covers `capturePendingReferralCode` and `listUsersPage`, if one exists, with the new capture function / column. No new test infrastructure.
