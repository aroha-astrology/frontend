import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import { primaryProfile } from "./fixtures/data";

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

test("a saved family profile is asked about by name once the reader switches to it, and the answer goes to that profile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await skipLaunchOverlays(page);
  const meera = {
    id: "5a1f0c52-0000-4000-8000-000000000001",
    isPrimary: false,
    relationship: "mother",
    displayName: "Meera",
    gender: "female",
    dateOfBirth: "1962-02-03",
    timeOfBirth: "06:30",
    birthTimeAccuracy: null,
    placeOfBirth: { name: "Pune, India", lat: 18.52, lon: 73.85, tz: "Asia/Kolkata" },
    createdAt: "2026-05-01T00:00:00.000Z",
  };
  // A fresh open always lands on the owner's own profile; the family profile is active only after a switch.
  let activeId = primaryProfile.id;
  const profiles = () => [primaryProfile, meera].map((p) => ({ ...p, isActive: p.id === activeId }));
  const api = await mockApi(page, {
    // The owner's own time is already rated, so only the family profile can be the question.
    user: { birthTimeAccuracy: "exact", features: { "home.birthTimeAsk": ON } },
    overrides: {
      "GET /v1/profiles": () => ({ json: profiles() }),
      "POST /v1/profiles/:id/activate": (c) => {
        activeId = c.path.split("/")[3]!;
        return { json: profiles().find((p) => p.id === activeId) };
      },
      "PATCH /v1/birth-profiles/:id": () => ({ json: {} }),
    },
  });
  await signIn(page, "/");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("birth-time-ask")).toHaveCount(0);

  await page.getByRole("button", { name: "Menu", exact: true }).first().click();
  await page.getByRole("button", { name: "Add Profile", exact: true }).click();
  await page.getByRole("button", { name: /Meera/ }).click();
  await expect.poll(() => activeId).toBe(meera.id);

  await expect(page.getByText("Where does Meera's birth time come from?")).toBeVisible();
  await page.getByRole("button", { name: /From a birth record/ }).click();
  await expect.poll(() => callsTo(api, `PATCH /v1/birth-profiles/${meera.id}`).length).toBe(1);
  expect(callsTo(api, `PATCH /v1/birth-profiles/${meera.id}`)[0]!.body).toEqual({
    birthTimeAccuracy: "exact",
    birthTimeSource: "birth_certificate",
  });
  // The owner's own profile was never touched.
  expect(answers(api)).toHaveLength(0);
});
