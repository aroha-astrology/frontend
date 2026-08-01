import { describe, it, expect } from "vitest";
import { formatNativeDate } from "./regions";

const tithi = { name: "Trayodashi", paksha: "Krishna" };

describe("formatNativeDate", () => {
  it("combines paksha + tithi + month + calendar + era year for lunisolar/solar regions", () => {
    const regionalMonth = { calendar: "Vikram Samvat", monthSystem: "purnimanta", monthName: "Chaitra", year: 2082 };
    expect(formatNativeDate(tithi, regionalMonth)).toBe("Krishna Trayodashi, Chaitra, Vikram Samvat 2082");
  });

  it("prefixes the month with Adhika when isAdhikMaas is set", () => {
    const regionalMonth = {
      calendar: "Vikram Samvat",
      monthSystem: "purnimanta",
      monthName: "Jyeshtha",
      year: 2083,
      isAdhikMaas: true,
    };
    expect(formatNativeDate(tithi, regionalMonth)).toBe("Krishna Trayodashi, Adhika Jyeshtha, Vikram Samvat 2083");
  });

  it("degrades to month + calendar + year with no tithi/paksha for fixed_solar (Nanakshahi)", () => {
    const regionalMonth = { calendar: "Nanakshahi", monthSystem: "fixed_solar", monthName: "Chet", year: 558 };
    expect(formatNativeDate(tithi, regionalMonth)).toBe("Chet, Nanakshahi 558");
    expect(formatNativeDate(null, regionalMonth)).toBe("Chet, Nanakshahi 558");
  });

  it("returns null when the regional month isn't loaded yet", () => {
    expect(formatNativeDate(tithi, null)).toBeNull();
    expect(formatNativeDate(tithi, undefined)).toBeNull();
  });

  it("returns null when tithi isn't loaded yet for a non-fixed_solar region", () => {
    const regionalMonth = { calendar: "Bengali San", monthSystem: "solar", monthName: "Boishakh", year: 1433 };
    expect(formatNativeDate(null, regionalMonth)).toBeNull();
  });
});
