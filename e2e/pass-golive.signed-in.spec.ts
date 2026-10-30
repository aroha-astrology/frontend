import { test, expect } from "@playwright/test";
import { mockApi, callsTo, passStatus, PASS_OFFERS, PASS_REQUIRED, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Aroha Pass go-live: what a user sees of the Pass outside /pass itself.
 * The lock on a Pass-only feature, the top-bar chip, the menu tags, the
 * "Aroha Pass is here" popup, the report price steps, and Admin's go-live card.
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PASS_ON = {
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};
const PASS_FEATURES_ON = {
  "nav.lifeTimeline": ON,
  "nav.decisions": ON,
  "panchang.findMyDate": ON,
  "nav.bonds": ON,
  "nav.relocation": ON,
};

function member(tier: "silver" | "gold" | "platinum") {
  const offer = PASS_OFFERS.find((o) => o.tier === tier)!;
  return {
    tier,
    source: "google_play",
    variant: offer.variant,
    pricePaise: offer.pricePaise,
    periodEnd: "2026-10-25T06:30:00.000Z",
    autoRenew: true,
    questionsLeft: 10,
    questionsPerPeriod: offer.questionsPerPeriod,
    reportDiscountPct: offer.reportDiscountPct,
    features: offer.features,
  };
}

test.describe("the Pass lock", () => {
  test("a Gold feature tells a non-member why it is worth it, names Gold, and its button opens /pass on Gold", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, ...PASS_FEATURES_ON } },
      overrides: {
        "GET /v1/decisions": () => PASS_REQUIRED,
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await signIn(page, "/decide");

    const lock = page.getByTestId("pass-lock");
    await expect(lock.getByTestId("pass-lock-hook")).toHaveText("Big decision? Know your right time first.");
    await expect(lock.getByText("Decision Astrology is part of Aroha Pass Gold")).toBeVisible();
    await expect(lock.getByText("60 questions to Aroha every 30 days")).toBeVisible();

    await lock.getByRole("link", { name: "Unlock with Aroha Pass Gold" }).click();
    await page.waitForURL("**/pass?tier=gold");
    await expect(page.getByTestId("pass-hero")).toHaveText("More answers. Deeper readings. One Pass.");
    await expect(page.getByTestId("pass-tier-gold").getByText("Recommended")).toBeVisible();
  });

  test("a Platinum feature opens /pass with Platinum picked out instead of Gold", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, ...PASS_FEATURES_ON } },
      overrides: {
        "GET /v1/relocation": () => PASS_REQUIRED,
        "GET /v1/pass": () => ({ json: passStatus() }),
      },
    });
    await signIn(page, "/relocation");

    const lock = page.getByTestId("pass-lock");
    await expect(lock.getByTestId("pass-lock-hook")).toHaveText("Find the city where your stars shine brightest.");
    await lock.getByRole("link", { name: "Unlock with Aroha Pass Platinum" }).click();
    await page.waitForURL("**/pass?tier=platinum");
    await expect(page.getByTestId("pass-tier-platinum").getByText("Recommended")).toBeVisible();
    await expect(page.getByTestId("pass-tier-gold").getByText("Recommended")).toHaveCount(0);
  });

  test("a Silver member who opens a Gold feature is asked to upgrade, not to subscribe", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { ...PASS_ON, ...PASS_FEATURES_ON } },
      overrides: {
        "GET /v1/decisions": () => PASS_REQUIRED,
        "GET /v1/pass": () => ({ json: passStatus({ pass: member("silver") }) }),
      },
    });
    await signIn(page, "/decide");

    const lock = page.getByTestId("pass-lock");
    await expect(lock.getByRole("link", { name: "Upgrade to Aroha Pass Gold" })).toHaveAttribute("href", "/pass?tier=gold");
    await expect(lock.getByRole("link", { name: /Unlock with/ })).toHaveCount(0);
  });
});

test.describe("the top-bar Pass chip", () => {
  test("a member sees their tier, and it opens /pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: member("gold") }) }) },
    });
    await signIn(page, "/");

    const chip = page.getByTestId("pass-chip");
    await expect(chip).toHaveText("Gold");
    await expect(chip).toHaveAttribute("data-tier", "gold");
    await chip.click();
    await page.waitForURL("**/pass");
    await expect(page.getByTestId("pass-active")).toContainText("Your Aroha Pass Gold is active");
  });

  test("someone without a Pass sees Get Pass; nothing at all while the Pass is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus() }) },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("pass-chip")).toHaveText("Get Pass");
    await expect(page.getByTestId("pass-chip")).toHaveAttribute("href", "/pass");
  });

  test("no chip and no request while the Pass is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/");
    await expect(page.getByTestId("topbar-row")).toBeVisible();
    await expect(page.getByTestId("pass-chip")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/pass")).toHaveLength(0);
  });

  test("the longest chip fits a 360px phone with a five-figure wallet beside it", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON, walletBalancePaise: 1_032_890 },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: member("platinum") }) }) },
    });
    await signIn(page, "/");

    await expect(page.getByTestId("pass-chip")).toHaveText("Platinum");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const row = (await page.getByTestId("topbar-row").boundingBox())!;
    const bell = (await page.getByRole("button", { name: "Notifications" }).boundingBox())!;
    expect(bell.x + bell.width).toBeLessThanOrEqual(row.x + row.width);
  });
});

test("the menu marks each Pass-only entry with the Pass it needs, and drops the mark once the user has it", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { features: { ...PASS_ON, ...PASS_FEATURES_ON } },
    overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: member("silver") }) }) },
  });
  await signIn(page, "/");
  await page.getByRole("button", { name: "Menu" }).click();

  // Silver already has the Life Timeline and Bonds.
  await expect(page.getByTestId("menu-pass-tag-timeline")).toHaveCount(0);
  await expect(page.getByTestId("menu-pass-tag-bonds")).toHaveCount(0);
  await expect(page.getByTestId("menu-pass-tag-decisions")).toHaveText("Gold");
  await expect(page.getByTestId("menu-pass-tag-findMyDate")).toHaveText("Gold");
  await expect(page.getByTestId("menu-pass-tag-relocation")).toHaveText("Platinum");
});

test.describe('the "Aroha Pass is here" popup', () => {
  const POPUP_ON = { ...PASS_ON, "home.passLaunchPopup": ON };
  const pass: Handlers = { "GET /v1/pass": () => ({ json: passStatus() }) };

  test("someone already using Aroha sees it once, and its button opens the Pass page", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: POPUP_ON }, overrides: pass });
    await signIn(page, "/");

    const popup = page.getByTestId("pass-launch-modal");
    await expect(popup.getByRole("heading", { name: "Aroha Pass is here" })).toBeVisible();
    await expect(popup.getByText("From ₹199 / 30 days")).toBeVisible();
    await popup.getByTestId("pass-launch-cta").click();
    await page.waitForURL("**/pass");
    await expect(page.getByTestId("pass-tiers")).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("pass-chip")).toBeVisible();
    await expect(popup).toHaveCount(0);
  });

  test("a new user does not see it on their first visit, and does on the second", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: POPUP_ON, profileCompletedAt: new Date(Date.now() - 60_000).toISOString() },
      overrides: pass,
    });
    await signIn(page, "/");

    const popup = page.getByTestId("pass-launch-modal");
    await expect(page.getByTestId("pass-chip")).toBeVisible();
    await expect(popup).toHaveCount(0);
    // Coming back to Home in the same visit changes nothing.
    await page.goto("/pass");
    await page.goto("/");
    await expect(page.getByTestId("pass-chip")).toBeVisible();
    await expect(popup).toHaveCount(0);

    // The app is closed and opened again: a new visit.
    await page.evaluate(() => window.sessionStorage.removeItem("aroha:visitId"));
    await page.reload();
    await expect(popup.getByRole("heading", { name: "Aroha Pass is here" })).toBeVisible();
    await popup.getByRole("button", { name: "Maybe later" }).click();
    await expect(popup).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("pass-chip")).toBeVisible();
    await expect(popup).toHaveCount(0);
  });

  test("it stays away from a member, and while its own switch is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: POPUP_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: member("silver") }) }) },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("pass-chip")).toHaveText("Silver");
    await expect(page.getByTestId("pass-launch-modal")).toHaveCount(0);
  });

  test("off by default: the Pass can be on sale without the popup", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: PASS_ON }, overrides: pass });
    await signIn(page, "/");
    await expect(page.getByTestId("pass-chip")).toHaveText("Get Pass");
    await expect(page.getByTestId("pass-launch-modal")).toHaveCount(0);
  });
});

test.describe("report price steps", () => {
  const report = (extra: Record<string, unknown>) => ({
    key: "past_life",
    label: "Past Life Report",
    isMonthly: false,
    isYearly: false,
    requiresPartner: false,
    enabled: true,
    isNew: false,
    purchases: [],
    lastSpouseDetails: null,
    ...extra,
  });
  const openBuy = async (page: import("@playwright/test").Page) => {
    const card = page
      .locator("div")
      .filter({ hasText: "Past Life Report" })
      .filter({ has: page.getByRole("button", { name: "Buy", exact: true }) })
      .last();
    await card.getByRole("button", { name: "Buy", exact: true }).click();
  };

  test("a Platinum member sees the sale, then 40% more off for the Pass, then what they pay", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: PASS_ON, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus({ pass: member("platinum") }) }),
        // ₹499 marked down to ₹199 for everyone, then 40% off that for the Pass: ₹119.40.
        "GET /v1/reports": () => ({
          json: {
            reports: [report({ originalPricePaise: 49_900, listPricePaise: 19_900, passDiscountPct: 40, pricePaise: 11_940 })],
          },
        }),
        "POST /v1/reports/purchase": () => ({
          json: { reports: [{ id: "22222222-2222-4222-8222-222222222222", reportKey: "past_life", periodMonth: null, status: "pending" }] },
        }),
        "GET /v1/reports/:id": () => ({ status: 202, json: { status: "generating" } }),
      },
    });
    await signIn(page, "/reports");
    await openBuy(page);

    const steps = page.getByTestId("price-breakdown");
    await expect(steps.getByText("₹499")).toBeVisible();
    await expect(steps.getByText("Today's offer (60% off)")).toBeVisible();
    await expect(steps.getByText("₹199", { exact: true })).toBeVisible();
    await expect(steps.getByTestId("price-pass-line")).toHaveText("Your Aroha Pass (extra 40% off)−₹79.60");
    await expect(steps.getByTestId("price-total")).toHaveText("₹119.40");
    await expect(steps.getByText("You save ₹379.60")).toBeVisible();
    await expect(steps.getByTestId("price-pass-teaser")).toHaveCount(0);

    // The button and the confirm step ask for the same final amount.
    await page.getByRole("button", { name: /^Buy · ₹119.40/ }).click();
    await page.getByRole("button", { name: "Yes, Unlock" }).click();
    await expect.poll(() => callsTo(api, "POST /v1/reports/purchase").length).toBe(1);
  });

  test("someone without a Pass sees the sale and what members pay less, with a link to the Pass", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON, walletBalancePaise: 100_000 },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus() }),
        "GET /v1/reports": () => ({
          json: { reports: [report({ originalPricePaise: 49_900, listPricePaise: 19_900, passDiscountPct: 0, pricePaise: 19_900 })] },
        }),
      },
    });
    await signIn(page, "/reports");
    await openBuy(page);

    const steps = page.getByTestId("price-breakdown");
    await expect(steps.getByText("Today's offer (60% off)")).toBeVisible();
    await expect(steps.getByTestId("price-pass-line")).toHaveCount(0);
    await expect(steps.getByTestId("price-total")).toHaveText("₹199");
    await expect(steps.getByTestId("price-pass-teaser")).toContainText(
      "Aroha Pass members pay up to 40% less on every report.",
    );
    await expect(steps.getByRole("link", { name: "See the Pass" })).toHaveAttribute("href", "/pass");
  });

  test("a plain price with the Pass off shows no steps at all", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { walletBalancePaise: 100_000 },
      overrides: { "GET /v1/reports": () => ({ json: { reports: [report({ originalPricePaise: null, pricePaise: 19_900 })] } }) },
    });
    await signIn(page, "/reports");
    await openBuy(page);
    await expect(page.getByRole("button", { name: /^Buy · ₹199/ })).toBeVisible();
    await expect(page.getByTestId("price-breakdown")).toHaveCount(0);
  });
});

test.describe("Admin: Aroha Pass go-live", () => {
  const OVERVIEW = {
    range: { from: "2026-09-08", to: "2026-10-07" },
    cashInPaise: 0,
    orderCount: 0,
    walletSpendPaise: 0,
    walletLiabilityPaise: 0,
    payingUsers: 0,
    arpuPaise: 0,
    newUsers: 0,
    activeUsers: 0,
    timeSeries: [],
    spendByFeature: [],
    topUpFunnel: [],
    llmCostByAgent: [],
  };
  const sw = (key: string, enabled: boolean, need: "required" | "optional" = "required") => ({
    key,
    label: `Label of ${key}`,
    enabled,
    need,
  });
  const readiness = (ready: boolean, alreadySent = 0) => ({
    ready,
    playConfigured: true,
    switches: [
      sw("nav.arohaPass", true),
      sw("paid.arohaPassB", true, "optional"),
      sw("nav.relocation", ready),
      sw("home.passLaunchPopup", false, "optional"),
    ],
    audience: { users: 120, withPush: 80, alreadySent },
  });

  test("lists what is still off and will not send until the Pass is ready", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { isAdmin: true },
      overrides: {
        "GET /v1/admin/overview": () => ({ json: OVERVIEW }),
        "GET /v1/admin/pass-launch": () => ({ json: readiness(false) }),
        "POST /v1/admin/pass-launch": () => ({ json: { attempted: 1, failed: 0, skipped: 0 } }),
      },
    });
    await signIn(page, "/admin");

    const card = page.getByTestId("admin-pass-launch");
    await expect(card.getByTestId("pass-launch-ready")).toContainText("Not ready");
    await expect(card.getByTestId("pass-launch-switch-nav.relocation")).toContainText("off, needed");
    await expect(card.getByTestId("pass-launch-switch-home.passLaunchPopup")).toContainText("off, optional");
    await expect(card.getByTestId("pass-launch-send")).toBeDisabled();

    // The try-out to the admin alone works before go-live.
    await card.getByRole("button", { name: "Send a try-out to me" }).click();
    await expect(card.getByText("Sent to you. Check your phone and the bell.")).toBeVisible();
    expect(callsTo(api, "POST /v1/admin/pass-launch")[0]!.body).toEqual({ onlyMe: true });
  });

  test("once ready, sends to everyone after a confirm, and then has nobody left to send to", async ({ page }) => {
    await skipLaunchOverlays(page);
    let sent = 0;
    const api = await mockApi(page, {
      user: { isAdmin: true },
      overrides: {
        "GET /v1/admin/overview": () => ({ json: OVERVIEW }),
        "GET /v1/admin/pass-launch": () => ({ json: readiness(true, sent) }),
        "POST /v1/admin/pass-launch": () => {
          sent = 120;
          return { json: { attempted: 120, failed: 0, skipped: 0 } };
        },
      },
    });
    await signIn(page, "/admin");

    const card = page.getByTestId("admin-pass-launch");
    await expect(card.getByTestId("pass-launch-ready")).toContainText("Ready");
    await card.getByTestId("pass-launch-send").click();
    await expect(page.getByText("This goes to 120 users now")).toBeVisible();
    expect(callsTo(api, "POST /v1/admin/pass-launch")).toHaveLength(0);
    await page.getByRole("button", { name: "Send to 120 users" }).last().click();

    await expect(card.getByText("Sent to 120 users.")).toBeVisible();
    expect(callsTo(api, "POST /v1/admin/pass-launch")[0]!.body).toEqual({ onlyMe: false });
    await expect(card.getByTestId("pass-launch-send")).toHaveText("Sent to everyone");
    await expect(card.getByTestId("pass-launch-send")).toBeDisabled();
  });
});
