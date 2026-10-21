import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// A reader abroad gets the horoscope for their own day: the app sends the
// device's zone, and the server picks "today" on that clock.
test.use({ timezoneId: "America/New_York" });

test("the horoscope request carries the device's time zone", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page);
  await signIn(page, "/horoscope");

  await expect(page.getByText("A clear, steady day").first()).toBeVisible();
  const calls = callsTo(api, "GET /v1/horoscope");
  expect(calls.length).toBeGreaterThan(0);
  for (const c of calls) expect(c.query.get("tz")).toBe("America/New_York");
});
