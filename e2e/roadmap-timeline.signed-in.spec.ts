import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const TIMELINE = {
  birthDate: "1990-05-15",
  today: "2026-09-24",
  range: { from: "2023-09-24", to: "2029-09-24" },
  full: false,
  unlock: { unlocked: false, via: null, pricePaise: 9900 },
  approximateBirthTime: true,
  mahadashas: [{ planet: "Mercury", start: "2020-01-01", end: "2037-01-01" }],
  lanes: [
    {
      area: "career",
      bands: [
        {
          start: "2026-01-01",
          end: "2027-06-01",
          score: 80,
          level: "high",
          lords: ["Mercury", "Saturn"],
          why: [{ kind: "lordship", planet: "Saturn", house: 10, effect: 1, textKey: "timeline.why.rules", params: { planet: "Saturn", house: 10 } }],
        },
      ],
    },
    {
      area: "relationships",
      bands: [
        {
          start: "2027-03-01",
          end: "2029-01-12",
          score: 75,
          level: "high",
          lords: ["Mercury", "Venus"],
          why: [{ kind: "dasha", planet: "Venus", level: "antardasha", effect: 1, textKey: "timeline.why.karaka", params: { planet: "Venus" } }],
        },
      ],
    },
    { area: "money", bands: [] },
  ],
};

test.describe("Life Timeline (roadmap step 4)", () => {
  test("the page sends users home while nav.lifeTimeline is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/timeline");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/timeline")).toHaveLength(0);
  });

  test("with the flag on, shows the lanes, explains a band, and unlocks the whole life", async ({ page }) => {
    await skipLaunchOverlays(page);
    let unlocked = false;
    const api = await mockApi(page, {
      user: { features: { "nav.lifeTimeline": ON, "paid.lifeTimelineFull": { ...ON, pricePaise: 9900 } } },
      overrides: {
        "GET /v1/timeline": () => ({
          json: unlocked
            ? { ...TIMELINE, full: true, unlock: { unlocked: true, via: "purchase", pricePaise: 0 }, range: { from: "1990-05-15", to: "2070-05-15" } }
            : TIMELINE,
        }),
        "POST /v1/timeline/unlock": () => {
          unlocked = true;
          return { json: { unlocked: true, via: "purchase", pricePaise: 0 } };
        },
      },
    });
    await signIn(page, "/timeline");

    await expect(page.getByText("Life Timeline").first()).toBeVisible();
    await expect(page.getByText("Your birth time isn't exact", { exact: false })).toBeVisible();
    // Bars carry their years; a tap shows the years, where today sits, and what the period can bring.
    const careerBar = page.getByRole("button", { name: "Career 2026-01-01" });
    await expect(careerBar).toHaveText("2026–27");
    await careerBar.click();
    await expect(page.getByText("Career: Strong period")).toBeVisible();
    await expect(page.getByRole("heading", { name: "2026 – 2027" })).toBeVisible();
    await expect(page.getByText("Happening now · until Jun 1, 2027")).toBeVisible();
    await expect(page.getByText("A strong time for a new job", { exact: false })).toBeVisible();
    await expect(page.getByText("Saturn rules your 10th house (career).")).toBeVisible();
    // The shared bottom sheet labels its close button with tour.skip ("Skip").
    await page.getByRole("button", { name: "Skip" }).click();

    await page.getByRole("button", { name: "Relationships 2027-03-01" }).click();
    await expect(page.getByRole("heading", { name: "2027 – 2029" })).toBeVisible();
    await expect(page.getByText("Starts Mar 1, 2027 · in 5 months")).toBeVisible();
    await expect(page.getByText("A strong time for a relationship to begin", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    await page.getByRole("button", { name: /See your whole life · ₹99/ }).click();
    await expect.poll(() => callsTo(api, "POST /v1/timeline/unlock").length).toBe(1);
    await expect(page.getByRole("button", { name: /See your whole life/ })).toHaveCount(0);
  });
});
