import { test, expect, type Page } from "@playwright/test";
import { callsTo, mockApi, passStatus, PASS_OFFERS } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// The Aroha Pass on the website (Razorpay Subscriptions, money.razorpayPass), on an iPhone
// (App Store, money.storekit) and the Platinum free report (money.platinumReport). Every switch is
// off by default, so the first test pins that the page is unchanged while the server sends no
// `web` / `appStore` on an offer.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PASS_ON = {
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};

const withWeb = PASS_OFFERS.map((o) => ({
  ...o,
  web:
    o.tier === "gold"
      ? { currency: "USD", amountMinor: 499 }
      : { currency: "INR", amountMinor: o.pricePaise },
}));
const withApple = PASS_OFFERS.map((o) => ({ ...o, appStore: { productId: `aroha_pass_${o.tier}` } }));

const gold = PASS_OFFERS.find((o) => o.tier === "gold")!;
const platinum = PASS_OFFERS.find((o) => o.tier === "platinum")!;
const activePass = (offer: typeof gold, over: Record<string, unknown> = {}) => ({
  tier: offer.tier,
  source: "razorpay",
  variant: offer.variant,
  pricePaise: offer.pricePaise,
  periodEnd: "2026-11-24T06:30:00.000Z",
  autoRenew: true,
  questionsLeft: 18,
  questionsPerPeriod: offer.questionsPerPeriod,
  voiceFreeMinutes: offer.voiceFreeMinutes,
  reportDiscountPct: offer.reportDiscountPct,
  features: offer.features,
  ...over,
});

/** Stand-in for checkout.js: "pays" the subscription the moment it is opened. */
async function fakeRazorpaySubscriptionCheckout(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { Razorpay: unknown }).Razorpay = function (opts: {
      subscription_id: string;
      handler: (r: object) => void;
    }) {
      return {
        on: () => {},
        open: () =>
          opts.handler({
            razorpay_payment_id: "pay_e2e",
            razorpay_subscription_id: opts.subscription_id,
            razorpay_signature: "sig_e2e",
          }),
      };
    };
  });
}

/** Makes the page believe it runs inside the iPhone app, with StoreKit answering like the App Store. */
async function asIPhone(page: Page, opts: { cancel?: boolean } = {}) {
  await page.addInitScript((cancel) => {
    const w = window as unknown as Record<string, unknown>;
    const calls: Array<{ plugin: string; method: string; options: Record<string, unknown> }> = [];
    w.__nativeCalls = calls;
    w.webkit = { messageHandlers: { bridge: { postMessage: () => {} } } };
    w.Capacitor = {
      PluginHeaders: [
        {
          name: "AppStore",
          methods: ["purchase", "currentSubscriptions", "unfinished", "finish", "prices"].map((name) => ({ name, rtype: "promise" })),
        },
      ],
      nativePromise: (plugin: string, method: string, options: Record<string, unknown>) => {
        calls.push({ plugin, method, options });
        if (plugin === "AppStore" && method === "purchase") {
          if (cancel) return Promise.reject(Object.assign(new Error("cancelled"), { code: "cancelled" }));
          return Promise.resolve({ productId: options.productId, signedTransaction: "jws-e2e", state: "purchased" });
        }
        if (plugin === "AppStore" && method === "prices") {
          return Promise.resolve({ prices: [{ productId: "aroha_pass_gold", displayPrice: "$4.99" }] });
        }
        if (plugin === "AppStore" && method === "currentSubscriptions") return Promise.resolve({ purchases: [] });
        return Promise.resolve({});
      },
      nativeCallback: () => "e2e",
    };
  }, opts.cancel === true);
}

test.describe("Aroha Pass on the website", () => {
  test("switch off: the page is unchanged (Android-only notice, no subscribe button)", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-android-only")).toBeVisible();
    await expect(page.getByText("Subscribe on the website")).toHaveCount(0);
    await expect(page.getByTestId("pass-web-note")).toHaveCount(0);
  });

  test("with web plans: a subscribe button per tier, the website's own price, and a note", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ offers: withWeb }) }) },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-web-buy-silver")).toBeVisible();
    await expect(page.getByTestId("pass-web-buy-gold")).toBeVisible();
    await expect(page.getByTestId("pass-tier-gold")).toContainText("$4.99");
    await expect(page.getByTestId("pass-tier-silver")).toContainText("₹199");
    await expect(page.getByTestId("pass-web-note")).toContainText("Cancel any time on this page");
    await expect(page.getByTestId("pass-android-only")).toHaveCount(0);
  });

  test("subscribing opens Checkout, verifies the signature and shows the active Pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    await fakeRazorpaySubscriptionCheckout(page);
    let bought = false;
    const api = await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: bought ? passStatus({ offers: withWeb, pass: activePass(gold) }) : passStatus({ offers: withWeb }),
        }),
        "POST /v1/pass/razorpay/subscribe": () => ({
          json: { subscriptionId: "sub_e2e", keyId: "rzp_test_e2e", tier: "gold", currency: "USD", amountMinor: 499 },
        }),
        "POST /v1/pass/razorpay/verify": () => {
          bought = true;
          return { json: passStatus({ offers: withWeb, pass: activePass(gold) }) };
        },
      },
    });
    await signIn(page, "/pass");
    await page.getByTestId("pass-web-buy-gold").click();

    await expect(page.getByTestId("pass-active")).toContainText("Your Aroha Pass Gold is active");
    await expect(page.getByTestId("pass-active")).toContainText("Bought on the website");
    expect(callsTo(api, "POST /v1/pass/razorpay/subscribe")[0]!.body).toEqual({ tier: "gold", currency: "USD" });
    expect(callsTo(api, "POST /v1/pass/razorpay/verify")[0]!.body).toEqual({
      razorpayPaymentId: "pay_e2e",
      razorpaySubscriptionId: "sub_e2e",
      razorpaySignature: "sig_e2e",
    });
  });

  test("closing Checkout without paying is not an error and records nothing", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => {
      (window as unknown as { Razorpay: unknown }).Razorpay = function (opts: { modal: { ondismiss: () => void } }) {
        return { on: () => {}, open: () => opts.modal.ondismiss() };
      };
    });
    const api = await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus({ offers: withWeb }) }),
        "POST /v1/pass/razorpay/subscribe": () => ({
          json: { subscriptionId: "sub_e2e", keyId: "rzp_test_e2e", tier: "gold", currency: "USD", amountMinor: 499 },
        }),
      },
    });
    await signIn(page, "/pass");
    await page.getByTestId("pass-web-buy-gold").click();
    await expect(page.getByTestId("pass-web-buy-gold")).toBeEnabled();
    await expect(page.getByTestId("pass-action-message")).toHaveCount(0);
    expect(callsTo(api, "POST /v1/pass/razorpay/verify")).toHaveLength(0);
  });

  test("a web Pass can stop renewing after a confirm, and then says when it ends", async ({ page }) => {
    await skipLaunchOverlays(page);
    page.on("dialog", (d) => void d.accept());
    let cancelled = false;
    const api = await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({ offers: withWeb, pass: activePass(gold, { autoRenew: !cancelled }) }),
        }),
        "POST /v1/pass/razorpay/cancel": () => {
          cancelled = true;
          return { json: passStatus({ offers: withWeb, pass: activePass(gold, { autoRenew: false }) }) };
        },
      },
    });
    await signIn(page, "/pass");
    await page.getByTestId("pass-web-cancel").click();
    await expect(page.getByTestId("pass-active")).toContainText("Renewal is off");
    await expect(page.getByTestId("pass-web-cancel")).toHaveCount(0);
    expect(callsTo(api, "POST /v1/pass/razorpay/cancel")).toHaveLength(1);
  });
});

test.describe("Aroha Pass on an iPhone", () => {
  test("with App Store products: Apple's price, a subscribe button, restore, and the signed transaction goes to the server", async ({ page }) => {
    await skipLaunchOverlays(page);
    await asIPhone(page);
    let bought = false;
    const api = await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: bought
            ? passStatus({ offers: withApple, pass: activePass(gold, { source: "app_store" }) })
            : passStatus({ offers: withApple }),
        }),
        "POST /v1/pass/app-store": () => {
          bought = true;
          return { json: passStatus({ offers: withApple, pass: activePass(gold, { source: "app_store" }) }) };
        },
      },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-tier-gold")).toContainText("$4.99");
    await expect(page.getByTestId("pass-apple-note")).toContainText("Apple ID");
    await expect(page.getByTestId("pass-web-note")).toHaveCount(0);
    await page.getByTestId("pass-apple-buy-gold").click();

    await expect(page.getByTestId("pass-active")).toContainText("Bought on the App Store");
    expect(callsTo(api, "POST /v1/pass/app-store")[0]!.body).toEqual({ signedTransaction: "jws-e2e" });
    const native = await page.evaluate(
      () => (window as unknown as { __nativeCalls: Array<{ method: string; options: Record<string, unknown> }> }).__nativeCalls,
    );
    const purchase = native.find((c) => c.method === "purchase")!;
    expect(purchase.options.productId).toBe("aroha_pass_gold");
    // Apple is told whose purchase it is: the account's own id.
    expect(purchase.options.appAccountToken).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
  });

  test("backing out of the App Store sheet shows no error and records nothing", async ({ page }) => {
    await skipLaunchOverlays(page);
    await asIPhone(page, { cancel: true });
    const api = await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ offers: withApple }) }) },
    });
    await signIn(page, "/pass");
    await page.getByTestId("pass-apple-buy-gold").click();
    await expect(page.getByTestId("pass-apple-buy-gold")).toBeEnabled();
    await expect(page.getByTestId("pass-action-message")).toHaveCount(0);
    expect(callsTo(api, "POST /v1/pass/app-store")).toHaveLength(0);
  });

  test("without App Store products the old iPhone notice stays", async ({ page }) => {
    await skipLaunchOverlays(page);
    await asIPhone(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");
    await expect(page.getByText(/coming to iPhone|isn't available on iPhone|iPhone/i).first()).toBeVisible();
    await expect(page.getByTestId("pass-apple-buy-gold")).toHaveCount(0);
  });
});

test.describe("Platinum free report", () => {
  const platinumOffer = { ...platinum, freeReportsPerPeriod: 1 };

  test("an unused free report is announced on the Pass and in the benefits", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({
            offers: [platinumOffer],
            pass: activePass(platinumOffer, { source: "google_play", freeReportsPerPeriod: 1 }),
            freeReportAvailable: true,
          }),
        }),
      },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-free-report")).toContainText("Pick any single report and it costs nothing");
    await expect(page.getByTestId("pass-included")).toContainText("One report free every 30 days");
  });

  test("a used one says when the next comes", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({
            offers: [platinumOffer],
            pass: activePass(platinumOffer, { source: "google_play", freeReportsPerPeriod: 1 }),
            freeReportAvailable: false,
          }),
        }),
      },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-free-report")).toContainText("used this period's free report");
  });

  test("switch off: no free-report line anywhere", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({ pass: activePass(platinum, { source: "google_play" }) }),
        }),
      },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-free-report")).toHaveCount(0);
    await expect(page.getByTestId("pass-included")).not.toContainText("One report free");
  });
});
