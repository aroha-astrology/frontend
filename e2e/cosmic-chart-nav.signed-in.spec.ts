import { test, expect, type Page } from "@playwright/test";
import { mockApi, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { ExperienceInfo } from "../lib/experience";

// Sprint 2 rest: "why your sign can be different", the 360° wheel, diaspora remedies, Person A/B,
// sub-tab pills and the short menu (switches experience.signShift, experience.wheelChart,
// experience.nriMode, experience.picker, nav.pills, nav.shortMenu). Every one ships OFF.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const on = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, ON]));

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

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

/** A chart with the Sun and Moon at the given sidereal longitudes; the rest are spread round the zodiac. */
function chartWith(sunLon: number, moonLon: number) {
  const lons = [sunLon, moonLon, 100, 130, 200, 250, 300, 330, 150];
  const planets = GRAHAS.map((planet, i) => ({
    planet,
    longitude: lons[i],
    sign: SIGNS[Math.floor(lons[i]! / 30) % 12],
    signIndex: Math.floor(lons[i]! / 30) % 12,
    house: ((Math.floor(lons[i]! / 30) - 4 + 12) % 12) + 1,
    isRetrograde: planet === "Saturn",
  }));
  const houses = Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    sign: SIGNS[(4 + i) % 12],
    signIndex: (4 + i) % 12,
    lord: "Sun",
    planets: planets.filter((p) => p.house === i + 1).map((p) => p.planet),
  }));
  return {
    profileId: "11111111-1111-4111-8111-111111111111",
    summary: "Ascendant: Leo",
    charts: {
      planets,
      houses,
      chart: { ascendant: { sign: "Leo", ascendantSign: "Leo", degrees: 10 }, ayanamsaValue: 24.2 },
    },
    insights: [],
    timeAccuracy: "exact",
  };
}

async function openKundli(page: Page, features: Record<string, typeof ON>, chart: ReturnType<typeof chartWith>, overrides: Handlers = {}) {
  await skipLaunchOverlays(page);
  await mockPlaces(page);
  await mockApi(page, {
    user: { features },
    overrides: {
      "GET /v1/kundli": () => ({ status: 404, json: { error: { code: "NOT_FOUND", message: "none" } } }),
      "POST /v1/onboarding": () => ({ json: chart }),
      ...overrides,
    },
  });
  await signIn(page, "/kundli");
  await page.getByPlaceholder("Full name").fill("Ravi");
  await page.locator('input[type="date"]').fill("1990-05-15");
  await page.locator('input[type="time"]').fill("14:30");
  await page.getByPlaceholder("Birth Place (City, Country)").fill("London");
  await page.getByText("London, United Kingdom").first().click();
  await page.getByRole("button", { name: "Generate Kundli" }).click();
}

const cosmicExperience = (): Handlers => ({
  "GET /v1/me/experience": () => ({
    json: { enabled: true, skin: "MODERN_COSMIC", picked: true, freeChangeLeft: true, canChange: true, nextAllowedAt: null } satisfies ExperienceInfo,
  }),
});

test.describe("Why your sign can be different", () => {
  test("shows the reader's own Western and Vedic Sun and Moon, and says when a sign moved", async ({ page }) => {
    // Sidereal Aquarius 10° + 24.2° = Western Pisces; sidereal Aries 10° + 24.2° = Western Taurus.
    await openKundli(page, on("experience.signShift"), chartWith(310, 10));
    const card = page.getByTestId("sign-shift-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("sign-shift-sun")).toContainText("Western · Pisces");
    await expect(page.getByTestId("sign-shift-sun")).toContainText("Vedic · Aquarius");
    await expect(page.getByTestId("sign-shift-sun")).toContainText("your Sun is in Pisces");
    await expect(page.getByTestId("sign-shift-moon")).toContainText("Taurus");
    await expect(card).toContainText("24°");
    await expect(card).not.toContainText("NASA");
  });

  test("says plainly when the Sun does not change sign", async ({ page }) => {
    // Sidereal Leo 2° + 24.2° is still Leo.
    await openKundli(page, on("experience.signShift"), chartWith(122, 10));
    await expect(page.getByTestId("sign-shift-sun")).toContainText("Your Sun stays in Leo in both systems");
    await expect(page.getByTestId("sign-shift-moon")).toContainText("Taurus");
  });

  test("is not on the Kundli page while its switch is off", async ({ page }) => {
    await openKundli(page, {}, chartWith(310, 10));
    await expect(page.getByTestId("chart-style-north")).toBeVisible();
    await expect(page.getByTestId("sign-shift-card")).toHaveCount(0);
  });
});

test.describe("360° wheel", () => {
  test("is a third chart style on the natal chart, drawn with every planet", async ({ page }) => {
    await openKundli(page, on("experience.wheelChart"), chartWith(310, 10));
    // Without the Cosmic look, North stays the default.
    await expect(page.getByTestId("sidereal-wheel")).toHaveCount(0);
    await page.getByTestId("chart-style-wheel").click();
    const wheel = page.getByTestId("sidereal-wheel");
    await expect(wheel).toBeVisible();
    for (const planet of GRAHAS) await expect(page.getByTestId(`wheel-planet-${planet}`)).toHaveCount(1);
    for (let i = 0; i < 12; i++) await expect(page.getByTestId(`wheel-sign-${i}`)).toHaveCount(1);
    // It is the natal chart only: Navamsa goes back to North/South.
    await page.getByRole("button", { name: /Navamsa/ }).first().click();
    await expect(page.getByTestId("chart-style-wheel")).toHaveCount(0);
    await expect(page.getByTestId("sidereal-wheel")).toHaveCount(0);
  });

  test("is the default in the Modern Cosmic look, and North is one tap away", async ({ page }) => {
    await openKundli(page, on("experience.wheelChart", "experience.picker"), chartWith(310, 10), cosmicExperience());
    await expect(page.getByTestId("sidereal-wheel")).toBeVisible();
    await page.getByTestId("chart-style-north").click();
    await expect(page.getByTestId("sidereal-wheel")).toHaveCount(0);
  });

  test("has no Wheel tab while its switch is off", async ({ page }) => {
    await openKundli(page, {}, chartWith(310, 10));
    await expect(page.getByTestId("chart-style-south")).toBeVisible();
    await expect(page.getByTestId("chart-style-wheel")).toHaveCount(0);
  });
});

test.describe("Living outside India? remedies", () => {
  const remedy = {
    planet: "Sun",
    title: "Sun",
    remedy: "Offer water to the Sun.",
    icon: "sun",
    natalHouse: 3,
    remedies: ["Offer water to the rising Sun."],
    totke: [],
  };
  const context = (isNri: boolean) => ({
    travelPill: true,
    nriMode: true,
    homeLocation: { name: "Mumbai", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" },
    homeTimezone: "Asia/Kolkata",
    skyMode: "HOME",
    skyDismissedTz: null,
    isNri,
  });

  async function openRemedies(page: Page, features: Record<string, typeof ON>, isNri: boolean) {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "nav.remedies": ON, ...features } },
      overrides: {
        "GET /v1/remedies": () => ({ json: { remedies: [remedy], debts: [], annual: null, simple: null, simpleStatus: "unavailable" } }),
        "GET /v1/me/context": () => ({ json: context(isNri) }),
      },
    });
    await signIn(page, "/remedies");
  }

  test("a reader who lives outside India sees a modern stand-in under the planet's remedy", async ({ page }) => {
    await openRemedies(page, on("experience.nriMode"), true);
    const box = page.getByTestId("diaspora-remedy");
    await expect(box).toBeVisible();
    await expect(box).toContainText("Living outside India?");
    await expect(box).toContainText("glass of water to the Sun");
    await expect(box).toContainText("not part of the classic text");
  });

  test("nothing shows for a reader in India, or while the switch is off", async ({ page }) => {
    await openRemedies(page, on("experience.nriMode"), false);
    await expect(page.getByText("Offer water to the rising Sun.")).toBeVisible();
    await expect(page.getByTestId("diaspora-remedy")).toHaveCount(0);
  });

  test("nothing shows while nriMode is off, even for a reader who said they live abroad", async ({ page }) => {
    await openRemedies(page, on("experience.travelPill"), true);
    await expect(page.getByText("Offer water to the rising Sun.")).toBeVisible();
    await expect(page.getByTestId("diaspora-remedy")).toHaveCount(0);
  });
});

test.describe("Person A / Person B", () => {
  test("Kundli Matching names the two people A and B in the Modern Cosmic look, and keeps Person 1 and 2 otherwise", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("experience.picker") }, overrides: cosmicExperience() });
    await signIn(page, "/compatibility");
    await expect(page.getByText("Person A", { exact: true })).toBeVisible();
    await expect(page.getByText("Person B", { exact: true })).toBeVisible();
    await expect(page.getByText("Person 1", { exact: true })).toHaveCount(0);
  });

  test("the Classic look keeps Person 1 and Person 2", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: {} } });
    await signIn(page, "/compatibility");
    await expect(page.getByText("Person 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Person A", { exact: true })).toHaveCount(0);
  });
});

test.describe("Sub-tab pills", () => {
  test("a row of related pages sits under the top bar, and leaves out a page whose own switch is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("nav.pills", "nav.calendar") } });
    await signIn(page, "/horoscope");
    const row = page.getByTestId("sub-tab-pills");
    await expect(row).toBeVisible();
    await expect(page.getByTestId("pill-horoscope")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("pill-calendar")).toBeVisible();
    // The life timeline switch is off, so its pill is left out.
    await expect(page.getByTestId("pill-timeline")).toHaveCount(0);
    await page.getByTestId("pill-calendar").click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.getByTestId("pill-calendar")).toHaveAttribute("aria-current", "page");
  });

  test("no row on a page that is not one of the pills, or while the switch is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("nav.pills") } });
    await signIn(page, "/settings");
    await expect(page.getByTestId("sub-tab-pills")).toHaveCount(0);
    await page.goto("/horoscope");
    // Only Horoscope is left in the Forecast row once Calendar and Timeline are off: fewer than two, so no row.
    await expect(page.getByTestId("sub-tab-pills")).toHaveCount(0);
  });

  test("off means today's app: no row at all", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: on("nav.calendar") } });
    await signIn(page, "/horoscope");
    await expect(page.getByTestId("sub-tab-pills")).toHaveCount(0);
  });
});

test.describe("Short menu", () => {
  const FEATURES = on("nav.calendar", "nav.journal");

  test("six places up front, the rest under More, nothing lost", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: { ...FEATURES, "nav.shortMenu": ON } } });
    await signIn(page, "/");
    await page.getByRole("button", { name: "Menu" }).click();

    await expect(page.getByText("Profile & Experience")).toBeVisible();
    await expect(page.getByText("Chat History", { exact: true })).toBeVisible();
    await expect(page.getByText("Need Help")).toBeVisible();
    // The page links are folded.
    await expect(page.getByTestId("menu-more")).toHaveCount(0);
    await expect(page.getByText("Calendar", { exact: true })).toHaveCount(0);

    await page.getByText("More", { exact: true }).click();
    const more = page.getByTestId("menu-more");
    await expect(more).toBeVisible();
    await expect(more.getByText("Calendar", { exact: true })).toBeVisible();
    await expect(more.getByText("My Reports", { exact: false })).toBeVisible();
    await page.getByText("Less", { exact: true }).click();
    await expect(page.getByTestId("menu-more")).toHaveCount(0);
  });

  test("off means today's long menu", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { user: { features: FEATURES } });
    await signIn(page, "/");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByText("Calendar", { exact: true })).toBeVisible();
    await expect(page.getByText("Profile & Experience")).toHaveCount(0);
    await expect(page.getByText("More", { exact: true })).toHaveCount(0);
  });
});
