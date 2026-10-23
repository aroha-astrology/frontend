import { describe, expect, it } from "vitest";
import { PILL_GROUPS, isPillActive, pillGroupFor, visiblePills } from "./nav-pills";

describe("pillGroupFor", () => {
  it("finds the row for a page that is one of its pills", () => {
    expect(pillGroupFor("/")?.id).toBe("today");
    expect(pillGroupFor("/calendar")?.id).toBe("forecast");
    expect(pillGroupFor("/chat-history")?.id).toBe("ask");
    expect(pillGroupFor("/reports/history")?.id).toBe("reports");
    expect(pillGroupFor("/find-date/")?.id).toBe("almanac");
  });

  it("shows no row on any other page (a report, settings, payment)", () => {
    expect(pillGroupFor("/reports/abc123")).toBeNull();
    expect(pillGroupFor("/settings")).toBeNull();
    expect(pillGroupFor("/payment")).toBeNull();
  });

  it("no page sits in two rows", () => {
    const hrefs = PILL_GROUPS.flatMap((g) => g.pills.map((p) => p.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("visiblePills", () => {
  const forecast = PILL_GROUPS.find((g) => g.id === "forecast")!;

  it("drops a pill whose page switch is off", () => {
    const pills = visiblePills(forecast, (p) => p.featureKey !== "nav.lifeTimeline");
    expect(pills.map((p) => p.href)).toEqual(["/horoscope", "/calendar"]);
  });

  it("shows no row when fewer than two pills are left", () => {
    expect(visiblePills(forecast, () => false)).toEqual([]);
  });
});

describe("isPillActive", () => {
  it("marks only the page you are on", () => {
    const [today, kundli] = PILL_GROUPS[0]!.pills;
    expect(isPillActive(today!, "/")).toBe(true);
    expect(isPillActive(kundli!, "/")).toBe(false);
    expect(isPillActive(kundli!, "/kundli/")).toBe(true);
  });
});
