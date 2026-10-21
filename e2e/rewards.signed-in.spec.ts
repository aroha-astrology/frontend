import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { makeRewardState } from "./fixtures/data";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const justOnboarded = () => new Date(Date.now() - 60_000).toISOString();

test.describe("Daily reward", () => {
  test("the daily popup claims today's reward", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: { "GET /v1/rewards/daily": () => ({ json: makeRewardState({ claimedToday: false, currentDay: 2 }) }) },
    });
    await signIn(page, "/");

    await page.getByRole("button", { name: /^Claim ₹6/ }).click();
    await expect.poll(() => callsTo(api, "POST /v1/rewards/daily/claim").length).toBe(1);
  });

  test("the day-7 badge shows the real bonus when the admin changes the daily step", async ({ page }) => {
    // Admin set ₹5 base, ₹2 step, ₹21 bonus: day 6 pays ₹15, day 7 pays ₹17 + ₹21 = ₹38.
    const state = makeRewardState({ claimedToday: false, currentDay: 3 });
    state.ladder = state.ladder.map((slot) => ({
      ...slot,
      amountPaise: 500 + (slot.day - 1) * 200 + (slot.isBonusDay ? 2100 : 0),
    }));
    state.todayAmountPaise = 900;
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: { "GET /v1/rewards/daily": () => ({ json: state }) } });
    await signIn(page, "/");

    await expect(page.getByRole("button", { name: /^Claim ₹9/ })).toBeVisible();
    await expect(page.getByText("₹38", { exact: true })).toBeVisible();
    await expect(page.getByText("+₹21 bonus")).toBeVisible();
  });

  test("a brand-new user claims day 1 straight from the welcome screen", async ({ page }) => {
    await skipLaunchOverlays(page, { welcome: true });
    const api = await mockApi(page, {
      user: { profileCompletedAt: justOnboarded() },
      overrides: { "GET /v1/rewards/daily": () => ({ json: makeRewardState({ claimedToday: true, currentDay: 1 }) }) },
    });
    await signIn(page, "/");

    await expect(page.getByText(/unlocked your first daily reward/)).toBeVisible();
    await page.getByRole("button", { name: "Claim reward & start" }).click();
    await expect.poll(() => callsTo(api, "POST /v1/rewards/daily/claim").length).toBe(1);
    await expect(page.getByRole("button", { name: "Claim reward & start" })).toBeHidden();
  });

  test("with rewards switched off, the welcome screen promises nothing and claims nothing", async ({ page }) => {
    await skipLaunchOverlays(page, { welcome: true });
    const api = await mockApi(page, {
      user: {
        profileCompletedAt: justOnboarded(),
        features: { "nav.rewards": { enabled: false, pricePaise: null, originalPricePaise: null } },
      },
    });
    await signIn(page, "/");

    await expect(page.getByText(/today's reading are ready/)).toBeVisible();
    await expect(page.getByText(/unlocked your first daily reward/)).toHaveCount(0);
    await page.getByRole("button", { name: "Start Exploring" }).click();
    expect(callsTo(api, "POST /v1/rewards/daily/claim")).toHaveLength(0);
  });
});
