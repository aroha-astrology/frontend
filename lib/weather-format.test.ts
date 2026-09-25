import { describe, expect, it } from "vitest";
import { formatClock, isNowIn, istClock, listenScript, scoreWordKey, strongestAndWeakest, upcomingWindows } from "./weather-format";
import type { AstroWeather } from "./insights-api";

const t = (key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`).join(",")})` : key;

const weather = (scores: number[], trend: AstroWeather["overall"]["trend"] = "improving"): AstroWeather => ({
  date: "2026-09-24",
  header: { moonSign: "Pisces", mahadasha: "Mercury", antardasha: "Venus" },
  overall: { score: 60, trend, tomorrowScore: 80 },
  areas: (["career", "relationships", "money", "energy"] as const).map((key, i) => ({
    key,
    area: key === "energy" ? "health" : key,
    score: scores[i]!,
    source: "horoscope" as const,
  })),
  moments: [{ kind: "moonSign", at: "2026-09-24T12:48:00Z", time: "18:18", from: "Aries", to: "Taurus" }],
  day: [],
  dayAvailable: true,
  why: [],
});

describe("scoreWordKey", () => {
  it("bands 0-100 scores into four words", () => {
    expect([90, 70, 50, 30].map(scoreWordKey)).toEqual(["strong", "good", "mixed", "gentle"]);
  });
});

describe("strongestAndWeakest", () => {
  it("names the leading and trailing areas", () => {
    expect(strongestAndWeakest(weather([80, 55, 70, 60]).areas)).toEqual({ strong: "career", weak: "relationships" });
  });
  it("calls it balanced when the spread is under 10 points", () => {
    expect(strongestAndWeakest(weather([60, 62, 58, 65]).areas)).toBeNull();
  });
});

describe("formatClock", () => {
  it("uses 12-hour time in English only", () => {
    expect(formatClock("18:18", "en")).toBe("6:18 PM");
    expect(formatClock("00:05", "en")).toBe("12:05 AM");
    expect(formatClock("18:18", "hi")).toBe("18:18");
  });

  it("reads a window's 24:00 end as midnight", () => {
    expect(formatClock("24:00", "en")).toBe("12:00 AM");
    expect(formatClock("24:00", "hi")).toBe("00:00");
  });
});

describe("isNowIn", () => {
  it("compares against IST clock time", () => {
    const at = new Date("2026-09-24T06:30:00Z"); // 12:00 IST
    expect(isNowIn("11:48", "12:36", at)).toBe(true);
    expect(isNowIn("13:30", "15:00", at)).toBe(false);
  });
});

describe("istClock", () => {
  it("gives the IST time as HH:mm", () => {
    expect(istClock(new Date("2026-09-24T10:34:00Z"))).toBe("16:04");
  });
});

describe("upcomingWindows", () => {
  const day = [
    { start: "06:46", end: "08:15", name: "Labh" },
    { start: "09:44", end: "11:13", name: "Kaal" },
    { start: "10:50", end: "11:37", name: "AbhijitMuhurta" },
    { start: "15:37", end: "17:06", name: "Amrit" },
  ];

  it("drops finished windows and keeps the ones in progress first", () => {
    const at = new Date("2026-09-24T05:30:00Z"); // 11:00 IST
    expect(upcomingWindows(day, at).map((w) => w.name)).toEqual(["Kaal", "AbhijitMuhurta", "Amrit"]);
  });

  it("keeps a night window running to midnight until the day ends", () => {
    const night = [...day, { start: "22:40", end: "24:00", name: "Kaal" }];
    expect(upcomingWindows(night, new Date("2026-09-24T18:15:00Z")).map((w) => w.name)).toEqual(["Kaal"]); // 23:45 IST
  });

  it("is empty once the day's windows are over", () => {
    expect(upcomingWindows(day, new Date("2026-09-24T13:00:00Z"))).toEqual([]); // 18:30 IST
  });
});

describe("listenScript", () => {
  it("greets by name, contrasts the areas, gives the trend and the Moon change", () => {
    expect(listenScript(t, weather([80, 55, 70, 60]), "Subir", "en")).toBe(
      [
        "weather.script.greeting(name=Subir)",
        "weather.script.strongest(strong=weather.areas.career,weak=weather.areas.relationships)",
        "weather.script.improving",
        "weather.script.moment(sign=zodiac.signs.taurus,time=6:18 PM)",
      ].join(" "),
    );
  });

  it("says the day is balanced when no area stands out", () => {
    expect(listenScript(t, weather([60, 62, 58, 65], "steady"), null, "hi")).toContain("weather.script.even");
  });
});
