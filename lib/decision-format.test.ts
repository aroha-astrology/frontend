import { describe, expect, it } from "vitest";
import { askAboutDate, categoryKey, dayLabel, stripByMonth } from "./decision-format";

const t = (key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`).join(",")})` : key;

describe("decision-format", () => {
  it("picks the category name from the right page's bundle", () => {
    expect(categoryKey("decision", "careerChange")).toBe("decide.categories.careerChange");
    expect(categoryKey("muhurta", "vehicle")).toBe("findDate.categories.vehicle");
  });

  it("labels a date with its weekday, and survives a bad one", () => {
    expect(dayLabel("2026-10-01", "en")).toBe("Thu, Oct 1");
    expect(dayLabel("nope", "en")).toBe("nope");
  });

  it("splits the day strip by calendar month", () => {
    const day = (date: string) => ({ date, score: 50, tone: "neutral" as const, avoid: [] });
    const months = stripByMonth([day("2026-09-29"), day("2026-09-30"), day("2026-10-01")]);
    expect(months.map((m) => [m.month, m.days.length])).toEqual([
      ["2026-09", 2],
      ["2026-10", 1],
    ]);
  });

  it("builds the Ask Aroha question from the category and date", () => {
    expect(askAboutDate(t, "muhurta", "vehicle", "2026-10-01", "en")).toBe(
      "decide.result.askQuestion(category=findDate.categories.vehicle,date=Thu, Oct 1)",
    );
  });
});
