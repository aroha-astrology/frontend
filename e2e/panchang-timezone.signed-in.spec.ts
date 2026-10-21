import { test, expect } from "@playwright/test";
import { mockApi, callsTo, type ApiCall } from "./fixtures/mock-api";
import { signIn, skipLaunchOverlays } from "./fixtures/auth";

// The Panchang reads on the place's own clock. A user abroad sends the device's
// IANA zone with their coordinates; the Delhi reference always asks for IST.
// Until 2026-10 neither sent a zone, so New York got IST clock times.

const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };
const TROMSO = { latitude: 69.6492, longitude: 18.9553 };

function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

function panchangReply(call: ApiCall, extra: Record<string, unknown> = {}) {
  return {
    json: {
      date: call.query.get("date"),
      tithi: null,
      nakshatra: null,
      yoga: null,
      karana: null,
      sunriseTime: "07:13",
      sunsetTime: "18:08",
      dayTimesMode: "sunrise",
      ...extra,
    },
  };
}

test.describe("Panchang on the user's own clock", () => {
  test.describe("in New York", () => {
    test.use({ timezoneId: "America/New_York", geolocation: NEW_YORK, permissions: ["geolocation"] });

    test("Your Location asks for America/New_York and today's New York date; Delhi asks for IST", async ({ page }) => {
      await skipLaunchOverlays(page);
      const api = await mockApi(page, {
        overrides: { "GET /v1/panchang": (call) => panchangReply(call) },
      });
      await signIn(page, "/panchang");

      await expect
        .poll(() => callsTo(api, "GET /v1/panchang").filter((c) => c.query.get("tz") === "America/New_York").length)
        .toBeGreaterThan(0);
      const calls = callsTo(api, "GET /v1/panchang");
      const mine = calls.find((c) => c.query.get("tz") === "America/New_York")!;
      expect(Number(mine.query.get("lat"))).toBeCloseTo(NEW_YORK.latitude, 2);
      expect(mine.query.get("date")).toBe(todayIn("America/New_York"));

      const delhi = calls.find((c) => c.query.get("tz") === "Asia/Kolkata")!;
      expect(Number(delhi.query.get("lat"))).toBeCloseTo(28.6139, 3);
      // Every request names a zone now.
      expect(calls.every((c) => c.query.get("tz"))).toBe(true);
      await expect(page.getByTestId("panchang-solar-noon-note")).toHaveCount(0);
    });
  });

  test.describe("in Tromsø", () => {
    test.use({ timezoneId: "Europe/Oslo", geolocation: TROMSO, permissions: ["geolocation"] });

    test("a polar day shows the solar-noon note instead of a 0 h day", async ({ page }) => {
      await skipLaunchOverlays(page);
      await mockApi(page, {
        overrides: {
          "GET /v1/panchang": (call) =>
            call.query.get("tz") === "Europe/Oslo"
              ? panchangReply(call, { sunriseTime: "11:40", sunsetTime: "11:40", dayTimesMode: "solarNoon" })
              : panchangReply(call),
        },
      });
      await signIn(page, "/panchang");
      await expect(page.getByTestId("panchang-solar-noon-note")).toBeVisible();
      await expect(page.getByTestId("panchang-solar-noon-note")).toContainText("solar noon");
    });
  });
});
