import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { primaryProfile } from "./fixtures/data";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// Screens that used to fill in a fact the reader never gave (2026-10-20 audit): the free
// Kundli sent 12:00 as an exact birth time, and Palm read the right hand for anyone whose
// profile has no male/female gender.

async function mockPlaces(page: Page) {
  await page.route("**/api/places/search**", (route) =>
    route.fulfill({
      json: [{ id: "ldn", name: "London", district: "", state: "", pincode: "", description: "London, United Kingdom", lat: 51.5074, lon: -0.1278 }],
    }),
  );
  await page.route("**/api/places/geocode**", (route) =>
    route.fulfill({ json: { lat: 51.5074, lon: -0.1278, tz: "Europe/London" } }),
  );
}

const CHART = {
  profileId: "11111111-1111-4111-8111-111111111111",
  summary: "Ascendant: Leo",
  charts: { planets: [], houses: [], chart: { ascendant: { sign: "Leo" } } },
  insights: [],
};

async function generateKundli(page: Page, time: string | null) {
  await skipLaunchOverlays(page);
  await mockPlaces(page);
  const api = await mockApi(page, {
    // No saved chart yet, so the form shows.
    overrides: {
      "GET /v1/kundli": () => ({ status: 404, json: { error: { code: "NOT_FOUND", message: "none" } } }),
      "POST /v1/onboarding": (c) => ({
        json: { ...CHART, timeAccuracy: (c.body as { birth: { time?: string } }).birth.time ? "exact" : "unknown" },
      }),
    },
  });
  await signIn(page, "/kundli");
  await page.getByPlaceholder("Full name").fill("Ravi");
  await page.locator('input[type="date"]').fill("1990-05-15");
  if (time) await page.locator('input[type="time"]').fill(time);
  await page.getByPlaceholder("Birth Place (City, Country)").fill("London");
  await page.getByText("London, United Kingdom").first().click();
  await page.getByRole("button", { name: "Generate Kundli" }).click();
  return api;
}

test.describe("Free Kundli and the birth time", () => {
  test("a blank time sends none and the chart says it was cast for noon", async ({ page }) => {
    const api = await generateKundli(page, null);
    await expect(page.getByTestId("kundli-time-unknown")).toBeVisible();
    const [call] = callsTo(api, "POST /v1/onboarding");
    expect((call!.body as { birth: Record<string, unknown> }).birth).not.toHaveProperty("time");
  });

  test("a given time is sent as typed and no warning shows", async ({ page }) => {
    const api = await generateKundli(page, "14:30");
    await expect(page.getByTestId("kundli-time-unknown")).toHaveCount(0);
    const [call] = callsTo(api, "POST /v1/onboarding");
    expect((call!.body as { birth: { time: string } }).birth.time).toBe("14:30");
  });
});

test.describe("Palm: the main hand", () => {
  async function openWizard(page: Page, gender: "male" | "female" | "other" | null) {
    await skipLaunchOverlays(page);
    await page.context().grantPermissions([]);
    const api = await mockApi(page, {
      user: { gender },
      overrides: {
        // The active profile's gender is what counts, not the account's.
        "GET /v1/profiles": () => ({ json: [{ ...primaryProfile, gender }] }),
        "GET /v1/palm/readings": () => ({ json: { readings: [] } }),
        "POST /v1/palm/readings": (c) => ({
          json: {
            readingId: "22222222-2222-4222-8222-222222222222",
            primaryHand: (c.body as { primaryHand?: string } | null)?.primaryHand ?? (gender === "female" ? "left" : "right"),
          },
        }),
      },
    });
    await signIn(page, "/palm");
    await page.getByRole("button", { name: /Start a New Reading/ }).click();
    return api;
  }

  test("a profile with no male/female gender chooses the hand before anything starts", async ({ page }) => {
    const api = await openWizard(page, "other");
    await expect(page.getByTestId("palm-hand-choice")).toBeVisible();
    expect(callsTo(api, "POST /v1/palm/readings")).toHaveLength(0);

    await page.getByRole("button", { name: "Left hand" }).click();
    await expect.poll(() => callsTo(api, "POST /v1/palm/readings").length).toBe(1);
    expect(callsTo(api, "POST /v1/palm/readings")[0]!.body).toEqual({ primaryHand: "left" });
  });

  test("a woman or a man starts at once, by the classical rule", async ({ page }) => {
    const api = await openWizard(page, "female");
    await expect.poll(() => callsTo(api, "POST /v1/palm/readings").length).toBe(1);
    await expect(page.getByTestId("palm-hand-choice")).toHaveCount(0);
  });
});
