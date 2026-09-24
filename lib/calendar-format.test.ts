import { describe, expect, it } from "vitest";
import { buildIcs, eventGroup, eventTitle, groupByMonth, istToday, pickNextWindow } from "./calendar-format";
import type { CalendarEvent } from "./insights-api";

const t = (key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`).join(",")})` : key;

function ev(over: Partial<CalendarEvent>): CalendarEvent {
  return { id: "x", kind: "ingress", date: "2026-10-10", tone: 0, weight: 50, params: {}, why: [], ...over };
}

describe("eventTitle", () => {
  it("translates planet and sign for transits", () => {
    expect(eventTitle(t, ev({ kind: "ingress", params: { planet: "Saturn", sign: "Aries" } }))).toBe(
      "calendar.title_.ingress(planet=planetNames.saturn,sign=zodiac.signs.aries)",
    );
  });

  it("words an area window by its tone", () => {
    expect(eventTitle(t, ev({ kind: "areaWindow", area: "career", tone: 1 }))).toBe(
      "calendar.title_.areaWindowGood(area=why.areas.career)",
    );
    expect(eventTitle(t, ev({ kind: "areaWindow", area: "money", tone: -1 }))).toBe(
      "calendar.title_.areaWindowCare(area=why.areas.money)",
    );
  });

  it("uses the phase and eclipse keys, and shows festivals as-is", () => {
    expect(eventTitle(t, ev({ kind: "saturnPhase", params: { phase: "sade-sati-peak" } }))).toBe(
      "calendar.title_.saturnPhase.sade-sati-peak",
    );
    expect(eventTitle(t, ev({ kind: "eclipse", params: { eclipse: "lunar" } }))).toBe("calendar.title_.eclipse.lunar");
    expect(eventTitle(t, ev({ kind: "festival", params: { name: "Diwali", emoji: "🪔" } }))).toBe("🪔 Diwali");
  });
});

describe("grouping and filtering", () => {
  it("groups by month in order", () => {
    const groups = groupByMonth([ev({ date: "2026-10-01" }), ev({ date: "2026-10-20" }), ev({ date: "2026-11-02" })]);
    expect(groups.map((g) => [g.month, g.events.length])).toEqual([
      ["2026-10", 2],
      ["2026-11", 1],
    ]);
  });

  it("puts dasha events and festivals in their own chips", () => {
    expect([eventGroup(ev({ kind: "dashaChange" })), eventGroup(ev({ kind: "festival" })), eventGroup(ev({ kind: "eclipse" }))]).toEqual([
      "dasha",
      "festivals",
      "planets",
    ]);
  });
});

describe("pickNextWindow", () => {
  it("picks the heaviest upcoming window, ignoring past events, festivals and the Moon", () => {
    const pick = pickNextWindow(
      [
        ev({ id: "past", date: "2026-09-01", weight: 99 }),
        ev({ id: "fest", kind: "festival", date: "2026-10-01", weight: 95 }),
        ev({ id: "moon", kind: "moonSign", date: "2026-10-01", weight: 95 }),
        ev({ id: "window", kind: "areaWindow", date: "2026-10-05", weight: 60 }),
        ev({ id: "saturn", kind: "ingress", date: "2026-11-20", weight: 100 }),
      ],
      "2026-09-24",
    );
    expect(pick?.id).toBe("saturn");
  });

  it("returns null when nothing weighty is coming", () => {
    expect(pickNextWindow([ev({ weight: 20 })], "2026-09-24")).toBeNull();
  });
});

describe("buildIcs", () => {
  it("writes an all-day event spanning the period, escaping text", () => {
    const ics = buildIcs(ev({ id: "areaWindow:x", date: "2026-10-05", endDate: "2026-11-02" }), "Career, window; opens", "Why");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261005");
    expect(ics).toContain("DTEND;VALUE=DATE:20261103");
    expect(ics).toContain("SUMMARY:Career\\, window\\; opens");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

describe("istToday", () => {
  it("rolls over at IST midnight", () => {
    expect(istToday(new Date("2026-09-24T18:31:00Z"))).toBe("2026-09-25");
  });
});

describe("googleCalendarUrl", () => {
  it("pre-fills an all-day event with an exclusive end date", async () => {
    const { googleCalendarUrl } = await import("./calendar-format");
    const url = new URL(googleCalendarUrl(ev({ date: "2026-10-05" }), "Saturn enters Aries", "Why"));
    expect(url.searchParams.get("dates")).toBe("20261005/20261006");
    expect(url.searchParams.get("text")).toBe("Saturn enters Aries");
  });
});
