import { describe, expect, it } from "vitest";
import { formatRupees } from "./format";

describe("formatRupees", () => {
  it("shows whole rupees without decimals and paise with two", () => {
    expect(formatRupees(20000)).toBe("₹200");
    expect(formatRupees(4950)).toBe("₹49.50");
    expect(formatRupees(null)).toBe("₹0");
  });

  it("puts the minus before the ₹ for a wallet a Google Play refund took below zero", () => {
    expect(formatRupees(-9410)).toBe("−₹94.10");
    expect(formatRupees(-10000)).toBe("−₹100");
  });
});
