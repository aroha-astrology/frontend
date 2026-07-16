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
confirmGooglePlayPurchase(orderId, userId, { purchaseToken, productId })
```

Flow: load the pending order for `orderId`/`userId` (`findOrderByIdForUser`)
→ reject if `productId !== order.packId` → call Google to verify the token
→ call the **existing** `confirmOrderAndGrantCredits(orderId, userId,
purchaseToken)` (grants credits, appends ledger row, marks order paid,
already safe to call twice) → consume the purchase on Google's side.

New route in `billing.routes.ts`:

```
POST /billing/orders/{id}/confirm-google-play
body: { purchaseToken: string, productId: string }
```

The existing generic `POST /billing/orders/{id}/confirm` is untouched — it
stays reserved for a future web gateway.

### 3. Mobile app + shared frontend

- Add a Capacitor Play Billing plugin — `@capgo/capacitor-native-purchases`
  (Play Billing Library 7.x; exact version pinned against this project's
  Capacitor 6 during implementation) — to `mobile/android` (native side) and
  as a `frontend` dependency, mirroring the existing
  `@capacitor-firebase/messaging` pattern exactly: `Capacitor.isNativePlatform()`
  gate, dynamic `import()` (see `frontend/components/PermissionsPrompt.tsx`).
  This works because Capacitor's JS bridge is injected into the webview even
  though it's loading the remote Vercel URL, not bundled local files —
  already proven by how push-notification permissions work today.
- `frontend/app/payment/page.tsx`'s `handlePay` branches on platform:
  - **Native Android**: `api.checkout()` creates the pending order (unchanged
    call) → launch the native purchase flow for `selectedPack.id` as the
    product ID → on success, call the new
    `api.confirmGooglePlayOrder(order.id, { purchaseToken, productId })`.
  - **Web/browser**: unchanged — still shows the existing "not live yet"
    error, since web payments are out of scope this round.
- **Crash/interruption recovery**: if the app is killed after Google charges
  the user but before the confirm call reaches the backend, credits would be
  stuck un-granted. On app start (native Android only), query Play Billing's
  native list of unconsumed purchases and retry the confirm-google-play call
  for any purchase token that doesn't have a matching locally-cleared
  record (tracked via Capacitor Preferences, cleared only after a successful
  confirm response). This is the one genuinely tricky edge case in the
  feature and gets its own test coverage in the implementation plan.

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
