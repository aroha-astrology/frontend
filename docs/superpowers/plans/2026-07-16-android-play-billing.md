# Android Google Play Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users buy credit packs from inside the Android app via Google Play Billing, with the backend verifying and granting credits server-side.

**Architecture:** A small local (unpublished) Capacitor plugin wraps Google's Play Billing Library directly and returns a purchase token; the backend verifies that token against the Android Publisher API and grants credits through the existing, already-atomic `confirmOrderAndGrantCredits`. The backend looks up the order by `(userId, productId)` rather than requiring the client to remember an order ID, so crash recovery needs no local persistence — just replaying `queryUnconsumedPurchases()` results through the same confirm call.

**Tech Stack:** Hono/Zod-OpenAPI + Drizzle (backend), `googleapis` (Android Publisher API client), Capacitor 6 + a local Java plugin wrapping `com.android.billingclient:billing` (Android native), Next.js/React (frontend, shared by web and the app's webview).

**Spec:** `docs/superpowers/specs/2026-07-16-android-play-billing-design.md`

---

## Part 1 — Backend (`jyotish-backend`)

### Task 1: Google Play env config

**Files:**
- Modify: `jyotish-backend/src/config/env.ts`
- Modify: `jyotish-backend/.env.example`

- [ ] **Step 1: Add the new env vars to the schema**

In `src/config/env.ts`, add after the existing `FIREBASE_WEB_API_KEY` line (around line 42):

```ts
    // --- Google Play Billing (Android in-app purchases) --------------------
    // Either point at a service account JSON file (preferred) ...
    GOOGLE_PLAY_SERVICE_ACCOUNT_PATH: z.string().min(1).optional(),
    // ... or provide the three fields individually.
    GOOGLE_PLAY_PROJECT_ID: z.string().min(1).optional(),
    GOOGLE_PLAY_CLIENT_EMAIL: z
      .string()
      .email('GOOGLE_PLAY_CLIENT_EMAIL must be a valid email')
      .optional(),
    GOOGLE_PLAY_PRIVATE_KEY: z
      .string()
      .min(1)
      .transform((value) => value.replace(/\\n/g, '\n'))
      .optional(),
    GOOGLE_PLAY_PACKAGE_NAME: z.string().min(1).default('com.aroha.astrology'),
```

- [ ] **Step 2: Add validation — unlike Firebase, Google Play config is optional overall (the app must still boot before it's set up), but if partially provided it must be complete**

In the existing `.superRefine((value, ctx) => { ... })` block (the one that currently only checks Firebase), add after the existing Firebase check:

```ts
    const hasPlayPath = Boolean(value.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH);
    const playTripleValues = [
      value.GOOGLE_PLAY_PROJECT_ID,
      value.GOOGLE_PLAY_CLIENT_EMAIL,
      value.GOOGLE_PLAY_PRIVATE_KEY,
    ];
    const hasAnyPlayTriple = playTripleValues.some(Boolean);
    const hasFullPlayTriple = playTripleValues.every(Boolean);
    if (!hasPlayPath && hasAnyPlayTriple && !hasFullPlayTriple) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GOOGLE_PLAY_SERVICE_ACCOUNT_PATH'],
        message:
          'Provide GOOGLE_PLAY_SERVICE_ACCOUNT_PATH, all three of GOOGLE_PLAY_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY, or omit all Google Play config',
      });
    }
```

- [ ] **Step 3: Verify the app still boots with no Google Play config set (it must — this is optional until the service account exists)**

Run: `cd jyotish-backend && npm run typecheck`
Expected: no errors.

Run: `npm run test -- env` (or `npx vitest run` if no test matches — there's no dedicated env spec, so just confirm nothing else broke):
Run: `npx vitest run`
Expected: all existing tests still pass (this step only added optional fields, nothing required changed).

- [ ] **Step 4: Document the new vars in `.env.example`**

In `.env.example`, after the existing Firebase block, add:

```
# Google Play Billing (Android in-app purchases) — optional until you've set
# up a service account in Google Cloud with Play Console API access.
#GOOGLE_PLAY_SERVICE_ACCOUNT_PATH=./secrets/your-project-play-billing.json
#GOOGLE_PLAY_PROJECT_ID=your-gcp-project-id
#GOOGLE_PLAY_CLIENT_EMAIL=play-billing@your-project.iam.gserviceaccount.com
#GOOGLE_PLAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
#GOOGLE_PLAY_PACKAGE_NAME=com.aroha.astrology
```

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts .env.example
git commit -m "feat(billing): add Google Play service-account env config"
```

---

### Task 2: Android Publisher API client

**Files:**
- Create: `jyotish-backend/src/config/google-play.ts`
- Modify: `jyotish-backend/package.json` (add `googleapis` dependency)

- [ ] **Step 1: Install the dependency**

Run: `cd jyotish-backend && npm install googleapis`
Expected: `package.json` and `package-lock.json` updated with `googleapis`.

- [ ] **Step 2: Write the client factory**

Create `src/config/google-play.ts`:

```ts
import { google, type androidpublisher_v3 } from 'googleapis';
import { env } from './env.js';

export const GOOGLE_PLAY_PACKAGE_NAME = env.GOOGLE_PLAY_PACKAGE_NAME;

let client: androidpublisher_v3.Androidpublisher | undefined;

export function isGooglePlayConfigured(): boolean {
  return Boolean(
    env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH ||
      (env.GOOGLE_PLAY_PROJECT_ID && env.GOOGLE_PLAY_CLIENT_EMAIL && env.GOOGLE_PLAY_PRIVATE_KEY),
  );
}

function buildAuth() {
  const scopes = ['https://www.googleapis.com/auth/androidpublisher'];
  if (env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH) {
    return new google.auth.JWT({ keyFile: env.GOOGLE_PLAY_SERVICE_ACCOUNT_PATH, scopes });
  }
  return new google.auth.JWT({
    email: env.GOOGLE_PLAY_CLIENT_EMAIL,
    key: env.GOOGLE_PLAY_PRIVATE_KEY,
    scopes,
  });
}

export function getAndroidPublisher(): androidpublisher_v3.Androidpublisher {
  if (client) return client;
  if (!isGooglePlayConfigured()) {
    throw new Error(
      'Google Play is not configured — set GOOGLE_PLAY_SERVICE_ACCOUNT_PATH or ' +
        'GOOGLE_PLAY_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY',
    );
  }
  client = google.androidpublisher({ version: 'v3', auth: buildAuth() });
  return client;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/config/google-play.ts
git commit -m "feat(billing): add Android Publisher API client factory"
```

---

### Task 3: Purchase verification + consumption wrapper

**Files:**
- Create: `jyotish-backend/src/modules/billing/google-play-verifier.ts`

This is a thin wrapper so `billing.service.ts` (Task 4) can be unit-tested by mocking this whole module instead of mocking `googleapis` directly.

- [ ] **Step 1: Write the wrapper**

Create `src/modules/billing/google-play-verifier.ts`:

```ts
import { getAndroidPublisher, GOOGLE_PLAY_PACKAGE_NAME } from '../../config/google-play.js';

/** True if Google reports this purchase token as genuinely `purchased` (not canceled/pending). */
export async function verifyGooglePlayPurchase(params: {
  productId: string;
  purchaseToken: string;
}): Promise<boolean> {
  const client = getAndroidPublisher();
  const { data } = await client.purchases.products.get({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    productId: params.productId,
    token: params.purchaseToken,
  });
  // purchaseState: 0 = purchased, 1 = canceled, 2 = pending.
  return data.purchaseState === 0;
}

/** Marks a consumable purchase as spent so the same product can be bought again. */
export async function consumeGooglePlayPurchase(params: {
  productId: string;
  purchaseToken: string;
}): Promise<void> {
  const client = getAndroidPublisher();
  await client.purchases.products.consume({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    productId: params.productId,
    token: params.purchaseToken,
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/billing/google-play-verifier.ts
git commit -m "feat(billing): add Google Play purchase verify/consume wrapper"
```

---

### Task 4: Order lookup by pack + the confirmation service function (TDD)

**Files:**
- Modify: `jyotish-backend/src/modules/billing/billing.repo.ts`
- Modify: `jyotish-backend/src/modules/billing/billing.service.ts`
- Test: `jyotish-backend/test/billing-google-play.spec.ts`

- [ ] **Step 1: Add the repo lookup (no test needed — it's a one-line Drizzle query exercised end-to-end by the service tests below via mocking)**

In `src/modules/billing/billing.repo.ts`, add after `findOrderByIdForUser`:

```ts
/** Most recent order (any status) for this user+pack — used to find the order a Google Play purchase belongs to without the client needing to remember an order ID. */
export async function findLatestOrderForPack(
  userId: string,
  packId: string,
): Promise<OrderRow | undefined> {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.packId, packId)))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return rows[0];
}
```

- [ ] **Step 2: Write the failing test**

Create `test/billing-google-play.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── mocks ──────────────────────────────────────────────────────────────────
vi.mock('../src/modules/billing/google-play-verifier.js', () => ({
  verifyGooglePlayPurchase: vi.fn(),
  consumeGooglePlayPurchase: vi.fn(),
}));
vi.mock('../src/modules/billing/billing.repo.js', () => ({
  findLatestOrderForPack: vi.fn(),
  confirmOrderAndGrantCredits: vi.fn(),
}));
vi.mock('../src/modules/users/users.repo.js', () => ({
  findActiveUserById: vi.fn(),
}));

import {
  verifyGooglePlayPurchase,
  consumeGooglePlayPurchase,
} from '../src/modules/billing/google-play-verifier.js';
import {
  findLatestOrderForPack,
  confirmOrderAndGrantCredits,
} from '../src/modules/billing/billing.repo.js';
import { findActiveUserById } from '../src/modules/users/users.repo.js';
import { confirmGooglePlayPurchase } from '../src/modules/billing/billing.service.js';

const baseOrder = {
  id: 'order-1',
  userId: 'user-1',
  packId: 'starter',
  credits: 60,
  amountPaise: 4900,
  discountPaise: 0,
  finalAmountPaise: 4900,
  currency: 'INR',
  couponId: null,
  couponCode: null,
  status: 'pending' as const,
  gatewayProvider: 'mock',
  gatewayOrderId: null,
  gatewayPaymentId: null,
  createdAt: new Date('2026-07-16T00:00:00Z'),
  paidAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('confirmGooglePlayPurchase', () => {
  it('throws not found when there is no matching order', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue(undefined);

    await expect(
      confirmGooglePlayPurchase('user-1', { purchaseToken: 'tok', productId: 'starter' }),
    ).rejects.toThrow('No matching order found for this purchase');
  });

  it('verifies, grants credits, and consumes for a pending order', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue(baseOrder);
    vi.mocked(verifyGooglePlayPurchase).mockResolvedValue(true);
    vi.mocked(confirmOrderAndGrantCredits).mockResolvedValue({
      order: { ...baseOrder, status: 'paid', gatewayPaymentId: 'tok' },
      credits: 60,
    });
    vi.mocked(consumeGooglePlayPurchase).mockResolvedValue(undefined);

    const result = await confirmGooglePlayPurchase('user-1', {
      purchaseToken: 'tok',
      productId: 'starter',
    });

    expect(verifyGooglePlayPurchase).toHaveBeenCalledWith({
      productId: 'starter',
      purchaseToken: 'tok',
    });
    expect(confirmOrderAndGrantCredits).toHaveBeenCalledWith('order-1', 'user-1', 'tok');
    expect(consumeGooglePlayPurchase).toHaveBeenCalledWith({
      productId: 'starter',
      purchaseToken: 'tok',
    });
    expect(result.credits).toBe(60);
  });

  it('rejects when Google reports the purchase is not in a completed state', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue(baseOrder);
    vi.mocked(verifyGooglePlayPurchase).mockResolvedValue(false);

    await expect(
      confirmGooglePlayPurchase('user-1', { purchaseToken: 'tok', productId: 'starter' }),
    ).rejects.toThrow('Purchase is not in a completed state');
    expect(confirmOrderAndGrantCredits).not.toHaveBeenCalled();
  });

  it('replays idempotently when the order is already paid with the same token', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue({
      ...baseOrder,
      status: 'paid',
      gatewayPaymentId: 'tok',
    });
    vi.mocked(findActiveUserById).mockResolvedValue({ credits: 60 } as never);

    const result = await confirmGooglePlayPurchase('user-1', {
      purchaseToken: 'tok',
      productId: 'starter',
    });

    expect(verifyGooglePlayPurchase).not.toHaveBeenCalled();
    expect(result.credits).toBe(60);
  });

  it('rejects when the order is already paid with a different token', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue({
      ...baseOrder,
      status: 'paid',
      gatewayPaymentId: 'some-other-token',
    });

    await expect(
      confirmGooglePlayPurchase('user-1', { purchaseToken: 'tok', productId: 'starter' }),
    ).rejects.toThrow('Order already confirmed with a different purchase');
  });

  it('does not fail the request when consume fails after credits are granted', async () => {
    vi.mocked(findLatestOrderForPack).mockResolvedValue(baseOrder);
    vi.mocked(verifyGooglePlayPurchase).mockResolvedValue(true);
    vi.mocked(confirmOrderAndGrantCredits).mockResolvedValue({
      order: { ...baseOrder, status: 'paid', gatewayPaymentId: 'tok' },
      credits: 60,
    });
    vi.mocked(consumeGooglePlayPurchase).mockRejectedValue(new Error('already consumed'));

    await expect(
      confirmGooglePlayPurchase('user-1', { purchaseToken: 'tok', productId: 'starter' }),
    ).resolves.toMatchObject({ credits: 60 });
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run test/billing-google-play.spec.ts`
Expected: FAIL — `confirmGooglePlayPurchase` is not exported from `billing.service.js`.

- [ ] **Step 4: Implement `confirmGooglePlayPurchase`**

In `src/modules/billing/billing.service.ts`:

1. Update the import from `./billing.repo.js` (currently `findActiveCouponByCode, insertOrder, findOrderByIdForUser`) to also include `findLatestOrderForPack, confirmOrderAndGrantCredits`:

```ts
import {
  findActiveCouponByCode,
  insertOrder,
  findOrderByIdForUser,
  findLatestOrderForPack,
  confirmOrderAndGrantCredits,
} from './billing.repo.js';
```

2. Add two new imports at the top of the file:

```ts
import { findActiveUserById } from '../users/users.repo.js';
import { logger } from '../../lib/logger.js';
import { verifyGooglePlayPurchase, consumeGooglePlayPurchase } from './google-play-verifier.js';
```

3. Add this function after `confirmPayment`:

```ts
async function getUserCredits(userId: string): Promise<number> {
  const user = await findActiveUserById(userId);
  if (!user) throw Errors.notFound('User not found');
  return user.credits;
}

/**
 * Confirms a Google Play purchase and grants its credits. Deliberately takes
 * no order ID — the client can't reliably remember one across a process
 * kill between purchase and confirm, so this looks up the order itself by
 * (userId, productId). Safe to call more than once for the same purchase
 * (crash-recovery reconciliation replays this on every app start).
 */
export async function confirmGooglePlayPurchase(
  userId: string,
  { purchaseToken, productId }: { purchaseToken: string; productId: string },
): Promise<{ order: OrderRow; credits: number }> {
  const order = await findLatestOrderForPack(userId, productId);
  if (!order) throw Errors.notFound('No matching order found for this purchase');

  if (order.status === 'paid') {
    if (order.gatewayPaymentId === purchaseToken) {
      const credits = await getUserCredits(userId);
      return { order, credits };
    }
    throw Errors.conflict('Order already confirmed with a different purchase');
  }
  if (order.status !== 'pending') {
    throw Errors.conflict(`Order is ${order.status}, not payable`);
  }

  const verified = await verifyGooglePlayPurchase({ productId, purchaseToken });
  if (!verified) throw Errors.badRequest('Purchase is not in a completed state');

  const result = await confirmOrderAndGrantCredits(order.id, userId, purchaseToken);
  if (!result) {
    // Lost a race with a concurrent confirm for the same order — the other
    // call already granted credits. Return the now-paid order instead of
    // erroring, since the purchase genuinely did succeed.
    const nowPaid = await findLatestOrderForPack(userId, productId);
    if (!nowPaid || nowPaid.status !== 'paid') {
      throw Errors.internal('Failed to confirm order');
    }
    const credits = await getUserCredits(userId);
    return { order: nowPaid, credits };
  }

  try {
    await consumeGooglePlayPurchase({ productId, purchaseToken });
  } catch (err) {
    // Credits are already granted — a failed consume is a Play-side
    // bookkeeping issue, not a reason to fail the request.
    logger.warn({ err, purchaseToken, productId }, 'Failed to consume Google Play purchase');
  }

  return result;
}
```

- [ ] **Step 5: Run the test again to verify it passes**

Run: `npx vitest run test/billing-google-play.spec.ts`
Expected: PASS, all 6 tests.

- [ ] **Step 6: Run the full test suite to check nothing else broke**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/modules/billing/billing.repo.ts src/modules/billing/billing.service.ts test/billing-google-play.spec.ts
git commit -m "feat(billing): add confirmGooglePlayPurchase with idempotent replay"
```

---

### Task 5: Route + schema

**Files:**
- Modify: `jyotish-backend/src/modules/billing/billing.schemas.ts`
- Modify: `jyotish-backend/src/modules/billing/billing.routes.ts`

- [ ] **Step 1: Add the request schema**

In `src/modules/billing/billing.schemas.ts`, add after `ConfirmOrderResponseSchema`:

```ts
export const ConfirmGooglePlayBodySchema = z
  .object({
    purchaseToken: z.string().min(1),
    productId: z.string().min(1),
  })
  .openapi('ConfirmGooglePlayBody');
```

- [ ] **Step 2: Add the route**

In `src/modules/billing/billing.routes.ts`:

1. Add `ConfirmGooglePlayBodySchema` to the schema import list (from `./billing.schemas.js`).
2. Add `confirmGooglePlayPurchase` to the import from `./billing.service.js`.
3. Add this route after the existing `confirmRoute`/`billingRouter.openapi(confirmRoute, ...)` block:

```ts
/* -------------------------------------------------------------------------- */
/* POST /billing/confirm-google-play                                          */
/* -------------------------------------------------------------------------- */

const confirmGooglePlayRoute = createRoute({
  method: 'post',
  path: '/billing/confirm-google-play',
  tags: ['Billing'],
  summary: 'Confirm a Google Play purchase and grant its credits',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: ConfirmGooglePlayBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Order confirmed, credits granted',
      content: { 'application/json': { schema: ConfirmOrderResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
    400: errorResponse('Purchase not in a completed state, or product mismatch'),
    404: errorResponse('No matching order found'),
    409: errorResponse('Order already processed in a conflicting state'),
  },
});

billingRouter.openapi(confirmGooglePlayRoute, async (c) => {
  const user = c.get('user');
  const { purchaseToken, productId } = c.req.valid('json');
  const { order, credits } = await confirmGooglePlayPurchase(user.id, { purchaseToken, productId });
  return c.json({ order: toOrderDto(order), credits }, 200);
});
```

- [ ] **Step 3: Verify it compiles and the app boots**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm run dev` briefly (or however this project verifies route wiring — check `npm run build` if there's no quick boot check), then stop it.
Expected: no startup errors, `/v1/billing/confirm-google-play` appears in the OpenAPI doc (check `/doc` or `/swagger` route if the project exposes one).

- [ ] **Step 4: Commit**

```bash
git add src/modules/billing/billing.schemas.ts src/modules/billing/billing.routes.ts
git commit -m "feat(billing): add POST /billing/confirm-google-play route"
```

---

## Part 2 — Mobile native (`mobile/android`)

### Task 6: Play Billing Library dependency + permission

**Files:**
- Modify: `mobile/android/app/build.gradle`
- Modify: `mobile/android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Add the Billing Library dependency**

In `mobile/android/app/build.gradle`, in the `dependencies { ... }` block, add:

```gradle
    implementation "com.android.billingclient:billing:9.0.0"
```

- [ ] **Step 2: Add the Play Store billing permission**

In `mobile/android/app/src/main/AndroidManifest.xml`, add alongside the other `<uses-permission>` entries:

```xml
    <uses-permission android:name="com.android.vending.BILLING" />
```

- [ ] **Step 3: Verify the project still syncs**

Run (from `mobile/`): `cd android && ./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL (the new dependency resolves; nothing references it yet).

- [ ] **Step 4: Commit**

```bash
git add android/app/build.gradle android/app/src/main/AndroidManifest.xml
git commit -m "feat(billing): add Play Billing Library dependency and permission"
```

---

### Task 7: The native purchase plugin

**Files:**
- Create: `mobile/android/app/src/main/java/com/aroha/astrology/PlayBillingPlugin.java`
- Modify: `mobile/android/app/src/main/java/com/aroha/astrology/MainActivity.java`

This is a **local, unpublished** Capacitor plugin — no npm package, registered directly in the native project. It exposes exactly two methods to JS: `purchaseProduct` and `queryUnconsumedPurchases`. Consumption of the purchase happens server-side (Task 3/4); this plugin only launches purchases and reports what Play Billing already knows about.

- [ ] **Step 1: Write the plugin**

Create `mobile/android/app/src/main/java/com/aroha/astrology/PlayBillingPlugin.java`:

```java
package com.aroha.astrology;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    /** The in-flight purchase call, resolved/rejected from onPurchasesUpdated(). */
    private PluginCall pendingPurchaseCall;

    private interface ConnectionCallback {
        void onReady();
    }

    @Override
    protected void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
    }

    private void ensureConnected(ConnectionCallback callback, PluginCall failureCall) {
        if (billingClient.isReady()) {
            callback.onReady();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    callback.onReady();
                } else {
                    failureCall.reject("Billing unavailable: " + result.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // BillingClient reconnects automatically on the next request.
            }
        });
    }

    @PluginMethod
    public void purchaseProduct(final PluginCall call) {
        final String productId = call.getString("productId");
        if (productId == null || productId.isEmpty()) {
            call.reject("productId is required");
            return;
        }
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("No current activity");
            return;
        }

        ensureConnected(() -> {
            QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(product))
                .build();

            billingClient.queryProductDetailsAsync(params, (result, productDetailsList) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to load product: " + result.getDebugMessage());
                    return;
                }
                if (productDetailsList.isEmpty()) {
                    call.reject("Unknown product: " + productId);
                    return;
                }
                ProductDetails details = productDetailsList.get(0);

                BillingFlowParams.ProductDetailsParams productDetailsParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .build();
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(productDetailsParams))
                    .build();

                pendingPurchaseCall = call;
                billingClient.launchBillingFlow(activity, flowParams);
            });
        }, call);
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        if (call == null) return;

        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            call.reject("Purchase failed: " + result.getDebugMessage(), String.valueOf(result.getResponseCode()));
            return;
        }
        if (purchases == null || purchases.isEmpty()) {
            call.reject("Purchase completed with no purchase data");
            return;
        }
        call.resolve(purchaseToJSObject(purchases.get(0)));
    }

    @PluginMethod
    public void queryUnconsumedPurchases(final PluginCall call) {
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            billingClient.queryPurchasesAsync(params, (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query purchases: " + result.getDebugMessage());
                    return;
                }
                JSArray array = new JSArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                        array.put(purchaseToJSObject(purchase));
                    }
                }
                JSObject ret = new JSObject();
                ret.put("purchases", array);
                call.resolve(ret);
            });
        }, call);
    }

    private JSObject purchaseToJSObject(Purchase purchase) {
        JSObject obj = new JSObject();
        List<String> products = purchase.getProducts();
        obj.put("productId", products.isEmpty() ? "" : products.get(0));
        obj.put("purchaseToken", purchase.getPurchaseToken());
        obj.put("orderId", purchase.getOrderId() == null ? "" : purchase.getOrderId());
        return obj;
    }
}
```

- [ ] **Step 2: Register the plugin in `MainActivity`**

Replace the contents of `mobile/android/app/src/main/java/com/aroha/astrology/MainActivity.java`:

```java
package com.aroha.astrology;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 3: Verify it compiles**

Run (from `mobile/android`): `./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL. (Full purchase-flow behavior can only be verified on a real device against a Play Console internal testing track — see Task 9's manual QA note.)

- [ ] **Step 4: Commit**

```bash
git add app/src/main/java/com/aroha/astrology/PlayBillingPlugin.java app/src/main/java/com/aroha/astrology/MainActivity.java
git commit -m "feat(billing): add local PlayBilling Capacitor plugin"
```

---

## Part 3 — Frontend (`frontend`, shared by web and the app's webview)

### Task 8: JS plugin wrapper

**Files:**
- Create: `frontend/lib/play-billing.ts`

- [ ] **Step 1: Write the wrapper**

Create `frontend/lib/play-billing.ts`:

```ts
import { registerPlugin } from "@capacitor/core";

export interface PlayBillingPurchase {
  productId: string;
  purchaseToken: string;
  orderId: string;
}

interface PlayBillingPluginInterface {
  purchaseProduct(options: { productId: string }): Promise<PlayBillingPurchase>;
  queryUnconsumedPurchases(): Promise<{ purchases: PlayBillingPurchase[] }>;
}

/**
 * Local native plugin registered in mobile/android's MainActivity — not an
 * npm package. Only usable when Capacitor.isNativePlatform() is true.
 */
export const PlayBilling = registerPlugin<PlayBillingPluginInterface>("PlayBilling");
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npm run typecheck` (or `pnpm typecheck`, matching this project's package manager)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/play-billing.ts
git commit -m "feat(billing): add PlayBilling plugin wrapper"
```

---

### Task 9: API client + payment page wiring

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/app/payment/page.tsx`

- [ ] **Step 1: Add the API call**

In `frontend/lib/api.ts`, add after `confirmOrder` (inside the `api` object, before the closing `};`):

```ts
  /** Confirm a Google Play purchase (Android app only) and grant its credits. */
  confirmGooglePlayOrder: (params: { purchaseToken: string; productId: string }) =>
    request<{ order: Order; credits: number }>("/v1/billing/confirm-google-play", {
      method: "POST",
      body: params,
      auth: true,
    }),
```

- [ ] **Step 2: Branch `handlePay` on platform**

In `frontend/app/payment/page.tsx`, replace the `handlePay` function:

```tsx
  async function handlePay() {
    if (!selectedPack) return;
    setPaying(true);
    setPayError(null);
    try {
      const order = await api.checkout(selectedPack.id, couponApplied ? couponResult?.code : undefined);

      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        const { PlayBilling } = await import("@/lib/play-billing");
        const purchase = await PlayBilling.purchaseProduct({ productId: selectedPack.id });
        await api.confirmGooglePlayOrder({
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
        });
      } else {
        await api.confirmOrder(order.id);
      }

      await refreshUser();
      setSuccess({ credits: selectedPack.credits });
    } catch (err) {
      setPayError(
        err instanceof ApiError && err.status === 403 ? t("payment.notLiveYet") : t("payment.genericError"),
      );
    } finally {
      setPaying(false);
    }
  }
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification (this cannot be unit-tested — no test harness exists for this file, and Play Billing requires a real device)**

Run the app in a browser (`npm run dev`, visit `/payment`): confirm the page still renders and clicking "Pay" still shows "not live yet" (the non-native branch is unchanged behavior).

Full native purchase flow verification happens in Task 11 once the reconciler is in place, against a signed build on a real device via Play Console's internal testing track (requires the 4 in-app products from the spec's Play Console setup step to exist).

- [ ] **Step 5: Commit**

```bash
git add lib/api.ts app/payment/page.tsx
git commit -m "feat(billing): wire Android Play Billing purchase flow into payment page"
```

---

### Task 10: Crash-recovery reconciler

**Files:**
- Create: `frontend/components/GooglePlayPurchaseReconciler.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/components/GooglePlayPurchaseReconciler.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";

/**
 * On every native-Android app start, replays confirmation for any Play
 * Billing purchase Google still has recorded as unconsumed — covers the app
 * being killed after Google charges the user but before the confirm call
 * reached the backend. No local persistence needed: confirmGooglePlayOrder
 * looks up the order by (userId, productId), and is idempotent, so replaying
 * an already-granted purchase is always a safe no-op.
 */
export default function GooglePlayPurchaseReconciler() {
  const { user, refresh: refreshUser } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

        const { PlayBilling } = await import("@/lib/play-billing");
        const { purchases } = await PlayBilling.queryUnconsumedPurchases();
        if (cancelled || purchases.length === 0) return;

        let grantedAny = false;
        for (const purchase of purchases) {
          try {
            await api.confirmGooglePlayOrder({
              purchaseToken: purchase.purchaseToken,
              productId: purchase.productId,
            });
            grantedAny = true;
          } catch (err) {
            console.error("[GooglePlayPurchaseReconciler] confirm failed", err);
          }
        }
        if (grantedAny && !cancelled) await refreshUser();
      } catch (err) {
        // @capacitor/core or the plugin not resolvable (e.g. plain web build) — nothing to reconcile.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshUser]);

  return null;
}
```

- [ ] **Step 2: Mount it in the root layout**

In `frontend/app/layout.tsx`:

1. Add the import alongside the other one-time global components:

```tsx
import GooglePlayPurchaseReconciler from "@/components/GooglePlayPurchaseReconciler";
```

2. Mount it alongside `PushNotificationListener`:

```tsx
                    <BackButtonListener />
                    <PushNotificationListener />
                    <GooglePlayPurchaseReconciler />
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification in browser**

Run: `npm run dev`, load any page.
Expected: no console errors — the component should silently no-op on web (the `Capacitor.isNativePlatform()` check returns false, or the dynamic import throws and is caught).

- [ ] **Step 5: Commit**

```bash
git add components/GooglePlayPurchaseReconciler.tsx app/layout.tsx
git commit -m "feat(billing): reconcile unconsumed Google Play purchases on app start"
```

---

## Part 4 — Manual setup + end-to-end verification

### Task 11: Play Console products + real-device QA

Not automatable — requires your Play Console access.

- [ ] **Step 1:** Create the 4 consumable in-app products in Play Console (Monetize → Products → In-app products): `starter`, `popular`, `value`, `mega`, priced per `CREDIT_PACKS` in `billing.service.ts`.
- [ ] **Step 2:** Set `GOOGLE_PLAY_SERVICE_ACCOUNT_PATH` (or the PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY triple) in the backend's real environment, using the service account from the spec's setup section.
- [ ] **Step 3:** Build a signed release AAB (`cd mobile/android && ./gradlew bundleRelease`) and upload it to Play Console's **internal testing track** — test purchases don't work against a locally built debug APK.
- [ ] **Step 4:** Add your own Google account as a license tester (Play Console → Setup → License testing) so test purchases don't charge real money.
- [ ] **Step 5:** From the internal-testing build on a real device: buy a pack, confirm credits appear. Force-kill the app immediately after the Play purchase dialog confirms (before the app can call confirm) and relaunch — confirm the reconciler still grants the credits on next launch.

---

## Self-Review Notes

- **Spec coverage:** Play Console/service-account setup (Task 11, manual), backend verify+consume+idempotent-replay (Tasks 1-5), native plugin (Tasks 6-7), payment page branch (Task 9), crash recovery via reconciler (Task 10) — all spec sections have a task.
- **Deviation from the original spec, already reconciled:** the spec was updated mid-planning (see git history on the spec file) to drop `@capgo/capacitor-native-purchases` for a local plugin, and to drop the order-ID-in-URL route for a `(userId, productId)` lookup — this plan matches the current spec, not the original.
- **Out of scope, unchanged:** web checkout (Razorpay/Stripe) and iOS StoreKit remain future work; the generic `POST /billing/orders/{id}/confirm` route is untouched.
