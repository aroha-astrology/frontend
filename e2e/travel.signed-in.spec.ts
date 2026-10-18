import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type ApiCall, type Handlers } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";
import type { SkyContext, SkyContextUpdate } from "../lib/sky";

// The travel pill, the home city and NRI mode (switches experience.travelPill / experience.nriMode).
// A phone in New York while home is Mumbai: ask once, remember the answer for that zone.

const ON = { enabled: true, pricePaise: null, originalPricePaise: null };
const MUMBAI = { name: "Mumbai", lat: 19.076, lon: 72.8777, tz: "Asia/Kolkata" };
const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };

const context = (over: Partial<SkyContext> = {}): SkyContext => ({
  travelPill: true,
  nriMode: true,
  homeLocation: MUMBAI,
  homeTimezone: "Asia/Kolkata",
  skyMode: "HOME",
  skyDismissedTz: null,
  isNri: false,
  ...over,
});

/** A stand-in for the backend: applies a PUT the way sky-context.routes does. */
function skyServer(start: SkyContext) {
  let state = start;
  const handlers: Handlers = {
    "GET /v1/me/context": () => ({ json: state }),
    "PUT /v1/me/context": (c) => {
      const b = c.body as SkyContextUpdate;
      state = {
        ...state,
        ...(b.homeLocation !== undefined ? { homeLocation: b.homeLocation, homeTimezone: b.homeLocation?.tz ?? state.homeTimezone } : {}),
        ...(b.homeTimezone !== undefined && !b.homeLocation ? { homeTimezone: b.homeTimezone } : {}),
        ...(b.skyMode !== undefined ? { skyMode: b.skyMode } : {}),
        ...(b.skyDismissedTz !== undefined ? { skyDismissedTz: b.skyDismissedTz } : {}),
        ...(b.isNri !== undefined ? { isNri: b.isNri } : {}),
      };
      return { json: state };
    },
  };
  return { handlers, state: () => state };
}

const panchangReply = (call: ApiCall) => ({
  json: { date: call.query.get("date"), tithi: null, nakshatra: null, yoga: null, karana: null, sunriseTime: "07:13", sunsetTime: "18:08", dayTimesMode: "sunrise" },
});

const FEATURES = { "experience.travelPill": ON, "experience.nriMode": ON };

test.describe("in New York, home is Mumbai", () => {
  test.use({ timezoneId: "America/New_York", geolocation: NEW_YORK, permissions: ["geolocation"] });

  test("asks once on Home; 'keep Mumbai' is remembered for that zone and Panchang then reads Mumbai", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context());
    const api = await mockApi(page, {
      user: { features: FEATURES },
      overrides: { ...server.handlers, "GET /v1/panchang": panchangReply },
    });
    await signIn(page, "/");

    const pill = page.getByTestId("travel-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("You're in New York");
    await expect(pill).toContainText("keep Mumbai times");

    await page.getByTestId("travel-keep").click();
    await expect(pill).toHaveCount(0);
    expect(callsTo(api, "PUT /v1/me/context")[0]!.body).toEqual({
      skyMode: "TRAVEL_DISMISSED",
      skyDismissedTz: "America/New_York",
    });

    // Panchang now reads the home city on the home clock instead of the phone's place.
    await page.goto("/panchang");
    await expect(page.getByRole("button", { name: "Mumbai" })).toBeVisible();
    await expect
      .poll(() => callsTo(api, "GET /v1/panchang").some((c) => c.query.get("tz") === "Asia/Kolkata" && Math.abs(Number(c.query.get("lat")) - MUMBAI.lat) < 0.01))
      .toBe(true);
    await expect(page.getByTestId("travel-pill")).toHaveCount(0);
  });

  test("'use New York' follows the device and leaves a note about which clock is shown", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context());
    const api = await mockApi(page, {
      user: { features: FEATURES },
      overrides: { ...server.handlers, "GET /v1/panchang": panchangReply },
    });
    await signIn(page, "/");

    await page.getByTestId("travel-sync").click();
    await expect(page.getByTestId("travel-pill")).toHaveCount(0);
    await expect(page.getByTestId("travel-note")).toContainText("Showing times for New York");
    expect(callsTo(api, "PUT /v1/me/context")[0]!.body).toEqual({ skyMode: "TRAVEL_SYNCED" });
  });

  test("a different zone asks again after 'keep home'", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context({ skyMode: "TRAVEL_DISMISSED", skyDismissedTz: "Europe/London" }));
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/");
    await expect(page.getByTestId("travel-pill")).toContainText("You're in New York");
  });

  test("the first time, this device's zone is remembered as home, and nothing is asked", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context({ homeLocation: null, homeTimezone: null }));
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/");

    await expect.poll(() => callsTo(api, "PUT /v1/me/context").length).toBe(1);
    expect(callsTo(api, "PUT /v1/me/context")[0]!.body).toEqual({ homeTimezone: "America/New_York" });
    await expect(page.getByTestId("travel-pill")).toHaveCount(0);
  });

  test("with the switch off there is no pill and the context is never asked for", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context());
    const api = await mockApi(page, { overrides: server.handlers });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByTestId("travel-pill")).toHaveCount(0);
    expect(callsTo(api, "GET /v1/me/context")).toHaveLength(0);
  });
});

test.describe("at home", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("no pill when the phone's zone is home", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context());
    await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByTestId("travel-pill")).toHaveCount(0);
  });

  test("someone who was following the device and is back home returns to home times", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context({ skyMode: "TRAVEL_SYNCED" }));
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/");
    await expect.poll(() => callsTo(api, "PUT /v1/me/context").length).toBe(1);
    expect(callsTo(api, "PUT /v1/me/context")[0]!.body).toEqual({ skyMode: "HOME" });
  });
});

test.describe("Settings", () => {
  test("shows the home city and the NRI switch, and saves a change to NRI mode", async ({ page }) => {
    await skipLaunchOverlays(page);
    const server = skyServer(context());
    const api = await mockApi(page, { user: { features: FEATURES }, overrides: server.handlers });
    await signIn(page, "/settings");

    await expect(page.getByTestId("home-city-row")).toContainText("Mumbai");
    const nri = page.getByRole("switch", { name: "I live outside India" });
    await expect(nri).toHaveAttribute("aria-checked", "false");
    await nri.click();
    await expect(nri).toHaveAttribute("aria-checked", "true");
    expect(callsTo(api, "PUT /v1/me/context").at(-1)!.body).toEqual({ isNri: true });
  });

  test("with both switches off neither row is there", async ({ page }) => {
    await skipLaunchOverlays(page);
    await mockApi(page, { overrides: skyServer(context()).handlers });
    await signIn(page, "/settings");
    await expect(page.getByText("Preferences")).toBeVisible();
    await expect(page.getByTestId("home-city-row")).toHaveCount(0);
    await expect(page.getByTestId("nri-row")).toHaveCount(0);
  });
});
