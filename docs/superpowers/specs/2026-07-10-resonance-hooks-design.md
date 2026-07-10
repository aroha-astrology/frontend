# Resonance hooks: House Details + Kundli-page Dasha Chapter

## Problem

Two surfaces show astrological facts as flat, textbook-style labels with no
personalized interpretation, so users don't feel the app is "about them":

1. **House Details** (`components/ui/HouseDetails.tsx`, on `/kundli`) — each
   house shows only a generic keyword line (e.g. "Self — body, personality,
   appearance, vitality") regardless of which planets actually sit there.
2. **Kundli page's "Current Chapter" card** (`app/kundli/page.tsx`) — shows
   raw Mahadasha/Antardasha/end-date only, no interpretation.

The horoscope page's equivalent surfaces (`CategoryRatingRow.tsx`,
`DashaChapterCard.tsx`) already solve this with a `hook` line, so this spec
only closes the gap on the Kundli page and extends the existing pattern to
also be locale-aware.

## Non-goals

- No changes to horoscope category ratings — already shipped.
- No LLM calls — both new hooks are deterministic templates, matching the
  precedent already set by `backend/src/lib/astro-tools/dasha-reading.ts`
  (chosen there for zero latency/cost and no jargon-slip risk).

## Design

### 1. Kundli-page dasha hook (backend-sourced, reuses existing function)

- `buildDashaReading()` in `backend/src/lib/astro-tools/dasha-reading.ts`
  gains a `locale` parameter (default `'en'`). `MAHADASHA_THEME` (9 entries)
  and `ANTARDASHA_NUANCE` (9 entries) become locale-keyed:
  `Record<Locale, Record<Planet, {...}>>` for `en/hi/bn/mr/te/ta/gu`.
- `backend/src/modules/horoscope/horoscope.service.ts`'s existing call site
  passes `user.contentLanguage` (previously ignored — this feature has been
  silently English-only in every locale until now).
- `GET /v1/kundli` (`kundli.routes.ts` / `kundli.service.ts`) additionally
  calls `buildDashaReading(kundliRow.dashaData, undefined, user.contentLanguage)`
  and adds the result as a new, additive `dashaReading` field on the response
  (`kundli.schemas.ts`). The existing raw `dasha` field is untouched.
- `app/kundli/page.tsx`'s "Current Chapter" card renders
  `dashaReading.hook` / `dashaReading.meaning` beneath the existing Main
  Period / Sub-Period / "runs until" lines (existing lines stay, per
  approved design).

### 2. House Details hook (new, frontend-only)

- New `lib/houseHook.ts`: pure function `getHouseHook(house, t)` where
  `house` is the existing `{ house, sign, lord, planets[] }` shape already
  passed into `HouseDetails.tsx` — no backend change needed, this data is
  already in hand client-side.
- Composition formula (mirrors the Mahadasha+Antardasha composition
  already used for dasha):
  - Occupied house: `"{PLANET_EXPRESSION[planet]} shows up here — {HOUSE_MEANINGS[house].short} matters more than usual: {first 2 keywords}."`
    - Multiple planets in one house: use the **first** planet in the array
      as the sole voice. No blending — keeps sentences simple, avoids a
      combinatorial explosion of dual-planet phrasing.
  - Empty house: same formula, keyed on `lord` instead of an occupant
    planet, framed as "quietly shapes" (matches the previously-approved
    preview copy).
- `PLANET_EXPRESSION` (9 entries) is new i18n content.
- `HOUSE_MEANINGS` (currently a hardcoded-English `const` inside
  `HouseDetails.tsx`) moves into `i18n/resources.ts`. This is a required
  companion fix, not scope creep: leaving it hardcoded would put a
  translated hook sentence directly beneath an English-only keyword line
  in every non-English locale.
- `HouseDetails.tsx` renders the new hook line beneath the existing keyword
  line (existing line stays, per approved design).

### 3. i18n

All new template content (`PLANET_EXPRESSION`, migrated `HOUSE_MEANINGS`,
and the backend's `MAHADASHA_THEME`/`ANTARDASHA_NUANCE`) ships in all 7
languages (`en/hi/bn/mr/te/ta/gu`) from day one, per explicit instruction —
this is a deliberate departure from the existing dasha-reading precedent
(which is English-only today) rather than an oversight.

## Data flow

```
Kundli fetch (GET /v1/kundli)
  -> kundli.service.ts builds response incl. new dashaReading (via buildDashaReading(dashaData, locale))
  -> app/kundli/page.tsx renders dashaReading.hook/.meaning in Current Chapter card
  -> HouseDetails.tsx receives houses[] (unchanged) and calls getHouseHook()
     client-side per house, no extra fetch
```

## Testing

- Unit tests (backend, vitest): `buildDashaReading()` locale switching
  (en vs. at least one other language returns different, non-empty text);
  existing English-default behavior unchanged.
- Unit tests (frontend): `getHouseHook()` covering (a) single occupant,
  (b) multiple occupants (first-planet rule), (c) empty house (lord
  fallback), across at least 2 locales.
- Manual verification: run the app, view `/kundli` House Details and
  Current Chapter card in at least English + one other locale.

## Rollout

Implemented on `dev` in both repos, then propagated to `staging` and
`main`/production per the usual flow (backend deploy is a manual
SSH+pm2 restart; frontend deploys via Vercel on push to `main`).
