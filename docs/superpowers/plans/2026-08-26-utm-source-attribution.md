# UTM Source Attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture `?utm_source=`/`?utm_campaign=` from direct links to `app.arohaastrology.in` (pushes, WhatsApp/Telegram broadcasts, QR codes, support links) into the existing-but-unused `users.referral_source` column, and surface it as a "Source" column in the admin Users table.

**Architecture:** Mirrors the existing `?ref=CODE` referral-code capture exactly: a root-mounted component stashes the URL param into `localStorage`, onboarding submit reads it back into the `PATCH /v1/me` body, and the admin user list starts selecting/returning the column. No migration — the column and its write-path already exist and are already on the allowed-update-fields list.

**Tech Stack:** Next.js/TypeScript (frontend), Fastify/Drizzle/Zod (jyotish-backend), Vitest (both).

**Repos touched:** `frontend` and `jyotish-backend` are separate git repos — commit each independently, in the working directories named below.

---

### Task 1: Add UTM capture/read/clear to `frontend/lib/referral.ts`

**Files:**
- Modify: `C:\dev\aroha-astrology\frontend\lib\referral.ts`
- Test: `C:\dev\aroha-astrology\frontend\lib\referral.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `frontend/lib/referral.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { capturePendingUtmSource, getPendingUtmSource, clearPendingUtmSource } from "./referral";

const store = new Map<string, string>();

function setUrl(search: string) {
  (globalThis as unknown as { window: { location: { search: string } } }).window = {
    location: { search },
  };
}

beforeEach(() => {
  store.clear();
  setUrl("");
  (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("pending UTM source capture", () => {
  it("captures utm_source alone", () => {
    setUrl("?utm_source=telegram_broadcast");
    (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBe("telegram_broadcast");
  });

  it("combines utm_source and utm_campaign as source/campaign", () => {
    setUrl("?utm_source=telegram_broadcast&utm_campaign=diwali");
    (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBe("telegram_broadcast/diwali");
  });

  it("does nothing when utm_source is absent", () => {
    setUrl("?ref=ABC123");
    (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    capturePendingUtmSource();
    expect(getPendingUtmSource()).toBeNull();
  });

  it("clears the stashed value", () => {
    setUrl("?utm_source=whatsapp");
    (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    capturePendingUtmSource();
    clearPendingUtmSource();
    expect(getPendingUtmSource()).toBeNull();
  });
});
```

Note: `referral.ts` guards every function with `typeof window === "undefined"`, and this project's vitest config defaults to the `node` environment (no global `window`) — see `frontend/vitest.config.ts`. Each test (re)installs a fake `window.localStorage` after `setUrl` replaces `window`, exactly like `frontend/lib/device-id.test.ts` does for its own localStorage mock.

- [ ] **Step 2: Run test to verify it fails**

Run (from `C:\dev\aroha-astrology\frontend`): `npx vitest run lib/referral.test.ts`
Expected: FAIL — `capturePendingUtmSource` is not exported from `./referral`.

- [ ] **Step 3: Write the implementation**

In `frontend/lib/referral.ts`, add after the existing `clearPendingReferralCode` function (after line 37):

```ts
const UTM_STORAGE_KEY = "pending_utm_source";

/**
 * Reads `?utm_source=`/`?utm_campaign=` from the current URL and stashes them
 * for onboarding, same lifecycle as the `?ref=` capture above. Combined as
 * "source/campaign" (or just "source" with no campaign) since the backend's
 * `referral_source` column is a single free-text field.
 */
export function capturePendingUtmSource() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    if (!source) return;
    const campaign = params.get("utm_campaign");
    localStorage.setItem(UTM_STORAGE_KEY, campaign ? `${source}/${campaign}` : source);
  } catch {
    /* ignore */
  }
}

export function getPendingUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(UTM_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingUtmSource() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/referral.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd C:\dev\aroha-astrology\frontend
git add lib/referral.ts lib/referral.test.ts
git commit -m "feat(referral): capture pending utm_source/utm_campaign like the ref-code flow"
```

---

### Task 2: Wire capture into the root-mounted `ReferralCapture`

**Files:**
- Modify: `C:\dev\aroha-astrology\frontend\components\ReferralCapture.tsx`

- [ ] **Step 1: Edit the component**

Replace the full contents of `frontend/components/ReferralCapture.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { capturePendingReferralCode, capturePendingUtmSource } from "@/lib/referral";

/** Mounted once at the root so a `?ref=CODE` link or `?utm_source=` link is captured before any redirect strips it. */
export default function ReferralCapture() {
  useEffect(() => {
    capturePendingReferralCode();
    capturePendingUtmSource();
  }, []);
  return null;
}
```

- [ ] **Step 2: Verify nothing else broke**

Run (from `C:\dev\aroha-astrology\frontend`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd C:\dev\aroha-astrology\frontend
git add components/ReferralCapture.tsx
git commit -m "feat(referral): capture utm_source alongside the referral code at app root"
```

---

### Task 3: Send the captured value on onboarding submit

**Files:**
- Modify: `C:\dev\aroha-astrology\frontend\lib\api.ts:198`
- Modify: `C:\dev\aroha-astrology\frontend\app\onboarding\page.tsx:27` (import) and `:446-448` (submit body), `:487` (clear)

- [ ] **Step 1: Add the field to `UpdateMeBody`**

In `frontend/lib/api.ts`, in the `UpdateMeBody` interface (around line 198), add a line right after `referredByCode?: string;`:

```ts
  referredByCode?: string;
  referralSource?: string;
```

- [ ] **Step 2: Read and send it in onboarding**

In `frontend/app/onboarding/page.tsx`, change the import on line 27 from:

```ts
import { getPendingReferralCode, clearPendingReferralCode } from "@/lib/referral";
```

to:

```ts
import {
  getPendingReferralCode,
  clearPendingReferralCode,
  getPendingUtmSource,
  clearPendingUtmSource,
} from "@/lib/referral";
```

Then, in the submit handler, change (around line 446-448):

```ts
      if (answers.referralCode) {
        body.referredByCode = answers.referralCode;
      }
```

to:

```ts
      if (answers.referralCode) {
        body.referredByCode = answers.referralCode;
      }
      const pendingUtmSource = getPendingUtmSource();
      if (pendingUtmSource) {
        body.referralSource = pendingUtmSource;
      }
```

Then, right after `clearPendingReferralCode();` (around line 487):

```ts
      await api.updateMe(body);
      await refresh();
      clearPendingReferralCode();
      clearPendingUtmSource();
```

- [ ] **Step 3: Verify**

Run (from `C:\dev\aroha-astrology\frontend`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd C:\dev\aroha-astrology\frontend
git add lib/api.ts app/onboarding/page.tsx
git commit -m "feat(onboarding): send captured utm_source as referralSource on signup"
```

---

### Task 4: Backend — select `referralSource` in the admin user list query

**Files:**
- Modify: `C:\dev\aroha-astrology\jyotish-backend\src\modules\users\users.repo.ts:871-889`

- [ ] **Step 1: Edit the select**

In `jyotish-backend/src/modules/users/users.repo.ts`, in `listUsersPage`, change:

```ts
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      phoneE164: users.phoneE164,
      email: users.email,
      walletBalancePaise: users.walletBalancePaise,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      claimedAmountPaise: claimedAmountExpr(),
      claimedAt: claimedAtExpr(),
    })
```

to:

```ts
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      phoneE164: users.phoneE164,
      email: users.email,
      referralSource: users.referralSource,
      walletBalancePaise: users.walletBalancePaise,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
      claimedAmountPaise: claimedAmountExpr(),
      claimedAt: claimedAtExpr(),
    })
```

This is a plain existing column (like `email`), selected the same way — no new expression, no branch, so no new unit test for this line. The existing `users-repo-search.spec.ts` mocks `db.select()` wholesale regardless of which columns are requested, so it keeps passing unchanged.

- [ ] **Step 2: Run the existing backend test suite for this file**

Run (from `C:\dev\aroha-astrology\jyotish-backend`): `npx vitest run test/users-repo-search.spec.ts`
Expected: PASS, same count as before this change.

- [ ] **Step 3: Commit**

```bash
cd C:\dev\aroha-astrology\jyotish-backend
git add src/modules/users/users.repo.ts
git commit -m "feat(admin): select referralSource in listUsersPage"
```

---

### Task 5: Backend — return `referralSource` from `GET /v1/admin/users`

**Files:**
- Modify: `C:\dev\aroha-astrology\jyotish-backend\src\modules\admin\admin.schemas.ts:139-156`

- [ ] **Step 1: Edit the schema**

In `jyotish-backend/src/modules/admin/admin.schemas.ts`, change:

```ts
const AdminUserRowSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  phoneE164: z.string().nullable(),
  email: z.string().nullable(),
  walletBalancePaise: z.number(),
  createdAt: z.string(),
  lastActiveAt: z.string().nullable(),
  claimedAmountPaise: z.number().nullable(),
  claimedAt: z.string().nullable(),
  country: z.string().nullable(),
```

to:

```ts
const AdminUserRowSchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  phoneE164: z.string().nullable(),
  email: z.string().nullable(),
  referralSource: z.string().nullable(),
  walletBalancePaise: z.number(),
  createdAt: z.string(),
  lastActiveAt: z.string().nullable(),
  claimedAmountPaise: z.number().nullable(),
  claimedAt: z.string().nullable(),
  country: z.string().nullable(),
```

(Leave the rest of the object — `city`, `timeSpent*Sec` — untouched; those are populated by code outside `listUsersPage` and are out of scope here.)

- [ ] **Step 2: Run the admin route/service tests**

Run (from `C:\dev\aroha-astrology\jyotish-backend`): `npx vitest run test/admin-routes.spec.ts test/admin-service.spec.ts`
Expected: PASS, same count as before this change.

- [ ] **Step 3: Commit**

```bash
cd C:\dev\aroha-astrology\jyotish-backend
git add src/modules/admin/admin.schemas.ts
git commit -m "feat(admin): add referralSource to the admin users response schema"
```

---

### Task 6: Frontend — add `referralSource` to the admin API client type

**Files:**
- Modify: `C:\dev\aroha-astrology\frontend\lib\admin-api.ts:83-102`

- [ ] **Step 1: Edit the interface**

In `frontend/lib/admin-api.ts`, change:

```ts
export interface AdminUserRow {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  walletBalancePaise: number;
```

to:

```ts
export interface AdminUserRow {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  /** utm_source[/utm_campaign] captured from a direct app-domain link (push, broadcast, QR code) — null for organic/unattributed signups. */
  referralSource: string | null;
  walletBalancePaise: number;
```

- [ ] **Step 2: Verify**

Run (from `C:\dev\aroha-astrology\frontend`): `npx tsc --noEmit`
Expected: a new error at `app/admin/users/page.tsx` is fine here (Task 7 fixes it) — everything else should be clean. If nothing references `AdminUserRow` exhaustively elsewhere, there may be no error at all yet.

- [ ] **Step 3: Commit**

```bash
cd C:\dev\aroha-astrology\frontend
git add lib/admin-api.ts
git commit -m "feat(admin): add referralSource to AdminUserRow"
```

---

### Task 7: Frontend — show the "Source" column in the admin Users table

**Files:**
- Modify: `C:\dev\aroha-astrology\frontend\app\admin\users\page.tsx`

- [ ] **Step 1: Add the header cell**

In `frontend/app/admin/users/page.tsx`, in the `<thead>` row, change:

```tsx
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium text-right">
```

to:

```tsx
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-4 py-2 font-medium text-right">
```

- [ ] **Step 2: Add the body cell**

In the same file, in the `<tbody>` row rendering, change:

```tsx
                      <td className="px-4 py-2 text-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-foreground">{formatRupees(u.walletBalancePaise)}</td>
```

to:

```tsx
                      <td className="px-4 py-2 text-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-2 text-muted">{u.referralSource ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-foreground">{formatRupees(u.walletBalancePaise)}</td>
```

- [ ] **Step 3: Verify**

Run (from `C:\dev\aroha-astrology\frontend`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd C:\dev\aroha-astrology\frontend
git add app/admin/users/page.tsx
git commit -m "feat(admin): render the Source column in the Users table"
```

---

### Task 8: Full verification

- [ ] **Step 1: Run the full frontend test suite**

Run (from `C:\dev\aroha-astrology\frontend`): `npx vitest run`
Expected: all pass, including the new `lib/referral.test.ts`.

- [ ] **Step 2: Run the full backend test suite**

Run (from `C:\dev\aroha-astrology\jyotish-backend`): `npm test`
Expected: same pass/fail baseline as before this change (no new failures).

- [ ] **Step 3: Manual smoke check**

With the dev server running, open `http://localhost:3000?utm_source=manual_test&utm_campaign=smoke` (or whatever local port the frontend runs on), complete onboarding for a fresh test account, then check `/admin/users` — the new row's Source column should read `manual_test/smoke`.

- [ ] **Step 4: Update memory** (only if this session has the memory system available)

Add a short entry noting `referral_source` is now wired end-to-end for direct app-domain links, superseding the "unused column" fact from earlier exploration.
