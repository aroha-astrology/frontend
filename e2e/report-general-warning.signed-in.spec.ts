import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// A report bought with none of its questions answered can only read the chart in general terms,
// so Buy first asks whether the reader wants that or wants to go back and answer.

const WEALTH = {
  key: "wealth",
  label: "Wealth Report",
  isMonthly: false,
  isYearly: false,
  requiresPartner: false,
  enabled: true,
  isNew: false,
  pricePaise: 19_900,
  originalPricePaise: null,
  purchases: [],
  lastSpouseDetails: null,
};
const REPORT_ID = "33333333-3333-4333-8333-333333333333";

async function openWealthDrawer(page: Page) {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [WEALTH] } }),
      "POST /v1/reports/purchase": () => ({
        json: { reports: [{ id: REPORT_ID, reportKey: "wealth", periodMonth: null, status: "pending" }] },
      }),
      "GET /v1/reports/:id": () => ({ status: 202, json: { status: "generating" } }),
    },
  });
  await signIn(page, "/reports");
  const card = page
    .locator("div")
    .filter({ hasText: "Wealth Report" })
    .filter({ has: page.getByRole("button", { name: "Buy", exact: true }) })
    .last();
  await card.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(page.getByText(/If you skip them, we can only give a general reading/)).toBeVisible();
  return api;
}

test("buying with nothing answered offers to go back to the questions", async ({ page }) => {
  const api = await openWealthDrawer(page);

  await page.getByRole("button", { name: /^Buy · ₹199/ }).click();
  const warning = page.getByRole("alertdialog", { name: "Get a general report?" });
  await expect(warning).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes, Unlock" })).toHaveCount(0);

  await warning.getByRole("button", { name: "Answer the questions" }).click();
  await expect(warning).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salary / job" })).toBeFocused();

  await page.getByRole("button", { name: "Salary / job" }).click();
  await page.getByRole("button", { name: /^Buy · ₹199/ }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Yes, Unlock" }).click();

  await expect.poll(() => callsTo(api, "POST /v1/reports/purchase").length).toBe(1);
  expect(callsTo(api, "POST /v1/reports/purchase")[0]!.body).toMatchObject({
    reportKey: "wealth",
    answers: { incomeToday: "salaried" },
  });
});

test("the reader can still choose a general report", async ({ page }) => {
  const api = await openWealthDrawer(page);

  await page.getByRole("button", { name: /^Buy · ₹199/ }).click();
  await page.getByRole("button", { name: "Continue with a general report" }).click();
  await page.getByRole("button", { name: "Yes, Unlock" }).click();

  await expect.poll(() => callsTo(api, "POST /v1/reports/purchase").length).toBe(1);
  const body = callsTo(api, "POST /v1/reports/purchase")[0]!.body as Record<string, unknown>;
  expect(body).toMatchObject({ reportKey: "wealth" });
  expect(body.answers).toBeUndefined();
  await page.waitForURL(`**/reports/${REPORT_ID}`);
});
