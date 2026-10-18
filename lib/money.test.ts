import { afterEach, describe, expect, it } from "vitest";
import { formatRupees } from "./format";
import { coinify, formatCoins, formatFiat, getMoneyMode, moneyModeFor, setMoneyMode } from "./money";

afterEach(() => setMoneyMode("rupees"));

describe("moneyModeFor", () => {
  it("is coins only when money.coins is switched on", () => {
    expect(moneyModeFor({ "money.coins": { enabled: true } })).toBe("coins");
    expect(moneyModeFor({ "money.coins": { enabled: false } })).toBe("rupees");
  });

  it("fails closed: a session from before the switch existed stays in rupees", () => {
    expect(moneyModeFor({})).toBe("rupees");
    expect(moneyModeFor(undefined)).toBe("rupees");
    expect(moneyModeFor(null)).toBe("rupees");
  });
});

describe("formatCoins", () => {
  it("writes whole coins with the coin sign and thousands separators", () => {
    expect(formatCoins(2000)).toBe("🪙 20");
    expect(formatCoins(20100)).toBe("🪙 201");
    expect(formatCoins(180000)).toBe("🪙 1,800");
    expect(formatCoins(0)).toBe("🪙 0");
  });

  it("keeps two decimals for an amount that is not a whole coin, instead of hiding money", () => {
    expect(formatCoins(4950)).toBe("🪙 49.50");
  });

  it("treats a missing amount as zero", () => {
    expect(formatCoins(null)).toBe("🪙 0");
    expect(formatCoins(undefined)).toBe("🪙 0");
  });
});

describe("formatRupees follows the mode", () => {
  it("writes rupees by default, exactly as before", () => {
    expect(getMoneyMode()).toBe("rupees");
    expect(formatRupees(20000)).toBe("₹200");
    expect(formatRupees(4950)).toBe("₹49.50");
  });

  it("writes coins once the mode is coins, for every caller at once", () => {
    setMoneyMode("coins");
    expect(formatRupees(20000)).toBe("🪙 200");
    expect(formatRupees(4950)).toBe("🪙 49.50");
    expect(formatRupees(null)).toBe("🪙 0");
  });
});

describe("coinify", () => {
  it("leaves copy alone in rupees mode", () => {
    expect(coinify("Ask a question for ₹20")).toBe("Ask a question for ₹20");
  });

  it("rewrites rupee amounts in copy as coins in coins mode", () => {
    setMoneyMode("coins");
    expect(coinify("Ask a question for ₹20")).toBe("Ask a question for 🪙 20");
    expect(coinify("You get ₹1,500 and ₹49.50")).toBe("You get 🪙 1,500 and 🪙 49.50");
    expect(coinify("₹ 99 only")).toBe("🪙 99 only");
  });

  it("does not touch text with no rupee amount", () => {
    setMoneyMode("coins");
    expect(coinify("Ask Baba Ji anything")).toBe("Ask Baba Ji anything");
    expect(coinify("The rupee sign ₹ alone")).toBe("The rupee sign ₹ alone");
  });
});

describe("formatFiat (the payment sheet: real money, never coins)", () => {
  it("writes whole rupees and two-decimal dollars, euros and pounds", () => {
    expect(formatFiat(29900, "INR")).toBe("₹299");
    expect(formatFiat(499, "USD")).toBe("$4.99");
    expect(formatFiat(1999, "EUR")).toBe("€19.99");
    expect(formatFiat(179, "GBP")).toBe("£1.79");
  });

  it("is unaffected by the coins mode", () => {
    setMoneyMode("coins");
    expect(formatFiat(29900, "INR")).toBe("₹299");
  });

  it("names a currency it has no sign for", () => {
    expect(formatFiat(1000, "AED")).toBe("AED 10.00");
  });
});
