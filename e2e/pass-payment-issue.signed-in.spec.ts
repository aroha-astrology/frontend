import { test, expect } from "@playwright/test";
import { mockApi, passStatus, PASS_OFFERS } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// A Google Play renewal payment that failed (2026-10-23 Pass lifecycle fixes): during the
// grace period the Pass keeps working and says how to fix it; on account hold it has stopped
// and the page leads with the fix. Deleting the account says it cancels the Play Pass.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const PASS_ON = {
  "nav.arohaPass": ON,
  "paid.arohaPassA": { ...ON, pricePaise: 19900 },
  "paid.arohaPassB": { ...ON, pricePaise: 29900 },
  "paid.arohaPassC": { ...ON, pricePaise: 39900 },
};

const gold = PASS_OFFERS.find((o) => o.tier === "gold")!;
const GOLD_PLAY = {
  tier: "gold",
  source: "google_play",
  variant: "B",
  pricePaise: gold.pricePaise,
  periodEnd: "2026-11-04T06:30:00.000Z",
  autoRenew: true,
  questionsLeft: 18,
  questionsPerPeriod: gold.questionsPerPeriod,
  voiceFreeMinutes: gold.voiceFreeMinutes,
  reportDiscountPct: gold.reportDiscountPct,
  features: gold.features,
};

test.describe("Aroha Pass: a renewal payment that failed", () => {
  test("grace period: the Pass still works and says to fix the payment in Google Play", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus({ pass: GOLD_PLAY, paymentIssue: "grace" }) }),
      },
    });
    await signIn(page, "/pass");

    const active = page.getByTestId("pass-active");
    await expect(active.getByText("Your Aroha Pass Gold is active")).toBeVisible();
    const banner = page.getByTestId("pass-payment-grace");
    await expect(banner.getByText("Your last payment didn't go through")).toBeVisible();
    await expect(banner.getByText(/still works for now/)).toBeVisible();
    await expect(banner.getByRole("link", { name: "Fix payment in Google Play" })).toHaveAttribute(
      "href",
      /play\.google\.com\/store\/account\/subscriptions\?sku=aroha_pass_monthly/,
    );
    await expect(page.getByTestId("pass-payment-hold")).toHaveCount(0);
  });

  test("account hold: no live Pass, the page leads with the fix and names the held tier", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus({ pass: null, paymentIssue: "hold", heldTier: "gold" }) }),
      },
    });
    await signIn(page, "/pass");

    const hold = page.getByTestId("pass-payment-hold");
    await expect(hold.getByText("Your Aroha Pass Gold is on hold")).toBeVisible();
    await expect(hold.getByText(/benefits are paused/)).toBeVisible();
    await expect(hold.getByRole("link", { name: "Fix payment in Google Play" })).toHaveAttribute(
      "href",
      /play\.google\.com\/store\/account\/subscriptions/,
    );
    await expect(page.getByTestId("pass-active")).toHaveCount(0);
    await expect(page.getByTestId("pass-payment-grace")).toHaveCount(0);
    // The tiers are still there to compare.
    await expect(page.getByTestId("pass-tier-gold")).toBeVisible();
  });

  test("the hold notice reads in the user's language", async ({ page }) => {
    await skipLaunchOverlays(page);
    await page.addInitScript(() => window.localStorage.setItem("aroha:lang", "hi"));
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: {
        "GET /v1/pass": () => ({ json: passStatus({ pass: null, paymentIssue: "hold", heldTier: null }) }),
      },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-payment-hold").getByText("आपका Aroha Pass रुका हुआ है")).toBeVisible();
  });

  test("an older server (no paymentIssue) shows no payment banner", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: PASS_ON },
      overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass: GOLD_PLAY }) }) },
    });
    await signIn(page, "/pass");
    await expect(page.getByTestId("pass-active")).toBeVisible();
    await expect(page.getByTestId("pass-payment-grace")).toHaveCount(0);
    await expect(page.getByTestId("pass-payment-hold")).toHaveCount(0);
  });
});

test.describe("Deleting the account with a Google Play Pass", () => {
  for (const [label, pass, shown] of [
    ["a Play Pass: the dialog says deletion cancels it in Google Play", GOLD_PLAY, true],
    ["no Pass: no Pass note", null, false],
  ] as const) {
    test(label, async ({ page }) => {
      await skipLaunchOverlays(page);
      await mockApi(page, {
        user: { features: PASS_ON },
        overrides: { "GET /v1/pass": () => ({ json: passStatus({ pass }) }) },
      });
      await signIn(page, "/settings");
      await page.getByRole("button", { name: "Delete account" }).click();
      await expect(page.getByText("Delete your account?")).toBeVisible();
      const note = page.getByTestId("delete-account-pass-note");
      if (shown) {
        await expect(note).toContainText("cancels your Aroha Pass in Google Play");
        await expect(note.getByRole("link", { name: "Manage in Google Play" })).toBeVisible();
      } else {
        await expect(note).toHaveCount(0);
      }
    });
  }
});
