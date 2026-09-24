import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

test("period tabs load the matching personal reading", async ({ page }) => {
  await skipLaunchOverlays(page);
  const api = await mockApi(page);
  await signIn(page, "/horoscope");

  await expect(page.getByText("A clear, steady day").first()).toBeVisible();
  for (const [label, period] of [["Weekly", "weekly"], ["Monthly", "monthly"]] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect
      .poll(() => callsTo(api, "GET /v1/horoscope").some((c) => c.query.get("period") === period))
      .toBe(true);
  }
});
