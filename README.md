# aroha-astrology/frontend

The authenticated web app for Aroha Astrology — `app.arohaastrology.in`.

Next.js 15 + React 19 + Tailwind 4. **Has no `/api/*` routes** — every backend call goes through `src/lib/apiClient.ts` and lands at `NEXT_PUBLIC_API_URL` (the backend repo's Vercel project).

Routes:
- `/dashboard` and everything under `(app)/*` — the authenticated experience
- `(auth)/login`, `(auth)/signup` — sign-in flow (Supabase + Firebase phone OTP)
- Legal pages (`/privacy`, `/terms`, etc.)
- Root `/` redirects to `/dashboard`

Marketing landing page lives in the `aroha-astrology/landing` repo.

## Calling the backend

```ts
import { apiJson } from '@/lib/apiClient';

const kundli = await apiJson<KundliResult>('/api/kundli/generate', {
  method: 'POST',
  body: { birthDate, birthTime, lat, lon },
});
```

Never use `fetch('/api/...')` directly — that 404s in production because there are no `/api` routes in this repo.

## Branches

- `main` — production. PR + 1 approval required.
- `staging` — preview. PR required.
- `develop` — active dev.

## Local dev

```bash
pnpm install
cp .env.example .env.local       # fill NEXT_PUBLIC_SUPABASE_URL/ANON_KEY + NEXT_PUBLIC_API_URL
pnpm dev                          # frontend on :3000; run backend repo on :3001
```

## Origin

Split off from the `Wookiee17/jyotish-ai` monorepo on 2026-05-24.
