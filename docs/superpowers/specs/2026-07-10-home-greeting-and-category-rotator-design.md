# Home dashboard: greeting header + category-hook rotator

## Problem

Two gaps on the home dashboard (`app/page.tsx`):
1. It opens with a large centered "AROHA" logo/wordmark (`Hero.tsx`) instead
   of a personalized greeting — no name, no time-of-day context, and
   nowhere on the home page shows the user's credit balance even though
   credits are now a real, spendable resource (kundli house unlocks).
2. `TodayReading.tsx` (the "Daily Insights" card) shows only the Overall
   category's hook/advice. The other four category readings
   (Health/Career/Marriage/Finance/Education) are already fetched
   (`data.structured.categories`, LLM-generated `hook` per category) but
   never surfaced here.

## Design

### 1. `components/GreetingHeader.tsx` (new)

Replaces `<Hero />` at the top of `app/page.tsx`. Renders:
- A placeholder avatar circle (no `photoURL` field exists on `User` yet,
  so a generic silhouette icon, matching the reference).
- `Namaste {firstName},` / time-of-day line, where `firstName` is
  `user.displayName?.split(' ')[0]` (falls back to a generic greeting
  when the name isn't set yet). Time-of-day bucket computed from
  `new Date().getHours()`: <12 morning, <17 afternoon, <21 evening,
  else night — via new i18n keys `home.greeting.morning/afternoon/evening/night`.
- A credits pill (coin icon + `user.credits`), tappable, linking to
  `/payment` (the buy-credits flow already in progress) — the only
  place on the home page that will show the balance.

`Hero.tsx` becomes unused after this swap (only consumer is
`app/page.tsx`) and is removed, consistent with the HouseDetails/
KundliInsights cleanup earlier this session.

### 2. `components/home/CategoryHookRotator.tsx` (new)

Takes `categories: Record<Category, CategoryReading>` (the same type
`TodayReading.tsx` already has from `usePersonalizedHoroscope`). Renders
one category at a time — icon (reusing `CATEGORY_ICON` from
`components/horoscope/CategoryRatingRow.tsx`) + translated label
(`t('horoscope.category.<key>')`, already exists) + that category's
`.hook` string, no new LLM call needed.

- Cycles through the four non-`overall` categories in a fixed order
  (health, career, marriage, finance, education).
- `setInterval` advances every 2000ms; unmount clears it.
- Tapping the row calls the same "advance" function immediately and
  resets the interval (clearInterval + setInterval) so a manual tap
  doesn't fight the next auto-tick.
- Crossfade between categories via `framer-motion`'s `AnimatePresence`
  (`mode="wait"`), matching the transition style already used elsewhere
  in this file.

Mounted inside `TodayReading.tsx`'s existing card, below the current
advice paragraph and above the "Details" button row.

## Non-goals

- No new backend/API work — both features read data already fetched
  client-side (`useAuth()`'s `user`, `usePersonalizedHoroscope`'s
  `categories`). No EC2 deploy needed for this change.
- No avatar upload/photo feature — placeholder icon only.

## Testing

- Manual verification in the running app: home page shows the greeting
  header instead of the logo hero, with a plausible first name and
  correct time-of-day bucket; Daily Insights card rotates through 4
  categories every 2s and advances immediately on tap.
- `npx tsc --noEmit` clean; `next build` clean.
