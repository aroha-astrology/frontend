import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { primaryProfile } from "./fixtures/data";

/**
 * Varshik Rashifal is sold only on a birth time the reader calls exact (the server refuses anything else).
 * The purchase sheet asks for exactly what is missing, waits for the Kundli rebuilt from it, keeps the
 * plan and answers while the reader goes to check their birth time, and turns each server refusal into
 * the right step instead of "try again" (the 2026-11-10 bug: 48 refused purchases in one day).
 */

const REPORT_ID = "77777777-7777-4777-8777-777777777777";
test.use({ viewport: { width: 390, height: 820 } });

const tier = (tierSlug: string, displayName: string, pricePaise: number, sortOrder: number) => ({
  tierSlug,
  displayName,
  subtitle: `${displayName} subtitle`,
  badgeText: null,
  pricePaise,
  originalPricePaise: pricePaise * 2,
  pageCount: 20,
  shortDescription: `${displayName} short description`,
  features: [`${displayName} feature`],
  excludes: [],
  isPopular: tierSlug === "gold",
  isActive: true,
  sortOrder,
  payPaise: pricePaise,
});
const VARSHIK = {
  key: "varshik_rashifal_2027",
  label: "Varshik Rashifal 2027",
  isMonthly: false,
  isYearly: true,
  requiresPartner: false,
  enabled: true,
  isNew: false,
  pricePaise: 39_900,
  originalPricePaise: 79_900,
  passDiscountPct: 0,
  tiers: [tier("basic", "Varshik Snapshot", 39_900, 1), tier("gold", "Varshik Gold", 59_900, 2)],
  purchases: [],
  lastSpouseDetails: null,
};

/** The profile list follows the user row, so a saved accuracy shows up on the next read, as on the server. */
const handlers = (extra: Handlers = {}): Handlers => ({
  "GET /v1/reports": () => ({ json: { reports: [VARSHIK] } }),
  "GET /v1/profiles": (_c, s) => ({ json: [{ ...primaryProfile, birthTimeAccuracy: s.user.birthTimeAccuracy }] }),
  "GET /v1/kundli": () => ({ json: { status: "ready" } }),
  "GET /v1/reports/:id": () => ({ status: 202, json: { status: "generating" } }),
  ...extra,
});

async function openSheet(page: Page, plan: "Varshik Snapshot" | "Varshik Gold" = "Varshik Snapshot") {
  await signIn(page, "/reports");
  await page.getByRole("button", { name: "Buy", exact: true }).first().click();
  await page.getByTestId("varshik-tier-sheet").getByRole("radio", { name: new RegExp(plan) }).click();
  await page.getByTestId("varshik-tier-continue").click();
}

async function answerAll(page: Page) {
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-required-open="true"]').first().locator("button").first().click();
  }
}

test("a remembered birth time is confirmed in the sheet, the Kundli is rebuilt, then Buy opens", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { birthTimeAccuracy: "approximate" }, overrides: handlers() });
  await openSheet(page);

  const card = page.getByTestId("varshik-birth-confirm");
  await expect(card).toHaveAttribute("data-gap", "time_unconfirmed");
  await expect(card).toContainText("Your saved birth time is 14:10. Is it exact?");
  await expect(page.getByTestId("varshik-birth-check")).toContainText("Aroha Pass");
  await expect(page.getByRole("button", { name: "Confirm your birth details first" })).toBeVisible();

  await card.getByRole("button", { name: "Yes, it's exact" }).click();
  await expect(page.getByTestId("varshik-birth-ready")).toContainText("Your Kundli is up to date");
  expect(callsTo(api, "PATCH /v1/me").map((c) => c.body)).toContainEqual({ birthTimeAccuracy: "exact" });
  expect(callsTo(api, "GET /v1/kundli").length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Confirm your birth details first" })).toHaveCount(0);
});

test("a part-of-day time asks for the real time, ticked as exact, before it saves", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { birthTimeAccuracy: "unknown" }, overrides: handlers() });
  await openSheet(page);

  const card = page.getByTestId("varshik-birth-confirm");
  await expect(card).toHaveAttribute("data-gap", "time_window");
  const save = card.getByRole("button", { name: "Save birth time" });
  await card.locator("#varshik-birth-time").fill("06:25");
  await expect(save).toBeDisabled();
  await card.getByRole("checkbox").check();
  await save.click();
  await expect(page.getByTestId("varshik-birth-ready")).toBeVisible();
  expect(callsTo(api, "PATCH /v1/me").map((c) => c.body)).toContainEqual({ timeOfBirth: "06:25", birthTimeAccuracy: "exact" });
});

test("going to the birth time check keeps the plan and answers, and the sheet reopens on return", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { birthTimeAccuracy: "approximate" }, overrides: handlers() });
  await openSheet(page, "Varshik Snapshot");
  const firstQuestion = page.locator('[data-required-open="true"]').first();
  const picked = firstQuestion.locator("button").first();
  const pickedText = (await picked.textContent()) ?? "";
  await picked.click();

  await page.getByRole("button", { name: "Check my birth time" }).click();
  await expect(page).toHaveURL(/\/settings#birth-time$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByTestId("varshik-birth-confirm")).toBeVisible();
  await expect(page.getByText(/Varshik Snapshot/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: pickedText, exact: true }).first()).toHaveClass(/bg-gold/);
});

test("a chart still being rebuilt at purchase waits instead of saying try again", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: handlers({
      "POST /v1/reports/purchase": () => ({ status: 400, json: { error: { code: "BAD_REQUEST", message: "CHART_UPDATING" } } }),
    }),
  });
  await openSheet(page);
  await answerAll(page);
  await page.getByRole("button", { name: /^Buy · / }).click();
  await page.getByRole("button", { name: "Yes, Unlock" }).click();

  await expect(page.getByText("Your Kundli is still updating with your new details. You can buy in a moment.")).toBeVisible();
  await expect(page.getByTestId("varshik-birth-ready")).toBeVisible();
  await expect(page.getByText("Couldn't complete the purchase", { exact: false })).toHaveCount(0);
  expect(callsTo(api, "GET /v1/kundli").length).toBeGreaterThan(0);
  void REPORT_ID;
});
