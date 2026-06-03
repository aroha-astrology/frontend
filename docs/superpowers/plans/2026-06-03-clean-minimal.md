# Clean Minimal Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the `dev` branch to a new `clean/minimal` branch containing only phone OTP auth, onboarding, and a "Hello [first name]" home page — all other pages, backend API calls, 3D, AI, and unused packages removed.

**Architecture:** New branch off `dev`. Mass-delete 88+ pages and unused libs, rewrite AuthProvider/store to be minimal, create a local `/api/auth/phone-signin` Next.js route for Firebase→Supabase token exchange, and add a `/home` page that reads `first_name` from Supabase `birth_profiles`.

**Tech Stack:** Next.js 15, React 19, Firebase 12 (phone OTP), Supabase SSR, Tailwind 4, Zustand, Zod, Sonner, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Keep + modify | `src/app/(auth)/login/page.tsx` | Remove framer-motion, fix redirect to `/home`, check birth_profiles |
| Keep + modify | `src/app/(auth)/signup/page.tsx` | Remove framer-motion, remove referral/credits copy, fix redirect |
| Keep + rewrite | `src/app/onboarding/page.tsx` | Collect name/DOB/TOB/place, write to Supabase directly, redirect `/home` |
| Create | `src/app/home/page.tsx` | Read `first_name` from `birth_profiles`, render "Hello [name]" |
| Keep | `src/app/page.tsx` | Landing page — no changes |
| Modify | `src/app/layout.tsx` | Remove QueryProvider, TranslationProvider, Analytics, SpeedInsights, SwRegister, SmartAppBanner, JsonLd, GlobalErrorListener |
| Create | `src/app/api/auth/phone-signin/route.ts` | Local Next.js route: verify Firebase ID token → Supabase session |
| Rewrite | `src/middleware.ts` | 4 public routes, 2 protected, redirect logged-in away from auth pages |
| Rewrite | `src/store/useStore.ts` | Strip to: `user`, `loading`, `setUser`, `setLoading` |
| Rewrite | `src/components/providers/AuthProvider.tsx` | Remove API calls, react-query, legal gate, notification prompt — just auth state |
| Delete | `src/app/(app)/` | All 88 protected app pages |
| Delete | `src/app/admin/` | Admin portal |
| Delete | `src/app/pandit/` | Pandit portal |
| Delete | `src/app/astrologer/` | Astrologer portal |
| Delete | `src/lib/ai/`, `insights/`, `credits/`, `palm/`, `predictions/`, `horoscope/`, `life-journey/`, `queue/` | Feature libs |
| Delete | `src/lib/payments.ts`, `apollo.ts`, `telegram.ts`, `apiClient.ts`, `queryKeys.ts`, `legal.ts`, `seo/` | Unused lib files |
| Delete | `src/components/3d/`, `charts/`, `dashboard/`, `layout/` | Heavy components |
| Delete | `src/components/providers/QueryProvider.tsx`, `TranslationProvider.tsx` | Removed providers |
| Delete | `src/components/GlobalErrorListener.tsx`, `SwRegister.tsx`, `SmartAppBanner.tsx`, `seo/`, `legal/`, `notifications/` | Removed feature components |
| Modify | `package.json` | Remove: three, @react-three/*, razorpay, framer-motion, @tanstack/react-query, @vercel/analytics, @vercel/speed-insights, @playwright/test, recharts, @aroha-astrology/astro-engine, @aroha-astrology/shared |
| Modify | `next.config.ts` | Remove serverExternalPackages `@react-pdf/renderer`, remove workspace aliases that no longer apply |

---

## Task 1: Create the branch

**Files:** git only

- [ ] **Step 1: Checkout dev and create clean/minimal**

```bash
cd C:\dev\aroha-astrology\frontend
git checkout dev
git checkout -b clean/minimal
```

Expected: `Switched to a new branch 'clean/minimal'`

- [ ] **Step 2: Verify you are on the right branch**

```bash
git branch
```

Expected: `* clean/minimal` is starred.

---

## Task 2: Delete app portal pages (mass delete)

**Files:** `src/app/(app)/`, `src/app/admin/`, `src/app/pandit/`, `src/app/astrologer/`

- [ ] **Step 1: Delete all protected app pages**

```bash
cd C:\dev\aroha-astrology\frontend
Remove-Item -Recurse -Force src\app\(app)
Remove-Item -Recurse -Force src\app\admin
Remove-Item -Recurse -Force src\app\pandit
Remove-Item -Recurse -Force src\app\astrologer
```

- [ ] **Step 2: Verify remaining app directory**

```bash
Get-ChildItem src\app -Name
```

Expected output contains only: `(auth)`, `onboarding`, `page.tsx`, `layout.tsx`, `globals.css`, `api` (if present), `auth` (callback folder).

Also delete the auth callback if it has backend dependencies:
```bash
Get-ChildItem src\app\auth -ErrorAction SilentlyContinue
```

If `src\app\auth\callback\page.tsx` exists and has no dependencies on deleted files, keep it. Otherwise delete it:
```bash
# Only run if callback page calls deleted APIs:
# Remove-Item -Recurse -Force src\app\auth
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete 88 app pages and admin/pandit/astrologer portals"
```

---

## Task 3: Delete feature lib directories

**Files:** `src/lib/ai/`, `src/lib/insights/`, `src/lib/credits/`, `src/lib/palm/`, `src/lib/predictions/`, `src/lib/horoscope/`, `src/lib/life-journey/`, `src/lib/queue/`, `src/lib/payments.ts`, `src/lib/apollo.ts`, `src/lib/telegram.ts`, `src/lib/apiClient.ts`, `src/lib/queryKeys.ts`, `src/lib/legal.ts`, `src/lib/seo/`

- [ ] **Step 1: Delete lib feature directories**

```bash
cd C:\dev\aroha-astrology\frontend
$dirsToRemove = @('src\lib\ai','src\lib\insights','src\lib\credits','src\lib\palm','src\lib\predictions','src\lib\horoscope','src\lib\life-journey','src\lib\queue','src\lib\seo')
foreach ($d in $dirsToRemove) {
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
}
```

- [ ] **Step 2: Delete individual lib files**

```bash
$filesToRemove = @('src\lib\payments.ts','src\lib\apollo.ts','src\lib\telegram.ts','src\lib\apiClient.ts','src\lib\queryKeys.ts','src\lib\legal.ts')
foreach ($f in $filesToRemove) {
  if (Test-Path $f) { Remove-Item -Force $f }
}
```

- [ ] **Step 3: Verify lib directory**

```bash
Get-ChildItem src\lib -Name
```

Expected: only `firebase/` and `supabase/` directories remain (plus any other small util files like `constants.ts` — check if `constants.ts` is still needed by layout.tsx, keep if so).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete AI, payments, and feature lib directories"
```

---

## Task 4: Delete heavy components

**Files:** `src/components/3d/`, `src/components/charts/`, `src/components/dashboard/`, `src/components/layout/`, `src/components/providers/QueryProvider.tsx`, `src/components/providers/TranslationProvider.tsx`, `src/components/GlobalErrorListener.tsx`, `src/components/SwRegister.tsx`, `src/components/SmartAppBanner.tsx`, `src/components/seo/`, `src/components/legal/`, `src/components/notifications/`

- [ ] **Step 1: Delete component directories**

```bash
cd C:\dev\aroha-astrology\frontend
$dirsToRemove = @('src\components\3d','src\components\charts','src\components\dashboard','src\components\layout','src\components\seo','src\components\legal','src\components\notifications')
foreach ($d in $dirsToRemove) {
  if (Test-Path $d) { Remove-Item -Recurse -Force $d }
}
```

- [ ] **Step 2: Delete individual component files**

```bash
$filesToRemove = @(
  'src\components\providers\QueryProvider.tsx',
  'src\components\providers\TranslationProvider.tsx',
  'src\components\GlobalErrorListener.tsx',
  'src\components\SwRegister.tsx',
  'src\components\SmartAppBanner.tsx'
)
foreach ($f in $filesToRemove) {
  if (Test-Path $f) { Remove-Item -Force $f }
}
```

- [ ] **Step 3: Verify components directory**

```bash
Get-ChildItem src\components -Recurse -Name
```

Expected: only `auth/`, `ui/`, and `providers/AuthProvider.tsx` + `providers/ThemeProvider.tsx` remain.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete 3D, charts, layout, and feature components"
```

---

## Task 5: Strip the Zustand store

**Files:**
- Modify: `src/store/useStore.ts`
- Create: `src/store/useStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/useStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { User } from '@supabase/supabase-js';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({ user: null, loading: true });
  });

  it('starts with no user and loading true', () => {
    const { user, loading } = useStore.getState();
    expect(user).toBeNull();
    expect(loading).toBe(true);
  });

  it('setUser stores the user', () => {
    const fakeUser = { id: 'abc-123' } as User;
    useStore.getState().setUser(fakeUser);
    expect(useStore.getState().user?.id).toBe('abc-123');
  });

  it('setLoading toggles loading', () => {
    useStore.getState().setLoading(false);
    expect(useStore.getState().loading).toBe(false);
  });

  it('setUser(null) clears user', () => {
    useStore.getState().setUser({ id: 'abc' } as User);
    useStore.getState().setUser(null);
    expect(useStore.getState().user).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails (store not yet stripped)**

```bash
cd C:\dev\aroha-astrology\frontend
pnpm test -- useStore
```

Expected: FAIL — `user` and `loading` may resolve but shape tests will fail because old store has different initial values.

- [ ] **Step 3: Rewrite useStore.ts**

Replace entire content of `src/store/useStore.ts`:

```typescript
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- useStore
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts src/store/useStore.test.ts
git commit -m "refactor(store): strip to user+loading only"
```

---

## Task 6: Rewrite AuthProvider

**Files:**
- Rewrite: `src/components/providers/AuthProvider.tsx`

The current AuthProvider calls `/api/dashboard/init` (external backend), uses react-query, has a legal gate, and imports from `@aroha-astrology/shared`. Replace it with a minimal version that only tracks Supabase auth state.

- [ ] **Step 1: Rewrite AuthProvider.tsx**

Replace the entire content of `src/components/providers/AuthProvider.tsx`:

```typescript
'use client';

import { useEffect, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/store/useStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useStore((s) => s.setUser);
  const setLoading = useStore((s) => s.setLoading);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/providers/AuthProvider.tsx
git commit -m "refactor(auth): strip AuthProvider to minimal Supabase auth state"
```

---

## Task 7: Strip layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

Remove: `QueryProvider`, `TranslationProvider`, `GlobalErrorListener`, `Analytics`, `SpeedInsights`, `SwRegister`, `SmartAppBanner`, `JsonLd`, `organizationSchema`, `websiteSchema`.
Keep: `ThemeProvider`, `AuthProvider`, `Toaster`, fonts, metadata.

- [ ] **Step 1: Replace layout.tsx**

```typescript
import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from 'sonner';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#11131A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

const cinzel = Cinzel({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  variable: '--font-devanagari',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Aroha Astrology',
  description: 'Your personal astrology guide',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cinzel.variable} ${jetBrainsMono.variable} ${notoDevanagari.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "refactor(layout): strip to ThemeProvider + AuthProvider + Toaster"
```

---

## Task 8: Rewrite middleware.ts

**Files:**
- Rewrite: `src/middleware.ts`

Simplified to: refresh session on every request, protect `/onboarding` and `/home`, redirect logged-in users away from `/login` and `/signup`.

- [ ] **Step 1: Replace middleware.ts**

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const protectedRoutes = ['/home', '/onboarding'];
  const authRoutes = ['/login', '/signup'];

  // Unauthenticated user hitting a protected route → /login
  if (!user && protectedRoutes.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting an auth page → /home
  if (user && authRoutes.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|\\.well-known|icons|downloads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|apk|ipa|aab|dmg|exe|zip)$).*)',
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "refactor(middleware): simplify to 4 routes — home/onboarding protected, login/signup redirect-if-authed"
```

---

## Task 9: Create local /api/auth/phone-signin route

**Files:**
- Create: `src/app/api/auth/phone-signin/route.ts`

The login/signup pages call this relative URL. It needs to live locally: verify the Firebase ID token using Firebase Admin, create/find the Supabase user, and return a Supabase token hash for `verifyOtp`.

- [ ] **Step 1: Create the directory**

```bash
New-Item -ItemType Directory -Force "C:\dev\aroha-astrology\frontend\src\app\api\auth\phone-signin"
```

- [ ] **Step 2: Create route.ts**

```typescript
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json() as { idToken: string };
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    // Verify Firebase ID token
    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone = decoded.phone_number;
    if (!phone) {
      return NextResponse.json({ error: 'No phone number in token' }, { status: 400 });
    }

    // Use Supabase admin to upsert user by phone and get a magic-link token
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Generate OTP link for the phone number (creates user if new)
    const email = `${phone.replace('+', '')}@phone.aroha.app`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { shouldCreateUser: true },
    });
    if (error || !data?.properties) {
      return NextResponse.json({ error: error?.message ?? 'Auth failed' }, { status: 500 });
    }

    const { hashed_token, verification_type } = data.properties;
    return NextResponse.json({
      tokenHash: hashed_token,
      type: verification_type,
      isNewUser: data.user?.created_at === data.user?.updated_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Note:** This route requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. The user will provide actual Firebase and Supabase credentials.

- [ ] **Step 3: Check that firebase/admin.ts exports getFirebaseAdmin**

Read `src/lib/firebase/admin.ts`. If the export name differs (e.g., it's a default export or named differently), update the import in route.ts to match. Do not change the firebase/admin.ts file itself — just match the import.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/phone-signin/route.ts
git commit -m "feat(api): add local phone-signin route — Firebase ID token → Supabase session"
```

---

## Task 10: Update login page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

Changes: remove `framer-motion` (replace `motion.div` → `div`, remove `AnimatePresence`), change redirect from `/dashboard` → `/home` with birth_profile check, remove `Constellation` import if it depends on deleted packages.

- [ ] **Step 1: Check Constellation component**

Read `src/components/ui/decorative.tsx` (or wherever Constellation is defined). If it imports framer-motion or deleted packages, remove the `Constellation` usage from the login page. If it is a plain SVG component, keep it.

- [ ] **Step 2: Replace login/page.tsx**

```typescript
'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { sendPhoneOTP, confirmPhoneOTP, resetPhoneAuth } from '@/lib/firebase/phone-auth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function normalisePhone(digits: string) {
  return `+91${digits.replace(/\D/g, '').replace(/^0/, '')}`;
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOTP(normalisePhone(digits), recaptchaRef.current);
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to send OTP');
      resetPhoneAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { idToken } = await confirmPhoneOTP(otp);

      const res = await fetch('/api/auth/phone-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Sign-in failed');
      }
      const { tokenHash, type } = await res.json() as { tokenHash: string; type: string };

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' });
      if (error) throw error;

      // Check if user has a birth profile; if not, send to onboarding
      const { data: profiles } = await supabase
        .from('birth_profiles')
        .select('id')
        .limit(1);
      const hasProfile = Array.isArray(profiles) && profiles.length > 0;

      window.location.href = hasProfile ? '/home' : '/onboarding';
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 bg-bg overflow-hidden">
      <div ref={recaptchaRef} />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Aroha Astrology" width={56} height={56} className="rounded-2xl shadow-sm" />
          </div>
          <p className="j-eyebrow text-accent text-[10px] mb-2" data-no-translate>
            <span style={{ fontFamily: 'var(--font-devanagari)' }}>नमस्ते</span> · WELCOME BACK
          </p>
          <h1 className="j-display text-3xl text-text" data-no-translate>Aroha Astrology</h1>
          <p className="mt-2 text-sm text-text-muted">Your personal astrology guide</p>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6 shadow-[0_4px_24px_rgba(36,28,21,0.06)]">
          <h2 className="j-display text-base text-text mb-5 text-center">Sign in to continue</h2>

          {!otpSent ? (
            <div>
              <div className="flex rounded-xl border border-border overflow-hidden mb-3 bg-surface-2">
                <span className="flex items-center px-3 text-sm text-text-muted border-r border-border whitespace-nowrap">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none"
                />
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-xs text-text-muted mb-3">OTP sent to +91 {phone}</p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                autoFocus
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-xl tracking-[0.5em] font-semibold text-text placeholder:text-text-muted/40 outline-none focus:border-accent mb-3"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtp(''); resetPhoneAuth(); }}
                className="w-full mt-2 text-xs text-text-muted/70 hover:text-text-muted underline cursor-pointer bg-transparent border-0"
              >
                Change number / Resend OTP
              </button>
            </div>
          )}

          <p className="mt-5 text-center text-[11px] text-text-muted/70">
            By signing in, you agree to our{' '}
            <a href="/terms" className="underline hover:text-text-muted">Terms &amp; Conditions</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-text-muted">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "refactor(login): remove framer-motion, fix redirect to /home, check birth_profiles"
```

---

## Task 11: Update signup page

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

Changes: remove framer-motion, remove referral/Dhanam credits copy (credits system deleted), redirect to `/onboarding` for new users (unchanged), remove `TokenGlyph` if it has deleted dependencies.

- [ ] **Step 1: Replace signup/page.tsx**

```typescript
'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { sendPhoneOTP, confirmPhoneOTP, resetPhoneAuth } from '@/lib/firebase/phone-auth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function normalisePhone(digits: string) {
  return `+91${digits.replace(/\D/g, '').replace(/^0/, '')}`;
}

export default function SignUpPage() {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      await sendPhoneOTP(normalisePhone(digits), recaptchaRef.current);
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to send OTP');
      resetPhoneAuth();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { idToken } = await confirmPhoneOTP(otp);

      const res = await fetch('/api/auth/phone-signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Sign-up failed');
      }
      const { tokenHash, type, isNewUser } = await res.json() as {
        tokenHash: string;
        type: string;
        isNewUser?: boolean;
      };

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' });
      if (error) throw error;

      window.location.href = isNewUser ? '/onboarding' : '/home';
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 bg-bg overflow-hidden">
      <div ref={recaptchaRef} />
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Aroha Astrology" width={56} height={56} className="rounded-2xl shadow-sm" />
          </div>
          <p className="j-eyebrow text-accent text-[10px] mb-1.5" data-no-translate>
            <span style={{ fontFamily: 'var(--font-devanagari)' }}>नमस्ते</span> · NAMASTE
          </p>
          <h1 className="j-display text-2xl text-text" data-no-translate>Aroha Astrology</h1>
          <p className="mt-1.5 text-sm text-text-muted">Begin your cosmic journey</p>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6 shadow-[0_4px_24px_rgba(36,28,21,0.06)]">
          <h2 className="j-display text-base text-text mb-5 text-center">Create your account</h2>

          {!otpSent ? (
            <div>
              <div className="flex rounded-xl border border-border overflow-hidden mb-3 bg-surface-2">
                <span className="flex items-center px-3 text-sm text-text-muted border-r border-border whitespace-nowrap">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                  className="flex-1 bg-transparent px-3 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none"
                />
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-center text-xs text-text-muted mb-3">OTP sent to +91 {phone}</p>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                autoFocus
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-xl tracking-[0.5em] font-semibold text-text placeholder:text-text-muted/40 outline-none focus:border-accent mb-3"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Verifying…' : 'Verify & Create account'}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtp(''); resetPhoneAuth(); }}
                className="w-full mt-2 text-xs text-text-muted/70 hover:text-text-muted underline cursor-pointer bg-transparent border-0"
              >
                Change number / Resend OTP
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-center text-[11px] text-text-muted/70">
            By registering, you agree to our{' '}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted">
              Terms &amp; Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-muted">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(auth)/signup/page.tsx
git commit -m "refactor(signup): remove framer-motion and credits copy, strip to phone OTP only"
```

---

## Task 12: Rewrite onboarding page

**Files:**
- Rewrite: `src/app/onboarding/page.tsx`

Collect first name, DOB, time of birth, place of birth. Write directly to Supabase `birth_profiles` (no backend API). Redirect to `/home` on success.

- [ ] **Step 1: Create/rewrite onboarding/page.tsx**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  first_name: z.string().min(1, 'Name is required').max(50),
  dob: z.string().min(1, 'Date of birth is required'),
  tob: z.string().min(1, 'Time of birth is required'),
  place: z.string().min(1, 'Place of birth is required').max(100),
});

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ first_name: '', dob: '', tob: '', place: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('birth_profiles').insert({
        user_id: user.id,
        first_name: parsed.data.first_name,
        dob: parsed.data.dob,
        tob: parsed.data.tob,
        place: parsed.data.place,
      });
      if (error) throw error;

      router.replace('/home');
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Aroha Astrology" width={56} height={56} className="rounded-2xl shadow-sm" />
          </div>
          <h1 className="j-display text-2xl text-text">Tell us about yourself</h1>
          <p className="mt-2 text-sm text-text-muted">We need your birth details for accurate readings</p>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Your name</label>
            <input
              type="text"
              placeholder="First name"
              value={form.first_name}
              onChange={handleChange('first_name')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Date of birth</label>
            <input
              type="date"
              value={form.dob}
              onChange={handleChange('dob')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Time of birth</label>
            <input
              type="time"
              value={form.tob}
              onChange={handleChange('tob')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Place of birth</label>
            <input
              type="text"
              placeholder="City, Country"
              value={form.place}
              onChange={handleChange('place')}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-full py-3 text-[14px] font-medium bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer mt-2"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "refactor(onboarding): rewrite to write birth_profiles directly to Supabase, redirect /home"
```

---

## Task 13: Create /home page

**Files:**
- Create: `src/app/home/page.tsx`
- Create: `src/app/home/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/home/page.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { first_name: 'Arjun' }, error: null }),
        }),
      }),
    }),
  }),
}));

describe('HomePage', () => {
  it('renders Hello with first name', async () => {
    render(<HomePage />);
    // Name loads async — wait for it
    const greeting = await screen.findByText(/Hello Arjun/i);
    expect(greeting).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- home/page
```

Expected: FAIL — file doesn't exist yet.

- [ ] **Step 3: Create src/app/home/page.tsx**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('birth_profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .single();

      if (data?.first_name) setFirstName(data.first_name);
    }
    load();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <h1 className="j-display text-4xl text-text">
        {firstName ? `Hello ${firstName}` : 'Hello'}
      </h1>
    </div>
  );
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- home/page
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/home/page.tsx src/app/home/page.test.tsx
git commit -m "feat(home): add Hello [first name] page reading from Supabase birth_profiles"
```

---

## Task 14: Clean package.json and next.config.ts

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Update package.json**

In `package.json`, remove from `dependencies`:
- `@aroha-astrology/astro-engine`
- `@aroha-astrology/shared`
- `@react-three/drei`
- `@react-three/fiber`
- `@tanstack/react-query`
- `@vercel/analytics`
- `@vercel/speed-insights`
- `framer-motion`
- `razorpay`
- `recharts`
- `three`

Remove from `devDependencies`:
- `@playwright/test`

Remove from `scripts`:
- `"test:e2e": "playwright test"`

Also remove `"build:packages"` and simplify `"build"` — the workspace packages `@aroha-astrology/*` are gone:

```json
{
  "name": "@aroha-astrology/frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.47.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "firebase": "^12.13.0",
    "lucide-react": "^0.460.0",
    "next": "^15.1.0",
    "next-themes": "^0.4.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^1.7.0",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.23.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@capacitor-community/speech-recognition": "^6.0.0",
    "@capacitor-community/text-to-speech": "5.1.0",
    "@capacitor-firebase/authentication": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor/browser": "^6.0.0",
    "@capacitor/camera": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/geolocation": "^6.0.0",
    "@capacitor/preferences": "^6.0.0",
    "@capacitor/push-notifications": "^6.0.0",
    "@capacitor/splash-screen": "^6.0.0",
    "@capacitor/status-bar": "^6.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Clean next.config.ts**

Replace content of `next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    const capacitorModules = [
      '@capacitor/geolocation',
      '@capacitor/camera',
      '@capacitor/browser',
      '@capacitor/push-notifications',
      '@capacitor/app',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
      '@capacitor/preferences',
      '@capacitor-community/speech-recognition',
      '@capacitor-community/text-to-speech',
    ];
    config.resolve.alias = config.resolve.alias ?? {};
    for (const mod of capacitorModules) {
      config.resolve.alias[mod] = false;
    }
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 3: Install (remove deleted packages from lockfile)**

```bash
cd C:\dev\aroha-astrology\frontend
pnpm install
```

Expected: pnpm removes the deleted packages and updates `pnpm-lock.yaml`.

- [ ] **Step 4: Commit**

```bash
git add package.json next.config.ts pnpm-lock.yaml
git commit -m "chore(deps): remove three, react-three, framer-motion, razorpay, tanstack-query, vercel analytics, recharts, playwright"
```

---

## Task 15: Verify the build compiles

- [ ] **Step 1: Run the dev server briefly to check for compile errors**

```bash
cd C:\dev\aroha-astrology\frontend
pnpm dev
```

Watch the output. Expected: Next.js starts without TypeScript or module-not-found errors. Kill with Ctrl+C after it says "Ready".

If there are errors, fix each one:
- `Module not found: Can't resolve '@aroha-astrology/shared'` → grep for the import, remove or replace with `@supabase/supabase-js` types
- `Module not found: Can't resolve 'framer-motion'` → grep for remaining framer-motion imports, replace `motion.div` with `div`
- `Module not found: Can't resolve '@tanstack/react-query'` → grep for remaining imports, remove
- Any `Cannot find module '../../lib/queryKeys'` → remove those imports

```bash
# Grep helper for leftover imports:
grep -r "framer-motion" src/ --include="*.tsx" --include="*.ts" -l
grep -r "@tanstack" src/ --include="*.tsx" --include="*.ts" -l
grep -r "@aroha-astrology" src/ --include="*.tsx" --include="*.ts" -l
grep -r "queryKeys" src/ --include="*.tsx" --include="*.ts" -l
grep -r "legal" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Step 2: Run tests**

```bash
pnpm test
```

Expected: useStore tests and home page test pass. Fix any failures before continuing.

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining import errors after package cleanup"
```

---

## Task 16: Push branch

- [ ] **Step 1: Push clean/minimal to origin**

```bash
cd C:\dev\aroha-astrology\frontend
git push -u origin clean/minimal
```

Expected: Branch pushed. Remote URL returned.

- [ ] **Step 2: Verify on remote**

```bash
git log --oneline -8
```

Expected: 8–10 commits showing the progression: branch creation, page deletes, lib deletes, component deletes, store strip, auth rewrite, layout strip, middleware rewrite, api route, login update, signup update, onboarding rewrite, home page, deps cleanup.

---

## Self-Review Checklist

- [x] **Branch**: `clean/minimal` off `dev` — Task 1 ✓
- [x] **Delete 88 pages** — Task 2 ✓
- [x] **Delete feature libs** — Task 3 ✓
- [x] **Delete heavy components** — Task 4 ✓
- [x] **Strip store** — Task 5 ✓
- [x] **Rewrite AuthProvider** — Task 6 ✓
- [x] **Strip layout** — Task 7 ✓
- [x] **Simplify middleware** — Task 8 ✓
- [x] **Local phone-signin API route** — Task 9 ✓
- [x] **Login → /home redirect + birth_profile check** — Task 10 ✓
- [x] **Signup → /onboarding for new users** — Task 11 ✓
- [x] **Onboarding writes to Supabase directly** — Task 12 ✓
- [x] **/home shows "Hello [first_name]"** — Task 13 ✓
- [x] **Package cleanup** — Task 14 ✓
- [x] **Build verify** — Task 15 ✓
- [x] **Push** — Task 16 ✓

**Type consistency:**
- `User` from `@supabase/supabase-js` used consistently in store (Task 5) and AuthProvider (Task 6) ✓
- `birth_profiles.first_name` column name consistent across onboarding (Task 12) and /home (Task 13) ✓
- `getFirebaseAdmin` function name — Task 9 notes to verify against actual export in `firebase/admin.ts` ✓
