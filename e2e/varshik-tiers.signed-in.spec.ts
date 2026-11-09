import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { sampleReport } from "../components/reports/varshik/fixtures/sample-report";

/**
 * Varshik Rashifal in three tiers: the picker before the buy flow (the tier goes to the server, which
 * charges its own price), the pages each tier shows (renumbered, Contents ranges), and paying the
 * difference to move up.
 */

const REPORT_ID = "77777777-7777-4777-8777-777777777777";
test.use({ viewport: { width: 390, height: 820 } });

const tier = (tierSlug: string, displayName: string, pricePaise: number, originalPricePaise: number, pageCount: number, sortOrder: number, badgeText: string | null = null) => ({
  tierSlug,
  displayName,
  subtitle: `${displayName} subtitle`,
  badgeText,
  pricePaise,
  originalPricePaise,
  pageCount,
  shortDescription: `${displayName} short description`,
  features: [`${displayName} feature`],
  excludes: tierSlug === "basic" ? ["Detailed life-area readings"] : [],
  isPopular: tierSlug === "gold",
  isActive: true,
  sortOrder,
  payPaise: pricePaise,
});
const TIERS = [
  tier("basic", "Varshik Snapshot", 29_900, 49_900, 20, 1),
  tier("gold", "Varshik Gold", 59_900, 99_900, 34, 2, "MOST POPULAR"),
  tier("complete", "Varshik Sampoorna", 99_900, 199_900, 59, 3, "BEST VALUE"),
];
const VARSHIK = {
  key: "varshik_rashifal_2027",
  label: "Varshik Rashifal 2027",
  isMonthly: false,
  isYearly: true,
  requiresPartner: false,
  enabled: true,
  isNew: false,
  pricePaise: 29_900,
  originalPricePaise: 49_900,
  passDiscountPct: 0,
  tiers: TIERS,
  purchases: [],
  lastSpouseDetails: null,
};

async function openReport(page: Page, tierSlug: "basic" | "gold" | "complete") {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [{ ...VARSHIK, purchases: [{ id: REPORT_ID, periodMonth: "2027-01-01", status: "ready", tier: tierSlug }] }] } }),
      "GET /v1/reports/:id": () => ({ json: { ...sampleReport, tier: tierSlug } }),
      "POST /v1/reports/:id/upgrade": () => ({ json: { tier: "complete", chargedPaise: 70_000 } }),
    },
  });
  await signIn(page, `/reports/${REPORT_ID}`);
  await expect(page.getByTestId("varshik-report")).toBeVisible();
  return api;
}

const pageEls = (page: Page) => page.getByTestId("varshik-report").locator('[id^="vk-page-"]');

test("Snapshot shows 20 numbered pages, a Contents list with no gap, and no month pages", async ({ page }) => {
  await openReport(page, "basic");
  await expect(pageEls(page)).toHaveCount(20);
  const contents = page.locator("#vk-page-contents");
  await expect(contents).toContainText("4–13");
  await expect(contents).toContainText("Closing note");
  await expect(contents).not.toContainText("Month by month");
  await expect(page.locator("#vk-page-closing")).toContainText("20 / 20");
  await expect(page.getByText("Tap any tile to open that month.")).toHaveCount(0);
  await expect(page.getByText("The next seven pages take them one at a time.")).toHaveCount(0);
  await expect(page.getByText(/Revisit this report at the start of each month/)).toHaveCount(1);
});

test("Gold drops only the month-by-month pages", async ({ page }) => {
  await openReport(page, "gold");
  await expect(pageEls(page)).toHaveCount(36); // 34 + the sample's 2 question pages
  await expect(page.locator("#vk-page-contents")).not.toContainText("Month by month");
  await expect(page.locator("#vk-page-month_0_a")).toHaveCount(0);
  await expect(page.locator("#vk-page-area_love")).toHaveCount(1);
});

test("Sampoorna shows everything and no upgrade card", async ({ page }) => {
  await openReport(page, "complete");
  await expect(pageEls(page)).toHaveCount(61);
  await expect(page.getByTestId("varshik-upgrade")).toHaveCount(0);
});

test("a Snapshot owner can pay the difference, and the rest of the report opens at once", async ({ page }) => {
  const api = await openReport(page, "basic");
  const card = page.getByTestId("varshik-upgrade");
  await card.scrollIntoViewIfNeeded();
  await expect(card.getByTestId("varshik-upgrade-gold")).toContainText("₹300"); // 599 - 299
  await expect(card.getByTestId("varshik-upgrade-complete")).toContainText("₹700");
  await card.getByTestId("varshik-upgrade-complete").click();
  await expect.poll(() => callsTo(api, `POST /v1/reports/${REPORT_ID}/upgrade`).length).toBe(1);
  expect(callsTo(api, `POST /v1/reports/${REPORT_ID}/upgrade`)[0]!.body).toMatchObject({ tier: "complete" });
  await expect(pageEls(page)).toHaveCount(61);
  await expect(page.getByTestId("varshik-upgrade")).toHaveCount(0);
});

test("buying: the picker comes first, starts on Gold, and sends the chosen tier", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [VARSHIK] } }),
      "POST /v1/reports/purchase": () => ({ json: { reports: [{ id: REPORT_ID, reportKey: "varshik_rashifal_2027", periodMonth: "2027-01-01", status: "generating" }] } }),
      "GET /v1/reports/:id": () => ({ status: 202, json: { status: "generating" } }),
    },
  });
  await signIn(page, "/reports");
  await page.getByRole("button", { name: "Buy", exact: true }).first().click();

  const sheet = page.getByTestId("varshik-tier-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("radio", { name: /Varshik Gold/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("varshik-tier-continue")).toHaveText("Continue with Varshik Gold • ₹599 (34+ pages)");
  await expect(sheet).toContainText("Varshik Gold short description");

  await sheet.getByRole("radio", { name: /Varshik Snapshot/ }).click();
  await expect(sheet).toContainText("Detailed life-area readings");
  await expect(page.getByTestId("varshik-tier-continue")).toHaveText("Continue with Varshik Snapshot • ₹299 (20 pages)");
  await page.getByTestId("varshik-tier-continue").click();

  // Now the usual buy flow, with the chosen plan in the header and a way back.
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText(/Varshik Snapshot/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Change plan" })).toBeVisible();
  void api;
});
