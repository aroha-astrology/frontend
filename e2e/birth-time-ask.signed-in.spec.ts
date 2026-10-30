import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * Audit M7: a reader who typed a birth time but never rated it is asked once where it comes from.
 * Answering saves the rating (and its source) through the normal profile update; the switch
 * `home.birthTimeAsk` ships off.
 */
const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const OFF = { enabled: false, pricePaise: null, originalPricePaise: null };
/** The app also PATCHes {contentLanguage} on load; only the calls that carry the rating are the answer. */
const answers = (api: Parameters<typeof callsTo>[0]) =>
  callsTo(api, "PATCH /v1/me").filter((c) => c.body && "birthTimeAccuracy" in (c.body as object));
const UNRATED = { birthTimeAccuracy: null, timeOfBirth: "10:15:00" };

test("an unrated reader is asked once, on a 360px phone every answer fits, and answering saves it", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { ...UNRATED, features: { "home.birthTimeAsk": ON } } });
  await signIn(page, "/");

  const ask = page.getByTestId("birth-time-ask");
  await expect(ask).toBeVisible();
  await expect(page.getByText("Where does your birth time come from?")).toBeVisible();
  for (const name of ["From a birth record", "Someone in the family remembers it", "I'm not sure"]) {
    const b = (await page.getByRole("button", { name: new RegExp(name) }).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(360);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: /Someone in the family remembers it/ }).click();
  await expect.poll(() => answers(api).length).toBe(1);
  expect(answers(api)[0]!.body).toEqual({
    birthTimeAccuracy: "approximate",
    birthTimeSource: "family_memory",
  });
  await expect(ask).toHaveCount(0);
});

test("'Not now' closes it and it stays quiet after a reload", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page, { user: { ...UNRATED, features: { "home.birthTimeAsk": ON } } });
  await signIn(page, "/");
  await page.getByTestId("birth-time-ask-later").click();
  await expect(page.getByTestId("birth-time-ask")).toHaveCount(0);
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("birth-time-ask")).toHaveCount(0);
  expect(answers(api)).toHaveLength(0);
});

test("never shown with the switch off, or to a reader who already rated their time", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, { user: { ...UNRATED, features: { "home.birthTimeAsk": OFF } } });
  await signIn(page, "/");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("birth-time-ask")).toHaveCount(0);

  const rated = await page.context().newPage();
  await skipLaunchOverlays(rated);
  await mockApi(rated, { user: { birthTimeAccuracy: "exact", features: { "home.birthTimeAsk": ON } } });
  await signIn(rated, "/");
  await rated.waitForTimeout(1500);
  await expect(rated.getByTestId("birth-time-ask")).toHaveCount(0);
});
