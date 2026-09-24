import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { makeHoroscope } from "./fixtures/data";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

test.describe("Home (signed in)", () => {
  for (const score of [4, 2]) {
    test(`Today card shows ${score} filled stars for a score-${score} day`, async ({ page }) => {
      await skipLaunchOverlays(page);
      const api = await mockApi(page, {
        overrides: { "GET /v1/horoscope": (c) => ({ json: makeHoroscope(c.query.get("period") ?? "daily", score) }) },
      });
      await signIn(page, "/");

      await expect(page.getByText(/Asha/).first()).toBeVisible();
      const today = page.locator("div.p-5").filter({ hasText: "A clear, steady day" }).first();
      await expect(today).toBeVisible();
      await expect(today.locator("svg.fill-gold")).toHaveCount(score);

      expect(callsTo(api, "POST /v1/auth/session").length).toBeGreaterThan(0);
      expect(callsTo(api, "GET /v1/horoscope").some((c) => c.query.get("period") === "daily")).toBe(true);
    });
  }
});
