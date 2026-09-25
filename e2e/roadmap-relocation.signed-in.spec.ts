import { test, expect, type Page } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const AREAS = ["career", "relationships", "finance", "education", "family", "lifestyle"] as const;

function status(opts: { unlocked?: boolean; level?: "low" | "medium" | "high" } = {}) {
  const level = opts.level ?? "high";
  return {
    confidence: { pct: level === "low" ? 30 : 85, level },
    blocked: level === "low",
    unlock: opts.unlocked ? { unlocked: true, via: "purchase", pricePaise: 0 } : { unlocked: false, via: null, pricePaise: 9900 },
    birthPlace: { name: "Delhi, India" },
  };
}

function place(name: string, lat: number, lon: number, isBirthPlace: boolean, base: number) {
  const areas = Object.fromEntries(
    AREAS.map((a, i) => {
      const score = base + i;
      const level = score >= 70 ? "strong" : score >= 55 ? "good" : score >= 40 ? "mixed" : "weak";
      return [
        a,
        {
          score,
          level,
          why:
            a === "career"
              ? [
                  { kind: "house", house: 10, effect: 1, textKey: "relocation.why.sav", params: { house: 10, points: 33 } },
                  { kind: "house", planet: "Saturn", house: 10, effect: 1, textKey: "relocation.why.occupant", params: { planet: "Saturn", house: 10 } },
                ]
              : [],
        },
      ];
    }),
  );
  return { name, lat, lon, isBirthPlace, ascendantSign: isBirthPlace ? "Leo" : "Aries", overall: base + 2, areas };
}

/** Worldwide city search: the page's own /api/places routes, answered here. */
async function mockPlaces(page: Page) {
  await page.route("**/api/places/search**", (route) =>
    route.fulfill({
      json: [
        { id: "ldn", name: "London", district: "", state: "", pincode: "", description: "London, United Kingdom", lat: 51.5074, lon: -0.1278 },
      ],
    }),
  );
  await page.route("**/api/places/geocode**", (route) =>
    route.fulfill({ json: { lat: 51.5074, lon: -0.1278, tz: "Europe/London" } }),
  );
}

test.describe("Aroha Relocation (roadmap step 12)", () => {
  test("the page and menu entry stay hidden while the flag is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/relocation");
    await page.waitForURL((url) => url.pathname === "/");
    expect(callsTo(api, "GET /v1/relocation")).toHaveLength(0);
  });

  test("unlock once, add a city, compare, and tap a score for the reasons", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockPlaces(page);
    let unlocked = false;
    const api = await mockApi(page, {
      user: { features: { "nav.relocation": ON, "paid.relocation": { ...ON, pricePaise: 9900 } } },
      overrides: {
        "GET /v1/relocation": () => ({ json: status({ unlocked }) }),
        "POST /v1/relocation/unlock": () => {
          unlocked = true;
          return { json: { unlocked: true, via: "purchase", pricePaise: 0 } };
        },
        "POST /v1/relocation/compare": () => ({
          json: {
            places: [place("Delhi, India", 28.61, 77.21, true, 50), place("London, United Kingdom", 51.5074, -0.1278, false, 66)],
          },
        }),
      },
    });
    await signIn(page, "/relocation");

    await expect(page.getByTestId("relocation-locked")).toBeVisible();
    await page.getByRole("button", { name: "Unlock for ₹99" }).click();
    expect(callsTo(api, "POST /v1/relocation/unlock")).toHaveLength(1);

    const compare = page.getByRole("button", { name: "Compare" });
    await expect(compare).toBeDisabled();
    await page.getByPlaceholder("Search any city").fill("Lond");
    await page.getByText("London, United Kingdom").click();
    await expect(page.getByRole("button", { name: "Remove London, United Kingdom" })).toBeVisible();
    await compare.click();

    const sent = callsTo(api, "POST /v1/relocation/compare");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.body).toEqual({ places: [{ name: "London, United Kingdom", lat: 51.5074, lon: -0.1278 }] });

    const table = page.getByTestId("relocation-results");
    await expect(table.getByText("Rising sign: Leo")).toBeVisible();
    await expect(table.getByText("Rising sign: Aries")).toBeVisible();
    await expect(table.getByText("Birth place")).toBeVisible();

    await table.getByRole("button", { name: "London, United Kingdom · Career · 66" }).click();
    const why = page.getByTestId("relocation-why");
    await expect(why.getByText("Your 10th house (career) has 33 Ashtakavarga points here (28 is average).")).toBeVisible();
    await expect(why.getByText("Saturn sits in your 10th house (career) here.")).toBeVisible();
    await expect(why.getByText("Good")).toBeVisible();
  });

  test("a low birth-time confidence blocks the page with a way to improve it", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "nav.relocation": ON, "paid.relocation": { ...ON, pricePaise: 9900 } } },
      overrides: { "GET /v1/relocation": () => ({ json: status({ level: "low" }) }) },
    });
    await signIn(page, "/relocation");
    const blocked = page.getByTestId("relocation-blocked");
    await expect(blocked.getByText(/30% confidence/)).toBeVisible();
    await expect(blocked.getByRole("link", { name: "Improve birth-time accuracy" })).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
    expect(callsTo(api, "POST /v1/relocation/compare")).toHaveLength(0);
  });

  test("the unlock button hides while paid.relocation is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.relocation": ON } },
      overrides: { "GET /v1/relocation": () => ({ json: status() }) },
    });
    await signIn(page, "/relocation");
    await expect(page.getByTestId("relocation-locked")).toBeVisible();
    await expect(page.getByRole("button", { name: /Unlock/ })).toHaveCount(0);
  });
});
