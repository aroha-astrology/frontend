import { describe, it, expect } from "vitest";
import { formatNativeDate, tithiPakshaDayNumber } from "./regions";

describe("formatNativeDate", () => {
  it("combines calendar name + era year only", () => {
    expect(formatNativeDate({ calendar: "Vikram Samvat", year: 2082 })).toBe("Vikram Samvat 2082");
    expect(formatNativeDate({ calendar: "Nanakshahi", year: 558 })).toBe("Nanakshahi 558");
  });

  it("returns null when the regional month isn't loaded yet", () => {
    expect(formatNativeDate(null)).toBeNull();
    expect(formatNativeDate(undefined)).toBeNull();
  });
});

describe("tithiPakshaDayNumber", () => {
  it("keeps Shukla tithis as-is (1-15)", () => {
    expect(tithiPakshaDayNumber(1, "Shukla")).toBe(1);
    expect(tithiPakshaDayNumber(15, "Shukla")).toBe(15);
  });

  it("shifts Krishna tithis (16-30) down to the same 1-15 range", () => {
    expect(tithiPakshaDayNumber(16, "Krishna")).toBe(1);
    expect(tithiPakshaDayNumber(30, "Krishna")).toBe(15);
  });
});
