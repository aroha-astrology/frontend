import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

/**
 * A reader who only knew the part of the day has that part's midpoint saved (09:00 for the
 * morning). The app must say "morning", never print 09:00 as their birth time. Display only.
 */

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const statusFor = (time: string, accuracy: "exact" | "unknown", basis: string) => ({
  time,
  accuracy,
  source: null,
  confidence: { pct: accuracy === "exact" ? 72 : 20, level: accuracy === "exact" ? "medium" : "low", basis },
  latest: null,
});

test("a part-of-day reader sees the part of the day on the card and in the menu, never 09:00", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: {
      timeOfBirth: "09:00:00",
      birthTimeAccuracy: "unknown",
      features: { "home.birthTimeConfidence": ON },
    },
    overrides: { "GET /v1/birth-time": () => ({ json: statusFor("09:00:00", "unknown", "part_of_day") }) },
  });
  await signIn(page, "/settings");

  const card = page.getByTestId("birth-time-card");
  await expect(card).toContainText("You were born in the morning (06:00 – 12:00)");
  await expect(card.getByTestId("birth-time-not-exact")).toContainText("We can suggest one");
  await expect(card).not.toContainText("09:00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu.getByTestId("menu-birth-time")).toHaveText("Morning");
  await expect(menu).not.toContainText("9:00");
});

test("unknown with exactly 12:00 says no time was given", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { timeOfBirth: "12:00:00", birthTimeAccuracy: "unknown", features: { "home.birthTimeConfidence": ON } },
    overrides: { "GET /v1/birth-time": () => ({ json: statusFor("12:00:00", "unknown", "part_of_day") }) },
  });
  await signIn(page, "/settings");

  await expect(page.getByTestId("birth-time-card")).toContainText("No birth time was given");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByTestId("menu-birth-time")).toHaveCount(0);
});

test("an exact-time reader still sees the clock time", async ({ page }) => {
  await skipLaunchOverlays(page);
  await mockApi(page, {
    user: { timeOfBirth: "06:40:00", birthTimeAccuracy: "exact", features: { "home.birthTimeConfidence": ON } },
    overrides: { "GET /v1/birth-time": () => ({ json: statusFor("06:40:00", "exact", "stated_exact") }) },
  });
  await signIn(page, "/settings");

  await expect(page.getByTestId("birth-time-card")).toContainText("Your birth time: 06:40");
  await expect(page.getByTestId("birth-time-not-exact")).toHaveCount(0);
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu" }).getByTestId("menu-birth-time")).toContainText("6:40");
});
