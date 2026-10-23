import { test, expect } from "@playwright/test";
import { mockApi, callsTo } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { LiveNow } from "../lib/live-now";

// The Now Bar on Home (switch live.nowBar): what is running right now where the reader is.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const LONDON = { latitude: 51.5072, longitude: -0.1276 };

const live = (over: Partial<LiveNow> = {}): LiveNow => ({
  v: 1,
  asOf: new Date().toISOString(),
  tz: "Europe/London",
  date: "2026-10-23",
  clock: "10:30",
  tithi: { n: 12, name: "Dwadashi", paksha: "Shukla" },
  nakshatra: { name: "Mrigashira", pada: 2 },
  vara: "Budhvaar",
  hora: { planet: "Mercury", start: "10:00", end: "11:00", good: true },
  choghadiya: { name: "Labh", type: "good", start: "10:30", end: "12:00" },
  rahuKaal: { start: "12:00", end: "13:30", on: false },
  abhijit: { start: "12:06", end: "12:54", on: false },
  nextGood: { label: "Abhijit", start: "12:06", inMin: 96 },
  nextCaution: { label: "Rahu Kaal", start: "12:00", inMin: 90 },
  sunrise: "06:30",
  sunset: "18:30",
  ...over,
});

test.describe("with a shared location", () => {
  test.use({ timezoneId: "Europe/London", geolocation: LONDON, permissions: ["geolocation"] });

  test("shows the choghadiya, the hora and the next windows for the reader's own place", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "live.nowBar": ON } },
      overrides: { "GET /v1/widgets/live-now": () => ({ json: live() }) },
    });
    await signIn(page, "/");

    const bar = page.getByTestId("now-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute("data-tone", "good");
    await expect(page.getByTestId("now-bar-lead")).toContainText("Labh choghadiya until 12:00");
    await expect(page.getByTestId("now-bar-hora")).toContainText("Hora of Mercury until 11:00");
    await expect(page.getByTestId("now-bar-next-good")).toContainText("Next good window: Abhijit Muhurta at 12:06, in 1 h 36 min");
    await expect(page.getByTestId("now-bar-next-caution")).toContainText("Rahu Kaal starts at 12:00, in 1 h 30 min");
    await expect(bar).toContainText("Dwadashi (Shukla)");
    // A real place, not the Delhi fallback.
    await expect(bar).not.toContainText("Showing Delhi");

    const call = callsTo(api, "GET /v1/widgets/live-now")[0]!;
    expect(call.query.get("tz")).toBe("Europe/London");
    expect(Math.abs(Number(call.query.get("lat")) - LONDON.latitude)).toBeLessThan(0.01);
    expect(Math.abs(Number(call.query.get("lon")) - LONDON.longitude)).toBeLessThan(0.01);
  });

  test("leads with a caution while Rahu Kaal is on", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "live.nowBar": ON } },
      overrides: {
        "GET /v1/widgets/live-now": () => ({
          json: live({ rahuKaal: { start: "12:00", end: "13:30", on: true }, nextCaution: null }),
        }),
      },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("now-bar")).toHaveAttribute("data-tone", "caution");
    await expect(page.getByTestId("now-bar-lead")).toContainText("Rahu Kaal is on until 13:30");
    await expect(page.getByTestId("now-bar-next-caution")).toHaveCount(0);
  });

  test("leads with Abhijit Muhurta while it is on", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "live.nowBar": ON } },
      overrides: {
        "GET /v1/widgets/live-now": () => ({ json: live({ abhijit: { start: "12:06", end: "12:54", on: true } }) }),
      },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("now-bar-lead")).toContainText("Abhijit Muhurta is on until 12:54");
  });

  test("shows nothing when the answer cannot be had", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, {
      user: { features: { "live.nowBar": ON } },
      overrides: { "GET /v1/widgets/live-now": () => ({ status: 404, json: { error: { code: "NOT_FOUND", message: "Not available yet" } } }) },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("now-bar")).toHaveCount(0);
    await expect(page.getByTestId("now-bar-loading")).toHaveCount(0);
  });
});

test.describe("switch and fallback", () => {
  test("with the switch off there is no card and no request", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "live.nowBar": { ...ON, enabled: false } } },
      overrides: { "GET /v1/widgets/live-now": () => ({ json: live() }) },
    });
    await signIn(page, "/");
    await expect(page.getByTestId("home-greeting").or(page.locator("main")).first()).toBeVisible();
    await expect(page.getByTestId("now-bar")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/widgets/live-now")).toHaveLength(0);
  });

  test("without a shared location it shows Delhi and says so", async ({ page }) => {
    await skipLaunchOverlays(page);
    const api = await mockApi(page, {
      user: { features: { "live.nowBar": ON } },
      overrides: { "GET /v1/widgets/live-now": () => ({ json: live({ tz: "Asia/Kolkata" }) }) },
    });
    await signIn(page, "/");
    const bar = page.getByTestId("now-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("Showing Delhi");
    await expect(page.getByTestId("now-bar-place")).toContainText("Delhi");
    const call = callsTo(api, "GET /v1/widgets/live-now")[0]!;
    expect(call.query.get("tz")).toBe("Asia/Kolkata");
    expect(Number(call.query.get("lat"))).toBeCloseTo(28.6139, 3);
  });
});
