# Android Google Play Billing for credit packs

## Problem

`POST /billing/orders/{id}/confirm` (`jyotish-backend/src/modules/billing/billing.routes.ts`)
unconditionally refuses every order — no payment gateway has ever been wired
up, so nobody can currently buy credits at all, on web or in the app. The
credit-pack catalog (`CREDIT_PACKS` in `billing.service.ts`), the `orders`
table, and `confirmOrderAndGrantCredits` (`billing.repo.ts`) already exist
and are ready to be driven by a real gateway — the repo function is already
atomic and idempotent (its `status = 'pending'` guard makes a retried call a
safe no-op).

The mobile app (`mobile/`) is a thin Capacitor shell that loads the deployed
`frontend` app in a webview — `frontend/app/payment/page.tsx` is the same
page rendered both on the website and inside the Android app. Google Play
policy requires that digital goods (these credits) purchased *through an app
distributed via Play* go through Google Play's own billing system — a
Razorpay-style web checkout inside the app risks the listing being rejected
or suspended. The website (accessed via a browser, not through the Play
Store app) is not bound by that rule.

This round wires up **Google Play Billing for the Android app only**. Web
checkout (Razorpay/Stripe) and iOS (StoreKit + App Store Server API) are
explicitly deferred to their own future rounds; this design keeps the
backend shape (one gateway-specific confirm endpoint per payment method,
sharing the same `orders` table and `confirmOrderAndGrantCredits`) so adding
either later doesn't require reshaping anything built here.

## Design

### 1. Play Console & Google Cloud setup (manual, no code)

- Create 4 **consumable, managed** in-app products in Play Console →
  Monetize → Products, with IDs matching the existing pack IDs exactly:
  `starter`, `popular`, `value`, `mega`, priced to match `priceInPaise` in
  `CREDIT_PACKS` (₹49 / ₹149 / ₹349 / ₹699).
- Create a Google Cloud service account; in Play Console → Users and
  permissions, grant it **Finance → View financial data** (minimum scope
  needed to read purchase state via the Android Publisher API). Download its
  JSON key.
- The JSON key is a backend-only secret, same tier as DB credentials — env
  var `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (or a mounted file path, matching
  however other backend secrets are supplied in this environment). It must
  never appear in `frontend/` or `mobile/`.

### 2. Backend (`jyotish-backend`)

New dependency: `googleapis` (official Google API Node client), used to call
the Android Publisher API:

- `purchases.products.get` — verify a purchase token is genuinely a
  `purchased` (not `cancelled`/`pending`) purchase of the given product ID,
  for this app's package name.
- `purchases.products.consume` — mark the consumable as spent so the same
  pack can be bought again. Calling `consume` on an already-consumed token
  returns a documented error; the service catches that specific error and
  treats it as success (idempotency).

New function in `billing.service.ts`:

```
confirmGooglePlayPurchase(userId, { purchaseToken, productId })
```

Deliberately takes no order ID — see "Crash/interruption recovery" below for
why. Flow: look up the most recent order for `(userId, packId = productId)`
(new repo function `findLatestOrderForPack`, any status) → if none exists,
404 → if its status is `'pending'`, verify the token with Google, call the
**existing** `confirmOrderAndGrantCredits(order.id, userId, purchaseToken)`
(grants credits, appends ledger row, marks order paid, already safe to call
twice), then consume the purchase on Google's side → if its status is
already `'paid'` with a matching `gatewayPaymentId`, this is a safe replay
(e.g. a retried reconciliation call): return the existing result without
calling Google again → any other state (`'paid'` with a different token,
`'failed'`, `'cancelled'`) is a genuine conflict.

New route in `billing.routes.ts`:

```
POST /billing/confirm-google-play
body: { purchaseToken: string, productId: string }
```

The existing generic `POST /billing/orders/{id}/confirm` is untouched — it
stays reserved for a future web gateway.

### 3. Mobile app + shared frontend

- No maintained, vendor-neutral Capacitor plugin exposes a real Android
  purchase token on Capacitor 6 (checked during planning — the natural
  candidate, `@capgo/native-purchases`, turned out to be a thin RevenueCat
  wrapper whose `Transaction` type on this major version is just a bare
  `transactionId`). Instead: a small **local, unpublished Capacitor plugin**
  (`PlayBillingPlugin`, Java, registered directly in `MainActivity` — no npm
  package) wrapping Google's official Play Billing Library
  (`com.android.billingclient:billing`) directly, exposing exactly two
  methods: `purchaseProduct({ productId })` (launches the purchase flow,
  resolves with `{ productId, purchaseToken, orderId }`) and
  `queryUnconsumedPurchases()` (lists `PURCHASED`-state in-app purchases
  Play still has pending consumption). A matching `frontend/lib/play-billing.ts`
  wraps it via `@capacitor/core`'s `registerPlugin`, called only behind
  `Capacitor.isNativePlatform()` — same gating pattern as
  `@capacitor-firebase/messaging` (see `frontend/components/PermissionsPrompt.tsx`).
- `frontend/app/payment/page.tsx`'s `handlePay` branches on platform:
  - **Native Android**: `api.checkout()` creates the pending order (unchanged
    call, still needed so a record exists to grant credits against) → launch
    the native purchase flow for `selectedPack.id` as the product ID → on
    success, call the new
    `api.confirmGooglePlayOrder({ purchaseToken, productId })` — no order ID
    passed; the backend finds the matching order itself (see above).
  - **Web/browser**: unchanged — still shows the existing "not live yet"
    error, since web payments are out of scope this round.
- **Crash/interruption recovery**: if the app is killed after Google charges
  the user but before the confirm call reaches the backend, credits would be
  stuck un-granted. Because the backend looks up the order by `(userId,
  productId)` rather than requiring a client-remembered order ID, recovery
  needs no local persistence: a new component mounted once at app root
  (alongside `PushNotificationListener` in `app/layout.tsx`), native-Android-only,
  calls `queryUnconsumedPurchases()` on mount and replays
  `confirmGooglePlayOrder` for each result. Safe to run on every app start —
  the idempotent-replay branch above makes a no-op of purchases already
  granted.

### 4. Testing

- Backend: unit tests for `confirmGooglePlayPurchase` against a mocked
  Android Publisher client — success, wrong product ID, invalid/expired
  token, and the already-consumed replay case.
- Play Billing itself can't be exercised without a real signed build and a
  Play Console **internal testing track** (test purchases don't work against
  a locally-built debug APK) — manual QA against that track is called out as
  a required step in the implementation plan, not something automatable
  here.

### Out of scope

Web checkout (Razorpay/Stripe) and iOS (StoreKit + App Store Server API) —
each becomes its own future design, reusing `orders` and
`confirmOrderAndGrantCredits` unchanged.
