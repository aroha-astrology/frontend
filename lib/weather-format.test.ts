import { describe, expect, it } from "vitest";
import { formatClock, isNowIn, listenScript, scoreWordKey, strongestAndWeakest } from "./weather-format";
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
});

describe("isNowIn", () => {
  it("compares against IST clock time", () => {
    const at = new Date("2026-09-24T06:30:00Z"); // 12:00 IST
    expect(isNowIn("11:48", "12:36", at)).toBe(true);
    expect(isNowIn("13:30", "15:00", at)).toBe(false);
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
