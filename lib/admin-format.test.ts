import { describe, it, expect } from "vitest";
import {
  ADMIN_DATE_RANGE_PRESETS,
  buildAdminRangeQuery,
  isValidCustomRange,
  parseRupeeAmount,
  paiseToRupeeInput,
  computeWalletDeltaPaise,
  validateWalletNote,
  validatePriceInput,
  validateOptionalPriceInput,
  sortByTotalPaiseDescending,
  groupFeaturesByGroup,
  validateGroupName,
  FEATURE_GROUP_ORDER,
  estimateLlmCostPaise,
  estimateLlmListPricePaise,
  GEMINI_INPUT_USD_PER_MILLION_TOKENS,
  GEMINI_OUTPUT_USD_PER_MILLION_TOKENS,
  USD_TO_INR_RATE,
  isUserOnline,
  ONLINE_WINDOW_MS,
  addGst,
  GST_RATE,
} from "./admin-format";

describe("ADMIN_DATE_RANGE_PRESETS", () => {
  it("lists exactly the 12 presets the backend contract defines, each with a human label", () => {
    const values = ADMIN_DATE_RANGE_PRESETS.map((p) => p.value);
    expect(values).toEqual([
      "today",
      "yesterday",
      "last7d",
      "last15d",
      "last30d",
      "this_month",
      "last_month",
      "last90d",
      "this_quarter",
      "this_year",
      "lifetime",
      "custom",
    ]);
    for (const p of ADMIN_DATE_RANGE_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("buildAdminRangeQuery", () => {
  it("includes only 'preset' for a non-custom preset, even if from/to are passed", () => {
    expect(buildAdminRangeQuery("last7d", "2026-01-01", "2026-01-31")).toBe("preset=last7d");
  });

  it("includes from/to for preset=custom", () => {
    const qs = buildAdminRangeQuery("custom", "2026-01-01", "2026-01-31");
    const params = new URLSearchParams(qs);
    expect(params.get("preset")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-01-31");
  });

  it("omits from/to for preset=custom when they are absent", () => {
    expect(buildAdminRangeQuery("custom")).toBe("preset=custom");
  });

  it("omits lifetime's non-applicable from/to too", () => {
    expect(buildAdminRangeQuery("lifetime", "2026-01-01", "2026-01-31")).toBe("preset=lifetime");
  });
});

describe("isValidCustomRange", () => {
  it("accepts a well-formed range where from <= to", () => {
    expect(isValidCustomRange("2026-01-01", "2026-01-31")).toBe(true);
  });

  it("accepts equal from/to (a single-day range)", () => {
    expect(isValidCustomRange("2026-01-15", "2026-01-15")).toBe(true);
  });

  it("rejects from > to", () => {
    expect(isValidCustomRange("2026-02-01", "2026-01-01")).toBe(false);
  });

  it("rejects malformed date strings", () => {
    expect(isValidCustomRange("2026/01/01", "2026-01-31")).toBe(false);
    expect(isValidCustomRange("2026-01-01", "not-a-date")).toBe(false);
    expect(isValidCustomRange("", "2026-01-31")).toBe(false);
  });

  it("rejects a calendar date that doesn't exist (e.g. Feb 31) rather than silently rolling over", () => {
    expect(isValidCustomRange("2026-02-31", "2026-03-05")).toBe(false);
  });
});

describe("parseRupeeAmount", () => {
  it("parses a whole-rupee amount", () => {
    expect(parseRupeeAmount("200")).toEqual({ ok: true, paise: 20000 });
  });

  it("parses a 2-decimal amount", () => {
    expect(parseRupeeAmount("49.50")).toEqual({ ok: true, paise: 4950 });
  });

  it("parses a 1-decimal amount", () => {
    expect(parseRupeeAmount("49.5")).toEqual({ ok: true, paise: 4950 });
  });

  it("trims surrounding whitespace", () => {
    expect(parseRupeeAmount("  100  ")).toEqual({ ok: true, paise: 10000 });
  });

  it("rejects an empty string", () => {
    const result = parseRupeeAmount("");
    expect(result.ok).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(parseRupeeAmount("-5").ok).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(parseRupeeAmount("abc").ok).toBe(false);
  });

  it("rejects more than 2 decimal places", () => {
    expect(parseRupeeAmount("49.999").ok).toBe(false);
  });

  it("accepts zero (callers that need >0 must check separately)", () => {
    expect(parseRupeeAmount("0")).toEqual({ ok: true, paise: 0 });
  });
});

describe("paiseToRupeeInput", () => {
  it("formats a whole-rupee amount with no decimals", () => {
    expect(paiseToRupeeInput(20000)).toBe("200");
  });

  it("formats a fractional-rupee amount to 2 decimals", () => {
    expect(paiseToRupeeInput(4950)).toBe("49.50");
  });

  it("formats zero", () => {
    expect(paiseToRupeeInput(0)).toBe("0");
  });

  it("round-trips through parseRupeeAmount", () => {
    const parsed = parseRupeeAmount(paiseToRupeeInput(123450));
    expect(parsed).toEqual({ ok: true, paise: 123450 });
  });
});

describe("computeWalletDeltaPaise", () => {
  it("returns a positive delta for a credit", () => {
    expect(computeWalletDeltaPaise("credit", "50")).toEqual({ ok: true, deltaPaise: 5000 });
  });

  it("returns a negative delta for a debit", () => {
    expect(computeWalletDeltaPaise("debit", "50")).toEqual({ ok: true, deltaPaise: -5000 });
  });

  it("rejects a zero amount (backend requires a non-zero delta)", () => {
    const result = computeWalletDeltaPaise("credit", "0");
    expect(result.ok).toBe(false);
  });

  it("propagates the underlying parse error for invalid input", () => {
    const result = computeWalletDeltaPaise("debit", "not-a-number");
    expect(result.ok).toBe(false);
  });
});

describe("validateWalletNote", () => {
  it("accepts a normal note", () => {
    expect(validateWalletNote("Goodwill credit for delayed report")).toEqual({ ok: true });
  });

  it("rejects an empty note", () => {
    expect(validateWalletNote("").ok).toBe(false);
  });

  it("rejects a whitespace-only note", () => {
    expect(validateWalletNote("   ").ok).toBe(false);
  });

  it("accepts exactly 500 characters", () => {
    expect(validateWalletNote("a".repeat(500))).toEqual({ ok: true });
  });

  it("rejects 501 characters", () => {
    expect(validateWalletNote("a".repeat(501)).ok).toBe(false);
  });
});

describe("validatePriceInput", () => {
  it("accepts a valid non-negative amount", () => {
    expect(validatePriceInput("99")).toEqual({ ok: true, paise: 9900 });
  });

  it("rejects invalid input the same way parseRupeeAmount does", () => {
    expect(validatePriceInput("free").ok).toBe(false);
  });
});

describe("validateOptionalPriceInput", () => {
  it("accepts a blank input as 'no discount configured' (null paise)", () => {
    expect(validateOptionalPriceInput("")).toEqual({ ok: true, paise: null });
  });

  it("accepts a whitespace-only input the same way as fully blank", () => {
    expect(validateOptionalPriceInput("   ")).toEqual({ ok: true, paise: null });
  });

  it("accepts a valid non-negative amount, same as validatePriceInput", () => {
    expect(validateOptionalPriceInput("499")).toEqual({ ok: true, paise: 49900 });
  });

  it("rejects invalid non-blank input the same way parseRupeeAmount does", () => {
    expect(validateOptionalPriceInput("free").ok).toBe(false);
  });
});

describe("sortByTotalPaiseDescending", () => {
  it("sorts descending by totalPaise", () => {
    const items = [
      { key: "a", totalPaise: 100 },
      { key: "b", totalPaise: 300 },
      { key: "c", totalPaise: 200 },
    ];
    expect(sortByTotalPaiseDescending(items).map((i) => i.key)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const items = [
      { key: "a", totalPaise: 1 },
      { key: "b", totalPaise: 2 },
    ];
    const copy = [...items];
    sortByTotalPaiseDescending(items);
    expect(items).toEqual(copy);
  });

  it("preserves relative order of ties (stable sort)", () => {
    const items = [
      { key: "a", totalPaise: 5 },
      { key: "b", totalPaise: 5 },
      { key: "c", totalPaise: 5 },
    ];
    expect(sortByTotalPaiseDescending(items).map((i) => i.key)).toEqual(["a", "b", "c"]);
  });
});

describe("groupFeaturesByGroup", () => {
  it("groups items in the fixed order nav/home/paid/reports regardless of input order", () => {
    const items = [
      { key: "p1", group: "paid" },
      { key: "n1", group: "nav" },
      { key: "r1", group: "reports" },
      { key: "h1", group: "home" },
      { key: "n2", group: "nav" },
    ];
    const grouped = groupFeaturesByGroup(items);
    expect(grouped.map((g) => g.group)).toEqual(["nav", "home", "paid", "reports"]);
    expect(grouped.find((g) => g.group === "nav")?.items.map((i) => i.key)).toEqual(["n1", "n2"]);
  });

  it("omits groups with zero rows", () => {
    const items = [{ key: "n1", group: "nav" }];
    const grouped = groupFeaturesByGroup(items);
    expect(grouped.map((g) => g.group)).toEqual(["nav"]);
  });

  it("appends unrecognized groups after the fixed ones, in first-seen order", () => {
    const items = [
      { key: "x1", group: "experimental" },
      { key: "n1", group: "nav" },
      { key: "y1", group: "beta" },
    ];
    const grouped = groupFeaturesByGroup(items);
    expect(grouped.map((g) => g.group)).toEqual(["nav", "experimental", "beta"]);
  });

  it("FEATURE_GROUP_ORDER matches the backend contract's groups", () => {
    expect(FEATURE_GROUP_ORDER).toEqual(["nav", "home", "paid", "reports", "panchang"]);
  });
});

describe("validateGroupName", () => {
  it("accepts a normal name", () => {
    expect(validateGroupName("Beta Testers")).toEqual({ ok: true });
  });

  it("rejects an empty name", () => {
    expect(validateGroupName("").ok).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(validateGroupName("   ").ok).toBe(false);
  });
});

describe("estimateLlmCostPaise", () => {
  it("charges nothing for usage served entirely by the free key tier", () => {
    // The whole point of the free pool: a million tokens through it is still
    // ₹0. Reporting list price here would invent spend that never happened.
    expect(
      estimateLlmCostPaise({ paidTokensIn: 0, paidTokensOut: 0 }),
    ).toBe(0);
  });

  it("charges only the paid-tier tokens", () => {
    const oneMillionIn = estimateLlmCostPaise({ paidTokensIn: 1_000_000, paidTokensOut: 0 });
    expect(oneMillionIn).toBeCloseTo(
      GEMINI_INPUT_USD_PER_MILLION_TOKENS * USD_TO_INR_RATE * 100,
      6,
    );

    const oneMillionOut = estimateLlmCostPaise({ paidTokensIn: 0, paidTokensOut: 1_000_000 });
    expect(oneMillionOut).toBeCloseTo(
      GEMINI_OUTPUT_USD_PER_MILLION_TOKENS * USD_TO_INR_RATE * 100,
      6,
    );
  });

  it("prices output tokens above input tokens", () => {
    expect(estimateLlmCostPaise({ paidTokensIn: 0, paidTokensOut: 1000 })).toBeGreaterThan(
      estimateLlmCostPaise({ paidTokensIn: 1000, paidTokensOut: 0 }),
    );
  });

  it("treats a row from before the paid tier existed as free, not as missing data", () => {
    // Historical ai_usage rows have no tier and no paid columns. They were all
    // free-tier, so 0 is the correct answer — NaN would poison the total.
    expect(estimateLlmCostPaise({})).toBe(0);
  });
});

describe("estimateLlmListPricePaise", () => {
  it("prices every token, so the free pool's value is visible", () => {
    expect(estimateLlmListPricePaise({ tokensIn: 1_000_000, tokensOut: 0 })).toBeCloseTo(
      GEMINI_INPUT_USD_PER_MILLION_TOKENS * USD_TO_INR_RATE * 100,
      6,
    );
  });

  it("is at least the billed cost for the same row, never less", () => {
    const row = { tokensIn: 5000, tokensOut: 9000, paidTokensIn: 1000, paidTokensOut: 2000 };
    expect(estimateLlmListPricePaise(row)).toBeGreaterThan(estimateLlmCostPaise(row));
  });

  it("agrees with the billed cost when every call was on the paid tier", () => {
    const row = { tokensIn: 4000, tokensOut: 7000, paidTokensIn: 4000, paidTokensOut: 7000 };
    expect(estimateLlmListPricePaise(row)).toBeCloseTo(estimateLlmCostPaise(row), 6);
  });
});

describe("isUserOnline", () => {
  const now = Date.parse("2026-08-03T12:00:00.000Z");

  it("counts a user seen just now as online", () => {
    expect(isUserOnline("2026-08-03T11:59:30.000Z", now)).toBe(true);
  });

  it("counts a user seen just inside the window as online", () => {
    expect(isUserOnline(new Date(now - ONLINE_WINDOW_MS + 1000).toISOString(), now)).toBe(true);
  });

  it("counts a user seen just outside the window as offline", () => {
    expect(isUserOnline(new Date(now - ONLINE_WINDOW_MS - 1000).toISOString(), now)).toBe(false);
  });

  it("treats a never-seen user as offline rather than throwing", () => {
    expect(isUserOnline(null, now)).toBe(false);
    expect(isUserOnline(undefined, now)).toBe(false);
  });

  it("treats an unparseable timestamp as offline, not as online-by-NaN", () => {
    // NaN comparisons are false, so this would be offline anyway — pinned so a
    // future refactor to `>=`-style logic cannot silently flip it to online.
    expect(isUserOnline("not-a-date", now)).toBe(false);
  });

  it("tolerates a slightly-future timestamp from server/browser clock skew", () => {
    expect(isUserOnline(new Date(now + 3000).toISOString(), now)).toBe(true);
  });

  it("uses the same window the backend calls 'logged in simultaneously'", () => {
    expect(ONLINE_WINDOW_MS).toBe(5 * 60 * 1000);
  });
});

describe("addGst / rate injection", () => {
  it("adds 18% GST, matching an India-billed Google invoice", () => {
    expect(addGst(10000)).toBeCloseTo(11800, 6);
  });

  it("uses the injected live rate instead of the pinned fallback", () => {
    const row = { tokensIn: 1_000_000, tokensOut: 0 };
    const atNinetyFive = estimateLlmListPricePaise(row, 95.3);
    const atEightyEight = estimateLlmListPricePaise(row, 88);
    expect(atNinetyFive).toBeGreaterThan(atEightyEight);
    expect(atNinetyFive / atEightyEight).toBeCloseTo(95.3 / 88, 6);
  });

  it("falls back to the pinned rate when none is passed", () => {
    const row = { tokensIn: 1_000_000, tokensOut: 0 };
    expect(estimateLlmListPricePaise(row)).toBeCloseTo(
      estimateLlmListPricePaise(row, USD_TO_INR_RATE),
      6,
    );
  });

  it("reproduces the real dashboard total exactly at the corrected rate", () => {
    // The 9 feature rows from the live dashboard, summed.
    const total = estimateLlmListPricePaise({ tokensIn: 375_783, tokensOut: 52_182 }, 95.3);
    expect(total / 100).toBeCloseTo(16.4124, 3);
    // ...and what it wrongly showed at the stale 88 rate.
    expect(estimateLlmListPricePaise({ tokensIn: 375_783, tokensOut: 52_182 }, 88) / 100).toBeCloseTo(
      15.1553,
      3,
    );
  });
});
