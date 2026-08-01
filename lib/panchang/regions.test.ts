import { describe, it, expect } from "vitest";
import { tithiPakshaDayNumber } from "./regions";

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
