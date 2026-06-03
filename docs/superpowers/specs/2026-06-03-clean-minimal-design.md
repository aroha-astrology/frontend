# Clean Minimal Frontend — Design Spec
**Date:** 2026-06-03  
**Branch:** `clean/minimal` off `dev`  
**Status:** Approved

---

## Goal

Strip the frontend down to a minimal working slice: phone OTP auth, onboarding, and a post-onboarding home screen. All 88 app pages, backend API calls, AI libs, 3D, payments, and unused packages are removed. Firebase + Supabase remain as the sole data layer.

---

## Branch Strategy

- Create `clean/minimal` off `dev` (not off `main`)
- `dev` remains untouched as fallback
- All deletions happen on `clean/minimal`

---

## File Structure (what survives)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Phone OTP — returning users
│   │   └── signup/page.tsx         # Phone OTP — new users
│   ├── onboarding/page.tsx         # Birth details collection
│   ├── home/page.tsx               # NEW — "Hello [first name]"
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Stripped root layout
│   └── globals.css
├── components/
│   ├── auth/PhoneOTPForm           # Phone number + OTP input component
│   └── ui/                         # Base UI: button, input, card
├── lib/
│   ├── firebase/                   # client.ts, admin.ts, phone-auth.ts
│   └── supabase/                   # client.ts, server.ts, middleware.ts
├── store/useStore.ts               # Stripped: user + loading state only
└── middleware.ts                   # Simplified — 4 routes only
```

Everything else is deleted:
- All `(app)/` pages (88 pages)
- `/admin`, `/pandit`, `/astrologer` portals
- `src/lib/ai/`, `insights/`, `credits/`, `palm/`, `predictions/`, `horoscope/`, `life-journey/`, `queue/`, `payments.ts`, `apollo.ts`, `telegram.ts`, `apiClient.ts`
- `src/components/3d/`, `charts/`, `dashboard/`, `layout/` (navbar/sidenav/footer)

---

## User Flow

```
/ (landing)
  └─ CTA button → /signup or /login

/signup  (new users)
  └─ Phone number → Firebase sends OTP
  └─ User enters OTP → Firebase ID token
  └─ Exchange token → Supabase session
  └─ Redirect → /onboarding

/login  (returning users)
  └─ Same OTP flow
  └─ Has birth_profile in Supabase → /home
  └─ No birth_profile → /onboarding

/onboarding
  └─ Collect: first name, date of birth, time of birth, place of birth
  └─ Write to Supabase `birth_profiles` table directly (no backend API)
  └─ On submit → /home

/home
  └─ Read first name from Supabase birth_profiles
  └─ Render: "Hello [first name]"
```

---

## Auth Architecture

- **Firebase**: Phone OTP only. Capacitor-aware (web reCAPTCHA + native plugin). Keep existing `phone-auth.ts` logic.
- **Supabase**: Session management via SSR cookies. Direct client-side queries for `birth_profiles` read/write.
- **No backend API**: Zero calls to `NEXT_PUBLIC_API_URL`. All data goes directly through Supabase client.

---

## Middleware (simplified)

```
Public routes (no auth check):
  /
  /login
  /signup
  /auth/callback

Auth-required routes:
  /onboarding  → unauthenticated → redirect /login
  /home        → unauthenticated → redirect /login

Logged-in redirects (already authenticated user visits auth pages):
  /login  → redirect /home
  /signup → redirect /home
  Note: post-OTP routing (onboarding vs home) is handled inside the page
        by checking whether a birth_profile row exists for the user.
```

---

## Zustand Store (stripped)

```ts
{
  user: SupabaseUser | null
  loading: boolean
  setUser: (user) => void
  setLoading: (loading) => void
}
```

Remove: profiles, charts, credits, avatarUrl, dataReady, theme, language, chartStyle, reduceMotion, activeChartId, all setters for removed fields.

---

## `/home` Page

- Protected route (auth required)
- On mount: fetch `birth_profiles` row for current user, read `first_name` column
- Render: `Hello {firstName}`
- No layout chrome (no navbar/sidenav) — bare page for now, user will add design later

---

## Package Changes

**Remove:**
```
three
@react-three/fiber
@react-three/drei
razorpay
framer-motion
@tanstack/react-query
@vercel/analytics
@vercel/speed-insights
@playwright/test
```

**Keep:**
```
next, react, react-dom
firebase
@supabase/supabase-js, @supabase/ssr
@capacitor/* (devDeps — native bridge)
tailwindcss, tailwind-merge, clsx
lucide-react
sonner
zustand
zod
vitest
class-variance-authority
```

---

## Out of Scope

- New Firebase / Supabase config values — user will provide
- Backend API design — user will share new endpoints later
- Any styling beyond functional UI
- Any feature beyond OTP + onboarding + home greeting
