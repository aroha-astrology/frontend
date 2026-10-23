import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// What the backend really stores for a horoscope window: a log line, not a sentence.
const DUE = {
  id: "p1",
  surface: "horoscope",
  domain: "legal",
  claim: "legal: favourable pratyantardasha window, rated MEDIUM",
  windowStart: "2026-07-23",
  windowEnd: "2026-10-22",
  confidence: "MEDIUM",
};

test.describe("How did that period go? card", () => {
  test("reads as a sentence about the life area, not the stored log line", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      overrides: { "GET /v1/predictions/due": () => ({ json: { predictions: [DUE] } }) },
    });
    await signIn(page, "/horoscope");

    const card = page.getByTestId("prediction-rating-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Legal matters", { exact: true })).toBeVisible();
    await expect(card.getByText(/23 Jul 2026/)).toBeVisible();
    await expect(card.getByText(/22 Oct 2026/)).toBeVisible();
    await expect(card.getByText(/moderate favourable phase/)).toBeVisible();
    // None of the raw wording from the stored claim.
    await expect(card).not.toContainText("pratyantardasha");
    await expect(card).not.toContainText("MEDIUM");
    await expect(card).not.toContainText("2026-07-23");

    await card.getByRole("button", { name: "Yes, that happened" }).click();
    await expect(page.getByText("Thank you — that helps us get better.")).toBeVisible();
    expect(callsTo(api, "POST /v1/predictions/p1/rate").length).toBe(1);
  });
});
