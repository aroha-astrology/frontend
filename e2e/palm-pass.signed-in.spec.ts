import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_OFFERS } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Owner, 2026-10-24: the full palm reading is open to everyone at the normal price (Rs 199, from the
// wallet); an Aroha Pass member gets one free per period; an admin group is never limited. The scan
// stays free. Question Packs are bought through Google Play, never from the wallet.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PASS_ON = {
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};
const READING = "11111111-1111-4111-8111-111111111111";

function silverPass() {
  const offer = PASS_OFFERS[0]!;
  return {
    tier: "silver",
    source: "google_play",
    variant: offer.variant,
    pricePaise: offer.pricePaise,
    periodEnd: "2026-11-05T06:30:00.000Z",
    autoRenew: true,
    questionsLeft: 15,
    questionsPerPeriod: offer.questionsPerPeriod,
    reportDiscountPct: offer.reportDiscountPct,
    features: offer.features,
  };
}

function observedReading(allowance: { passMember: boolean; left: number; pricePaise: number; unlimited?: boolean } | undefined) {
  return {
    id: READING,
    status: "observed",
    primaryHand: "right",
    frames: {},
    unlocked: false,
    confidenceScore: 85,
    observations: { primary: { handType: { element: "Earth" }, imageQuality: { lineVisibility: 8 }, majorLines: {} } },
    events: [],
    ...(allowance ? { allowance } : {}),
  };
}

async function openTeaser(page: Page) {
  // A low wallet would otherwise raise the "share the app" prompt over the page.
  await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
  await signIn(page, `/palm/${READING}`);
  await page.getByRole("button", { name: "Unlock Full Reading" }).click();
}

/**
 * Makes the page believe it runs inside the Android app: Capacitor treats a window with
 * `androidBridge` as Android and sends a plugin call with a header to `Capacitor.nativePromise`.
 * PlayBilling answers like Google Play; `cancel` makes the user back out of the sheet.
 */
async function asAndroid(page: Page, opts: { cancel?: boolean } = {}) {
  await page.addInitScript((cancel) => {
    const w = window as unknown as Record<string, unknown>;
    const calls: Array<{ plugin: string; method: string; options: Record<string, unknown> }> = [];
    w.__nativeCalls = calls;
    w.androidBridge = { postMessage: () => {} };
    w.Capacitor = {
      PluginHeaders: [
        {
          name: "PlayBilling",
          methods: [
            { name: "purchaseProduct", rtype: "promise" },
            { name: "queryUnconsumedPurchases", rtype: "promise" },
            { name: "queryActiveSubscriptions", rtype: "promise" },
          ],
        },
        { name: "App", methods: [{ name: "getInfo", rtype: "promise" }] },
      ],
      nativePromise: (plugin: string, method: string, options: Record<string, unknown>) => {
        calls.push({ plugin, method, options });
        if (plugin === "PlayBilling" && method === "purchaseProduct") {
          if (cancel) return Promise.reject(Object.assign(new Error("User cancelled"), { code: "1" }));
          return Promise.resolve({ productId: options.productId, purchaseToken: "play-token-1", orderId: "GPA.1" });
        }
        if (plugin === "PlayBilling") return Promise.resolve({ purchases: [] });
        if (plugin === "App") return Promise.resolve({ build: "18", version: "1.15", id: "com.aroha.astrology", name: "Aroha" });
        return Promise.resolve({});
      },
      nativeCallback: () => "e2e",
    };
  }, opts.cancel === true);
}

test.describe("Palm Reading on the Aroha Pass", () => {
  test("without a Pass anyone can unlock for Rs 199 from the wallet, and is told about the Pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({ json: observedReading({ passMember: false, left: 0, pricePaise: 19900 }) }),
        "POST /v1/palm/readings/:id/unlock": () => ({ json: { status: "generating" } }),
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await openTeaser(page);

    // The price, not a lock.
    await expect(page.getByTestId("pass-lock")).toHaveCount(0);
    await expect(page.getByTestId("palm-paid-unlock")).toHaveText(/Unlock · ₹199/);
    // One friendly line about the Pass, with its free monthly reading and a way to see it.
    const nudge = page.getByTestId("palm-pass-nudge");
    await expect(nudge).toContainText("Why pay each time?");
    await expect(nudge).toContainText("one palm reading free every month");
    await expect(page.getByTestId("palm-pass-nudge-cta")).toHaveAttribute("href", "/pass?tier=silver");

    await page.getByTestId("palm-paid-unlock").click();
    await expect(page.getByText("Spend ₹199 to unlock your full reading?")).toBeVisible();
    await page.getByTestId("palm-confirm-yes").click();
    await expect.poll(() => callsTo(api, `POST /v1/palm/readings/${READING}/unlock`).length).toBe(1);
  });

  test("a short wallet is sent to add credits, never charged, and the Pass line still shows", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 5_000 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({ json: observedReading({ passMember: false, left: 0, pricePaise: 19900 }) }),
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await openTeaser(page);
    await expect(page.getByTestId("palm-get-credits")).toHaveAttribute("href", "/payment");
    await expect(page.getByTestId("palm-paid-unlock")).toHaveCount(0);
    await expect(page.getByTestId("palm-pass-nudge")).toBeVisible();
    expect(callsTo(api, `POST /v1/palm/readings/${READING}/unlock`)).toHaveLength(0);
  });

  test("with the Pass switched off there is no Pass line, just the price", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "home.palmReading": ON }, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({ json: observedReading({ passMember: false, left: 0, pricePaise: 19900 }) }),
      },
    });
    await openTeaser(page);
    await expect(page.getByTestId("palm-paid-unlock")).toBeVisible();
    await expect(page.getByTestId("palm-pass-nudge")).toHaveCount(0);
  });

  test("a member unlocks this period's reading with the Pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    let unlocked = false;
    const api = await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 0 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({
          json: unlocked ? { ...observedReading(undefined), status: "generating" } : observedReading({ passMember: true, left: 1, pricePaise: 19900 }),
        }),
        "POST /v1/palm/readings/:id/unlock": () => {
          unlocked = true;
          return { json: { status: "generating" } };
        },
        "GET /v1/pass": () => ({ json: passStatus({ pass: silverPass() }) }),
      },
    });
    await openTeaser(page);

    await expect(page.getByText("Included in Aroha Pass")).toBeVisible();
    await expect(page.getByText("Your Aroha Pass includes one full palm reading every 30 days.")).toBeVisible();
    await page.getByTestId("palm-pass-unlock").click();
    await expect(page.getByText("Use this period's palm reading on this scan?")).toBeVisible();
    await page.getByRole("button", { name: "Yes, Unlock" }).click();
    await expect.poll(() => callsTo(api, `POST /v1/palm/readings/${READING}/unlock`).length).toBe(1);
  });

  test("a member who used this month's free reading is told when the next free one opens, and can buy another", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({ json: observedReading({ passMember: true, left: 0, pricePaise: 19900 }) }),
        "GET /v1/pass": () => ({ json: passStatus({ pass: silverPass() }) }),
      },
    });
    await openTeaser(page);

    await expect(page.getByTestId("palm-pass-used")).toHaveText(
      /You've used this month's free palm reading; your next free one opens on (Nov 5|5 Nov)\. Another one now is ₹199\./,
    );
    await expect(page.getByTestId("palm-pass-unlock")).toHaveCount(0);
    // They already have the Pass: no Pass line, but the paid unlock is there.
    await expect(page.getByTestId("palm-pass-nudge")).toHaveCount(0);
    await expect(page.getByTestId("palm-paid-unlock")).toHaveText(/Unlock · ₹199/);
    expect(callsTo(api, `POST /v1/palm/readings/${READING}/unlock`)).toHaveLength(0);
  });

  test("an admin group member sees it free and unlimited", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 0 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({
          json: observedReading({ passMember: true, left: 0, pricePaise: 19900, unlimited: true }),
        }),
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await openTeaser(page);
    await expect(page.getByText("Free for you, no limit")).toBeVisible();
    await expect(page.getByTestId("palm-pass-unlock")).toBeVisible();
    await expect(page.getByTestId("palm-pass-nudge")).toHaveCount(0);
    await expect(page.getByTestId("palm-pass-used")).toHaveCount(0);
  });

  test("if a free unlock turns out to be charged and the wallet is short, the drawer says so", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON }, walletBalancePaise: 0 },
      overrides: {
        "GET /v1/palm/readings/:id": () => ({ json: observedReading({ passMember: true, left: 1, pricePaise: 19900 }) }),
        "POST /v1/palm/readings/:id/unlock": () => ({
          status: 409,
          json: { error: { code: "CONFLICT", message: "INSUFFICIENT_CREDITS" } },
        }),
        "GET /v1/pass": () => ({ json: passStatus({ pass: silverPass() }) }),
      },
    });
    await openTeaser(page);
    await page.getByTestId("palm-pass-unlock").click();
    await page.getByTestId("palm-confirm-yes").click();
    await expect(page.getByText("You need ₹199 but have ₹0.")).toBeVisible();
  });

  test("every Pass tier lists the palm reading", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, "home.palmReading": ON } },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");
    for (const tier of ["silver", "gold", "platinum"]) {
      await expect(page.getByTestId(`pass-tier-${tier}`).getByText("A full palm reading every 30 days")).toBeVisible();
    }
  });

  test("while Palm Reading is switched off, no Pass promises it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-tier-silver").getByText("15 questions to Aroha every 30 days")).toBeVisible();
    await expect(page.getByText("A full palm reading every 30 days")).toHaveCount(0);
  });
});

test.describe("Question Packs on Google Play (Android)", () => {
  const PACK_FEATURES = { "paid.questionPackSmall": { ...ON, pricePaise: 4900 } };

  test("a pack opens Google Play and adds questions; nothing comes from the wallet", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    await asAndroid(page);
    let credits = 0;
    const api = await mockApi(page, {
      user: { features: PACK_FEATURES, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({ enabled: false, offers: [], questionCredits: credits, packs: [{ pack: "small", questions: 5, pricePaise: 4900 }] }),
        }),
        "POST /v1/question-packs/:pack/checkout": () => ({ json: { productId: "question_pack_5", questions: 5 } }),
        "POST /v1/billing/confirm-google-play": () => {
          credits = 5;
          return { json: { order: { id: "order-1" }, walletBalancePaise: 100_000 } };
        },
      },
    });
    await signIn(page, "/pass");

    const packs = page.getByTestId("question-packs");
    await packs.getByRole("button", { name: "Buy for ₹49" }).click();
    await expect(packs.getByText("Added 5 questions")).toBeVisible();
    await expect(packs.getByText("You have 5 prepaid questions")).toBeVisible();

    const native = (await page.evaluate(() => (window as unknown as { __nativeCalls: unknown[] }).__nativeCalls)) as Array<{
      plugin: string;
      method: string;
      options: Record<string, unknown>;
    }>;
    const purchase = native.find((c) => c.plugin === "PlayBilling" && c.method === "purchaseProduct");
    expect(purchase?.options).toMatchObject({ productId: "question_pack_5", productType: "inapp", userId: "00000000-0000-4000-8000-000000000001" });
    expect(callsTo(api, "POST /v1/question-packs/small/checkout")).toHaveLength(1);
    expect(callsTo(api, "POST /v1/billing/confirm-google-play")[0]!.body).toEqual({
      purchaseToken: "play-token-1",
      productId: "question_pack_5",
    });
    expect(callsTo(api, "POST /v1/question-packs/small/buy")).toHaveLength(0);
  });

  test("backing out of the Play sheet is not an error and adds nothing", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => window.localStorage.setItem("aroha:sharePromptSeen:v1", "1"));
    await asAndroid(page, { cancel: true });
    const api = await mockApi(page, {
      user: { features: PACK_FEATURES },
      overrides: {
        "GET /v1/pass": () => ({
          json: passStatus({ enabled: false, offers: [], packs: [{ pack: "small", questions: 5, pricePaise: 4900 }] }),
        }),
        "POST /v1/question-packs/:pack/checkout": () => ({ json: { productId: "question_pack_5", questions: 5 } }),
      },
    });
    await signIn(page, "/pass");

    await page.getByTestId("question-packs").getByRole("button", { name: "Buy for ₹49" }).click();
    await expect.poll(() => callsTo(api, "POST /v1/question-packs/small/checkout").length).toBe(1);
    await expect(page.getByText("Added 5 questions")).toHaveCount(0);
    await expect(page.getByText(/Something went wrong|couldn't|failed/i)).toHaveCount(0);
    expect(callsTo(api, "POST /v1/billing/confirm-google-play")).toHaveLength(0);
  });
});
