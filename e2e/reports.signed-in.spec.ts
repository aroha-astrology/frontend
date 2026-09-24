import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const PAST_LIFE = {
  key: "past_life",
  label: "Past Life Report",
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
const REPORT_ID = "22222222-2222-4222-8222-222222222222";

test("buying a report spends the wallet and opens the new report", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    overrides: {
      "GET /v1/reports": () => ({ json: { reports: [PAST_LIFE] } }),
      "POST /v1/reports/purchase": () => ({
        json: { reports: [{ id: REPORT_ID, reportKey: "past_life", periodMonth: null, status: "pending" }] },
      }),
      "GET /v1/reports/:id": () => ({ status: 202, json: { status: "generating" } }),
    },
  });
  await signIn(page, "/reports");

  const card = page.locator("div").filter({ hasText: "Past Life Report" }).filter({ has: page.getByRole("button", { name: "Buy", exact: true }) }).last();
  await card.getByRole("button", { name: "Buy", exact: true }).click();
  await page.getByRole("button", { name: /^Buy · ₹199/ }).click();
  await page.getByRole("button", { name: "Yes, Unlock" }).click();

  await expect.poll(() => callsTo(api, "POST /v1/reports/purchase").length).toBe(1);
  expect(callsTo(api, "POST /v1/reports/purchase")[0]!.body).toMatchObject({ reportKey: "past_life" });
  await page.waitForURL(`**/reports/${REPORT_ID}`);
});
