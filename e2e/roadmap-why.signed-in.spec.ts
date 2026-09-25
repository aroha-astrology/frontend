import { test, expect } from "@playwright/test";
import { mockApi, callsTo, PASS_REQUIRED } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const WHY = {
  area: "overall",
  asOf: "2026-09-24T06:30:00.000Z",
  factors: [
    {
      kind: "dasha",
      level: "mahadasha",
      planet: "Mercury",
      house: 6,
      effect: 1,
      textKey: "why.dasha.mahadashaLinked",
      params: { planet: "Mercury", until: "2037-01-01", house: 6 },
    },
    {
      kind: "transit",
      planet: "Saturn",
      house: 10,
      sign: "Pisces",
      effect: -1,
      textKey: "why.transit",
      params: { planet: "Saturn", house: 10, sign: "Pisces" },
    },
  ],
  calculation: { ayanamsa: "lahiri", houseSystem: "W", nodeType: "mean", calculationVersion: "2026.08.1", calculatedAt: null },
  birth: { placeName: "Kolkata", timezone: "Asia/Kolkata" },
  birthTime: { pct: 72, level: "medium", basis: "stated_exact" },
};

test.describe("Why? (roadmap step 1)", () => {
  test("is hidden while home.whyAroha is off — the default", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page);
    await signIn(page, "/");
    await expect(page.getByText("A clear, steady day").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Why?" })).toHaveCount(0);
  });

  test("with the flag on, opens the chart evidence for today's reading", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "home.whyAroha": ON } },
      overrides: { "GET /v1/why": () => ({ json: WHY }) },
    });
    await signIn(page, "/");

    await page.getByRole("button", { name: "Why?" }).first().click();

    await expect(page.getByText("Why Aroha is saying this")).toBeVisible();
    await expect(page.getByText(/You're in Mercury Mahadasha until Jan 2037, and Mercury is tied to your 6th house/)).toBeVisible();
    await expect(page.getByText(/Saturn is moving through Pisces, your 10th house \(career\) counted from your Moon/)).toBeVisible();
    await expect(page.getByText("Birth time confidence: 72%")).toBeVisible();
    expect(callsTo(api, "GET /v1/why")[0]!.query.get("area")).toBe("overall");
  });

  test("the Birth Time Confidence card is Aroha Pass only: without it, Settings shows the lock", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "home.birthTimeConfidence": ON } },
      overrides: { "GET /v1/birth-time": () => PASS_REQUIRED },
    });
    await signIn(page, "/settings");

    await expect(page.getByTestId("pass-lock").getByText("Birth Time Confidence is part of Aroha Pass")).toBeVisible();
    await expect(page.getByRole("button", { name: "Improve birth-time accuracy" })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/birth-time/check")).toHaveLength(0);
  });
});
