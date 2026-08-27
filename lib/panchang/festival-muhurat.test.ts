import { describe, it, expect } from "vitest";
import { adjustFestivalMuhurat } from "./festival-muhurat";

const muhurat = { start: "18:00", end: "20:00" };

describe("adjustFestivalMuhurat", () => {
  it("shifts a sunset-anchored window by the sunset delta (default anchor)", () => {
    const refData = { sunsetTime: "18:00" };
    const userData = { sunsetTime: "18:15" };
    expect(adjustFestivalMuhurat(muhurat, refData, userData)).toEqual({ start: "18:15", end: "20:15" });
  });

  it("shifts a sunrise-anchored window by the sunrise delta", () => {
    const refData = { sunriseTime: "06:00" };
    const userData = { sunriseTime: "05:45" };
    expect(adjustFestivalMuhurat({ ...muhurat, anchor: "sunrise" }, refData, userData)).toEqual({
      start: "17:45",
      end: "19:45",
    });
  });

  it("shifts a moonrise-anchored window by the moonrise delta", () => {
    const refData = { moonriseTime: "20:00" };
    const userData = { moonriseTime: "20:30" };
    expect(adjustFestivalMuhurat({ ...muhurat, anchor: "moonrise" }, refData, userData)).toEqual({
      start: "18:30",
      end: "20:30",
    });
  });

  it("averages sunrise+sunset deltas for a midnight anchor", () => {
    const refData = { sunriseTime: "06:00", sunsetTime: "18:00" };
    const userData = { sunriseTime: "05:50", sunsetTime: "18:20" };
    // deltas: sunrise -10, sunset +20 -> average +5
    expect(adjustFestivalMuhurat({ ...muhurat, anchor: "midnight" }, refData, userData)).toEqual({
      start: "18:05",
      end: "20:05",
    });
  });

  it("returns null when the required anchor data is missing on either side", () => {
    expect(adjustFestivalMuhurat(muhurat, {}, { sunsetTime: "18:15" })).toBeNull();
    expect(adjustFestivalMuhurat(muhurat, { sunsetTime: "18:00" }, {})).toBeNull();
  });

  it("wraps a window that crosses midnight after shifting", () => {
    const refData = { sunsetTime: "18:00" };
    const userData = { sunsetTime: "18:00" };
    const late = { start: "23:50", end: "00:20" };
    expect(adjustFestivalMuhurat(late, refData, userData)).toEqual({ start: "23:50", end: "00:20" });
  });
});
