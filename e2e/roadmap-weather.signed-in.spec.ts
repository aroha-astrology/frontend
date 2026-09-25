import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };

const WEATHER = {
  date: "2026-09-24",
  header: { moonSign: "Pisces", mahadasha: "Mercury", antardasha: "Venus" },
  overall: { score: 60, trend: "improving", tomorrowScore: 80 },
  areas: [
    { key: "career", area: "career", score: 80, source: "horoscope" },
    { key: "relationships", area: "relationships", score: 55, source: "horoscope" },
    { key: "money", area: "money", score: 70, source: "horoscope" },
    { key: "energy", area: "health", score: 40, source: "horoscope" },
  ],
  moments: [{ kind: "moonSign", at: "2026-09-24T12:48:00.000Z", time: "18:18", from: "Aries", to: "Taurus" }],
  day: [
    { start: "06:10", end: "07:40", kind: "good", name: "Amrit" },
    { start: "13:30", end: "15:00", kind: "caution", name: "rahuKaal" },
  ],
  dayAvailable: true,
  why: [],
};

/**
 * Always windows over, one in progress and one to come, whatever time the test
 * runs (bar 00:00–00:01 and the last minute of the day, IST). Enough finished
 * windows that the list has to scroll to open on the one in progress.
 */
const WEATHER_NOW = {
  ...WEATHER,
  day: [
    ...["Amrit", "Shubh", "Labh", "Rog", "Kaal", "Udveg"].map((name) => ({
      start: "00:00",
      end: "00:01",
      kind: name === "Rog" || name === "Kaal" || name === "Udveg" ? "caution" : "good",
      name,
    })),
    { start: "00:01", end: "23:59", kind: "caution", name: "rahuKaal" },
    { start: "23:59", end: "24:00", kind: "good", name: "abhijit" },
  ],
};

/** Just enough panchang for the page to render its cards. */
const PANCHANG = { date: "2026-09-24", tithi: null, nakshatra: null, yoga: null, karana: null };

test.describe("Astro Weather (roadmap step 2)", () => {
  test("nothing shows, and nothing is fetched, while the flags are off", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page);
    await signIn(page, "/");
    await expect(page.getByText("A clear, steady day").first()).toBeVisible();
    await expect(page.getByText("Your Astro Weather")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/astro-weather")).toHaveLength(0);
  });

  test("with the flags on, home shows the weather, and Your Day has moved to Panchang", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "home.astroWeather": ON, "home.yourDay": ON } },
      overrides: { "GET /v1/astro-weather": () => ({ json: WEATHER }) },
    });
    await signIn(page, "/");

    await expect(page.getByText("Your Astro Weather")).toBeVisible();
    await expect(page.getByText("Pisces Moon · Mercury Dasha")).toBeVisible();
    await expect(page.getByText("Improving")).toBeVisible();
    await expect(page.getByRole("meter", { name: "Career" })).toHaveAttribute("aria-valuenow", "80");
    await expect(page.getByText("Moon moves into Taurus at 6:18 PM").first()).toBeVisible();
    await expect(page.getByText("Your Day")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/astro-weather")).toHaveLength(1);

    await page.getByRole("link", { name: /See full weather/ }).click();
    await page.waitForURL("**/weather");
    await expect(page.getByText("Important today")).toBeVisible();
  });

  test("Panchang's Your Day lists the whole day to midnight, opened on the window you're in", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "home.yourDay": ON } },
      overrides: {
        "GET /v1/astro-weather": () => ({ json: WEATHER_NOW }),
        "GET /v1/panchang": () => ({ json: PANCHANG }),
      },
    });
    await signIn(page, "/panchang");

    await expect(page.getByText("Your Day")).toBeVisible();
    await expect(page.getByText(/^Now \d{1,2}:\d{2} [AP]M$/)).toBeVisible();
    const list = page.getByRole("region", { name: "Your Day" });
    await list.scrollIntoViewIfNeeded();
    const past = list.getByText(/Amrit/);
    await expect(list.getByText(/Rahu Kaal/)).toBeInViewport();
    await expect(list.getByText("11:59 PM – 12:00 AM")).toBeVisible();
    await expect(past).toBeAttached();
    await expect(past).not.toBeInViewport();

    await past.scrollIntoViewIfNeeded();
    await expect(past).toBeInViewport();
  });

  test("the /weather page sends users home while the flag is off", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page);
    await signIn(page, "/weather");
    await page.waitForURL((url) => url.pathname === "/");
  });
});
