import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Audit Sprint 16: a reader whose saved Kundli was built by an older calculation sees a notice on Home
 * (and only on Home) with "Open Kundli" and "Later". The server tells the app through GET /v1/me
 * (`kundliOutdated`, `kundliUpdating`).
 */
const OUTDATED = { kundliOutdated: true, kundliUpdating: false };
const READY = { status: "ready", chart: { planets: [], houses: [] }, dasha: null, yogas: { yogas: [] }, doshas: {} };

test.use({ viewport: { width: 360, height: 780 } });

test("an outdated chart shows the notice on Home, it fits a 360px phone and the buttons are tappable", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: OUTDATED });
  await signIn(page, "/");

  const notice = page.getByTestId("kundli-update");
  await expect(notice).toBeVisible();
  await expect(page.getByText("Your Kundli needs a quick update")).toBeVisible();
  for (const id of ["kundli-update-open", "kundli-update-later"]) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(360);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("it never shows on a page other than Home", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: OUTDATED });
  await signIn(page, "/profile");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);
});

test("Open Kundli lands on Kundli, and once the chart is rebuilt the notice is gone on Home", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, {
    user: OUTDATED,
    overrides: {
      // Opening Kundli is what rebuilds the chart: from then on the server reports it current.
      // (Home also reads the chart for its cards, so only the Kundli page counts.)
      "GET /v1/kundli": (_c, s) => {
        if (/\/kundli$/.test(page.url())) s.user = { ...s.user, kundliOutdated: false };
        return { json: READY };
      },
    },
  });
  await signIn(page, "/");
  await page.getByTestId("kundli-update-open").click();
  await expect(page).toHaveURL(/\/kundli$/);
  await expect.poll(() => callsTo(api, "GET /v1/kundli").length).toBeGreaterThan(0);
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);
});

test("Later hides it, and it stays hidden after a reload", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: OUTDATED });
  await signIn(page, "/");
  await page.getByTestId("kundli-update-later").click();
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);
});

test("while the old chart is being rebuilt the notice says so and offers no Open button", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { kundliOutdated: false, kundliUpdating: true } });
  await signIn(page, "/");
  await expect(page.getByText("Your Kundli is updating")).toBeVisible();
  await expect(page.getByTestId("kundli-update-open")).toHaveCount(0);
});

test("a reader with a current chart never sees it", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { kundliOutdated: false, kundliUpdating: false } });
  await signIn(page, "/");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("kundli-update")).toHaveCount(0);
});
