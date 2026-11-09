import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Sprint L1 (2026-11-09): pop-up clean-up, the Varshik Rashifal 2027 launch pop-up and the Featured report switch.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const VARSHIK_ON = { "home.varshikLaunchPopup": ON, "reports.varshik_rashifal_2027": ON };
const SHOTS = process.env.L1_SHOTS_DIR;

/** A full page load counts as one app open, and signIn() loads two pages: /legal/terms, then the target. */
const reloadAsNextOpen = async (page: Page) => {
  await page.evaluate(() => window.sessionStorage.removeItem("aroha:visitId"));
  await page.reload();
};

const launch = (page: Page) => page.getByTestId("report-launch-modal");
const rateUs = (page: Page) => page.getByRole("heading", { name: "Rate Aroha Astrology" });

test.describe("removed pop-ups", () => {
  test("Share & earn, the daily reward and the Pass launch never open on Home, however many times it is opened", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { walletBalancePaise: 0, features: { "home.passLaunchPopup": ON, "nav.arohaPass": ON } },
    });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await reloadAsNextOpen(page);
      await expect(page.locator("main")).toBeVisible();
    }
    await page.waitForTimeout(1500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText(/Share & Earn/)).toHaveCount(0);
    await expect(page.getByText("Daily Reward", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("pass-launch-modal")).toHaveCount(0);
    await expect(page.getByTestId("experience-gate")).toHaveCount(0);
  });
});

test.describe("Rate us", () => {
  test("opens on the 3rd app open, once, and never again", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { feedbackGiven: false } });
    await signIn(page, "/"); // opens 1 (terms page) and 2 (Home)
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(rateUs(page)).toHaveCount(0);

    await reloadAsNextOpen(page); // open 3
    await expect(rateUs(page)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).first().click();
    await expect(rateUs(page)).toHaveCount(0);

    await reloadAsNextOpen(page);
    await reloadAsNextOpen(page);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(rateUs(page)).toHaveCount(0);
  });

  test("a chat answer or a report no longer brings it on early", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { feedbackGiven: false } });
    await page.addInitScript(() => {
      window.localStorage.setItem("aroha:goodChatReplies:v1", "5");
      window.localStorage.setItem("aroha:feedbackAskAfter:v1", "1");
    });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(rateUs(page)).toHaveCount(0);
  });
});

test.describe("Varshik Rashifal 2027 launch pop-up", () => {
  test("shows once, its button opens the reports list, and it never comes back", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, { user: { features: VARSHIK_ON } });
    await signIn(page, "/");

    await expect(launch(page)).toBeVisible();
    await expect(page.getByTestId("report-launch-cover")).toBeVisible();
    await expect(launch(page).getByRole("heading", { name: "Your 2027, month by month" })).toBeVisible();
    await launch(page).getByTestId("report-launch-cta").click();
    await page.waitForURL("**/reports");
    // The server is told, so a reinstall or a new phone will not repeat it.
    await expect.poll(() => callsTo(api, "PATCH /v1/me").map((c) => c.body)).toContainEqual({ popupSeen: "varshik-2027" });

    await page.goto("/");
    await expect(page.locator("main")).toBeVisible();
    await expect(launch(page)).toHaveCount(0);
  });

  test("closing it ends it too", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: VARSHIK_ON } });
    await signIn(page, "/");
    await launch(page).getByRole("button", { name: "Maybe later" }).click();
    await expect(launch(page)).toHaveCount(0);
    await reloadAsNextOpen(page);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(launch(page)).toHaveCount(0);
  });

  test("stays away when either switch is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "home.varshikLaunchPopup": ON } } });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(launch(page)).toHaveCount(0);
  });

  test("stays away when the pop-up switch is off but the report is on (the default)", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "reports.varshik_rashifal_2027": ON } } });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(launch(page)).toHaveCount(0);
  });

  test("stays away when the server says this user has seen it", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: VARSHIK_ON, popupsSeen: ["varshik-2027"] } });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(launch(page)).toHaveCount(0);
  });

  test("skips a brand-new user's first visit, then shows on the next", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: VARSHIK_ON, profileCompletedAt: new Date(Date.now() - 60_000).toISOString() },
    });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(launch(page)).toHaveCount(0);
    await reloadAsNextOpen(page);
    await expect(launch(page)).toBeVisible();
  });

  test("only one pop-up per app open: the gift and Rate us wait for a later visit", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: {
        features: VARSHIK_ON,
        feedbackGiven: false,
        activeClaimableCampaign: {
          key: "test-gift",
          title: "Test Festival",
          amountPaise: 5000,
          validUntil: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        },
      },
    });
    await page.addInitScript(() => {
      if (!window.localStorage.getItem("aroha:appOpens")) window.localStorage.setItem("aroha:appOpens", "5");
    });
    await signIn(page, "/");
    await expect(launch(page)).toBeVisible();
    await expect(page.getByText("On the house")).toHaveCount(0);
    await expect(rateUs(page)).toHaveCount(0);

    await launch(page).getByRole("button", { name: "Maybe later" }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText("On the house")).toHaveCount(0);
    await expect(rateUs(page)).toHaveCount(0);

    // Next visit: the Varshik pop-up is done, so the gift takes the one slot and Rate us still waits.
    await reloadAsNextOpen(page);
    await expect(page.getByText("On the house")).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(rateUs(page)).toHaveCount(0);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`screenshot, ${scheme}, phone width`, async ({ page }) => {
      test.skip(!SHOTS, "set L1_SHOTS_DIR to save screenshots");
      await page.addInitScript((s) => window.localStorage.setItem("theme", s), scheme);
      await skipLaunchOverlays(page);
      await mockApi(page, { user: { features: VARSHIK_ON } });
      await signIn(page, "/");
      await expect(page.getByTestId("report-launch-cover")).toBeVisible();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/launch-popup-${scheme}.png` });
    });
  }
});

test.describe("Featured reports", () => {
  const entry = (key: string, label: string, extra: Record<string, unknown> = {}) => ({
    key,
    label,
    isMonthly: false,
    isYearly: false,
    requiresPartner: false,
    enabled: true,
    isNew: false,
    isFeatured: false,
    pricePaise: 9900,
    originalPricePaise: null,
    listPricePaise: 9900,
    passDiscountPct: 0,
    purchases: [],
    lastSpouseDetails: null,
    ...extra,
  });
  const catalogue = {
    "GET /v1/reports": () => ({
      json: {
        reports: [
          entry("marriage", "Marriage Report"),
          entry("wealth", "Wealth Report", { isNew: true }),
          entry("past_life", "Past Life Report"),
          entry("varshik_rashifal_2027", "Varshik Rashifal 2027", { isFeatured: true }),
        ],
      },
    }),
  };
  const order = async (page: Page) => {
    const text = await page.locator("main").innerText();
    return ["Marriage Report", "Wealth Report", "Past Life Report", "Varshik Rashifal 2027"]
      .map((l) => [l, text.indexOf(l)] as const)
      .filter(([, i]) => i >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([l]) => l);
  };

  test("a featured report sorts above a New one on the reports page", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: catalogue });
    await signIn(page, "/reports");
    await expect(page.getByText("Varshik Rashifal 2027").first()).toBeVisible();
    expect(await order(page)).toEqual(["Varshik Rashifal 2027", "Wealth Report", "Marriage Report", "Past Life Report"]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/reports-featured.png` });
  });

  test("with nothing featured the order is New first, as before", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      overrides: {
        "GET /v1/reports": () => ({
          json: {
            reports: [
              entry("marriage", "Marriage Report"),
              entry("wealth", "Wealth Report", { isNew: true }),
              entry("past_life", "Past Life Report"),
              entry("varshik_rashifal_2027", "Varshik Rashifal 2027"),
            ],
          },
        }),
      },
    });
    await signIn(page, "/reports");
    await expect(page.getByText("Varshik Rashifal 2027").first()).toBeVisible();
    expect(await order(page)).toEqual(["Wealth Report", "Marriage Report", "Past Life Report", "Varshik Rashifal 2027"]);
  });

  test("a featured report also leads Home's reports slider", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { "home.reportsSection": ON } }, overrides: catalogue });
    await signIn(page, "/");
    await expect(page.getByText("Varshik Rashifal 2027").first()).toBeVisible();
    expect((await order(page))[0]).toBe("Varshik Rashifal 2027");
  });
});

test.describe("Admin → Features: the L1 switches", () => {
  test("the Varshik launch pop-up switch and a report's Featured switch are on the board, off, and can be turned on", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await skipLaunchOverlays(page);
    const row = (key: string, label: string, group: string) => ({
      key,
      label,
      group,
      enabled: false,
      pricePaise: null,
      originalPricePaise: null,
      model: null,
      modelOptions: [],
      tag: null,
      audience: "all",
      defaultAudience: "all",
    });
    let rows = [
      { ...row("home.varshikLaunchPopup", "Varshik Rashifal 2027 launch popup on Home (once per user; needs the report switch on too)", "home"), tag: "new" },
      row("reports.featured_varshik_rashifal_2027", "Featured: Varshik Rashifal 2027 (sorts first on Reports and Home)", "reports"),
    ];
    const api = await mockApi(page, {
      user: { isAdmin: true },
      overrides: {
        "GET /v1/admin/features": () => ({ json: { features: rows } }),
        "PUT /v1/admin/features": (c) => {
          const body = c.body as { key: string; enabled: boolean };
          rows = rows.map((r) => (r.key === body.key ? { ...r, enabled: body.enabled } : r));
          return { json: rows.find((r) => r.key === body.key) };
        },
      },
    });
    await signIn(page, "/admin/features");
    await expect(page.getByText(/^Featured: Varshik Rashifal 2027/)).toBeVisible();
    await expect(page.getByText(/^Varshik Rashifal 2027 launch popup/)).toBeVisible();
    const featured = page.getByRole("switch", { name: /Toggle Featured: Varshik Rashifal 2027/ });
    await expect(featured).toHaveAttribute("aria-checked", "false");
    await featured.click();
    await expect.poll(() => callsTo(api, "PUT /v1/admin/features").map((c) => c.body)).toContainEqual(
      expect.objectContaining({ key: "reports.featured_varshik_rashifal_2027", enabled: true }),
    );
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-features-l1.png` });
  });
});
