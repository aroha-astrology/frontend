# Backend Auth + Profile Integration — Design

**Date:** 2026-06-21
**Backend:** Aroha Astrology Backend v0.1.0 — `http://13.232.179.137:3000` (Swagger at `/docs`)
**App:** `C:/dev/aroha-astrology/frontend` (Next.js, branch `feature/frontend-3d-nasa`)

## Goal

Replace the fully-mocked phone-OTP auth and onboarding with a real integration:
Firebase phone authentication → exchange the Firebase ID token for an app user via
the backend → persist the onboarding profile via `PATCH /v1/me`.

## Backend contract (from `/openapi.json`)

Auth is a Firebase ID token sent as `Authorization: Bearer <token>`.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/healthz` | public liveness |
| GET | `/readyz` | public readiness (db check) |
| POST | `/v1/auth/session` | idempotent; 201 = new user, 200 = existing. Returns `{ user, created }` |
| GET | `/v1/me` | current user |
| PATCH | `/v1/me` | `UpdateMeBody`, `additionalProperties:false` |
| DELETE | `/v1/me` | soft delete (204) |

`UpdateMeBody` fields: `displayName` (1–120), `gender` (male/female/other/null),
`dateOfBirth` (`YYYY-MM-DD`), `timeOfBirth` (`HH:mm` / `HH:mm:ss`),
`placeOfBirth` (`{ name, lat, lon, tz }`, all required when present, nullable).

## Architecture

New units, each with one purpose:

- `lib/firebase.ts` — initialise Firebase app + `auth` from `NEXT_PUBLIC_FIREBASE_*` env.
- `lib/api.ts` — typed backend client. Reads `NEXT_PUBLIC_API_BASE_URL`. Attaches the
  Firebase ID token to authed calls. Normalises the `{error:{code,message}}` envelope
  into a thrown `ApiError`. Exports `createSession`, `getMe`, `updateMe`, `deleteMe`,
  plus `health`/`ready`.
- `lib/geocode.ts` — resolve a free-text place to `{ name, lat, lon, tz }` via the
  Open-Meteo geocoding API (free, no key). Returns `null` when no match.
- `providers/auth-provider.tsx` — subscribes to `onAuthStateChanged`, calls
  `createSession()` on login, exposes `{ user, firebaseUser, loading, signOut, refresh }`.

## Flows

**Sign-in / Sign-up:** phone step → `signInWithPhoneNumber(auth, "+91"+number, recaptcha)`
(invisible reCAPTCHA in a hidden div). OTP step → `confirmationResult.confirm(code)`.
On success the auth provider runs `createSession`; `created === true` routes to
`/onboarding`, otherwise `/`.

**Onboarding confirm:** map answers → `UpdateMeBody`:
`displayName ← name`, `gender ← key (already male/female/other)`,
`timeOfBirth ← tob (HH:MM)`, `dateOfBirth ← DD/MM/YYYY → YYYY-MM-DD`,
`placeOfBirth ← geocode(place)`. `language`, `timeSource`, `status` are not in the
backend schema → kept local only. If geocoding finds nothing, block submit with an
i18n error and ask for a more specific place.

## Error handling

- Phone auth: invalid number, wrong/expired code, too-many-requests → i18n messages.
- API: network failure and non-2xx envelope → `ApiError` surfaced as i18n message.
- Geocode: no match → `onboarding.placeNotFound`.

All new user-facing strings get `t()` keys in all 7 languages (en, hi, bn, mr, te, ta, gu).

## Testing

- Live (no auth needed now): `/healthz`, `/readyz`, and 401 on `/v1/me` without a token.
- `next build` / typecheck must pass.
- End-to-end OTP with a Firebase **test phone number** (no real SMS): session → me PATCH
  → me GET round-trip. Requires real `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`.

## Out of scope

Real place autocomplete UI, account-deletion UI, profile-edit screens, language/
timeSource/status persistence (backend has no fields for them yet).
