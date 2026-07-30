import { describe, it, expect } from "vitest";
import {
  splitReportsByType,
  deriveOneTimeCardState,
  purchasedMonthSet,
  purchasedMonthChips,
  hasActiveMonthlyPurchase,
  currentMonthKey,
  formatPeriodMonth,
  filterVisibleReports,
  computeDiscount,
  type ReportPurchase,
} from "./reports-logic";

describe("splitReportsByType", () => {
  const reports = [
    { key: "marriage", isMonthly: false },
    { key: "health_monthly", isMonthly: true },
    { key: "wealth", isMonthly: false },
    { key: "career_monthly", isMonthly: true },
  ];

  it("splits into oneTime/monthly preserving relative order", () => {
    const { oneTime, monthly } = splitReportsByType(reports);
    expect(oneTime.map((r) => r.key)).toEqual(["marriage", "wealth"]);
    expect(monthly.map((r) => r.key)).toEqual(["health_monthly", "career_monthly"]);
  });

  it("handles an all-one-time or all-monthly list", () => {
    expect(splitReportsByType([{ key: "a", isMonthly: false }]).monthly).toEqual([]);
    expect(splitReportsByType([{ key: "a", isMonthly: true }]).oneTime).toEqual([]);
  });
});

function purchase(id: string, status: ReportPurchase["status"], periodMonth: string | null = null): ReportPurchase {
  return { id, status, periodMonth };
}

describe("deriveOneTimeCardState", () => {
  it("is 'none' with no purchases", () => {
    expect(deriveOneTimeCardState([])).toEqual({ state: "none" });
  });

  it("is 'ready' when a ready purchase exists", () => {
    expect(deriveOneTimeCardState([purchase("p1", "ready")])).toEqual({ state: "ready", purchaseId: "p1" });
  });

  it("is 'generating' when only a generating purchase exists", () => {
    expect(deriveOneTimeCardState([purchase("p1", "generating")])).toEqual({ state: "generating", purchaseId: "p1" });
  });

  it("is 'failed' when only a failed purchase exists", () => {
    expect(deriveOneTimeCardState([purchase("p1", "failed")])).toEqual({ state: "failed", purchaseId: "p1" });
  });

  it("prioritizes ready over generating and failed", () => {
    const purchases = [purchase("p1", "failed"), purchase("p2", "generating"), purchase("p3", "ready")];
    expect(deriveOneTimeCardState(purchases)).toEqual({ state: "ready", purchaseId: "p3" });
  });

  it("prioritizes generating over failed when no ready purchase exists", () => {
    const purchases = [purchase("p1", "failed"), purchase("p2", "generating")];
    expect(deriveOneTimeCardState(purchases)).toEqual({ state: "generating", purchaseId: "p2" });
  });

  it("picks the LAST (latest retry) row within the same priority status", () => {
    const purchases = [purchase("p1", "failed"), purchase("p2", "failed")];
    expect(deriveOneTimeCardState(purchases)).toEqual({ state: "failed", purchaseId: "p2" });
  });
});

describe("purchasedMonthSet", () => {
  it("collects all non-null periodMonth values", () => {
    const purchases = [
      purchase("p1", "ready", "2026-08"),
      purchase("p2", "generating", "2026-09"),
    ];
    expect(purchasedMonthSet(purchases)).toEqual(new Set(["2026-08", "2026-09"]));
  });

  it("is empty for an empty purchase list", () => {
    expect(purchasedMonthSet([])).toEqual(new Set());
  });
});

describe("purchasedMonthChips", () => {
  it("sorts chips chronologically regardless of input order", () => {
    const purchases = [
      purchase("p1", "ready", "2026-10"),
      purchase("p2", "generating", "2026-08"),
      purchase("p3", "failed", "2026-09"),
    ];
    expect(purchasedMonthChips(purchases).map((c) => c.periodMonth)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("carries over status and purchase id per chip", () => {
    const purchases = [purchase("p1", "ready", "2026-08")];
    expect(purchasedMonthChips(purchases)).toEqual([{ periodMonth: "2026-08", status: "ready", purchaseId: "p1" }]);
  });
});

describe("hasActiveMonthlyPurchase", () => {
  it("is false with no purchases", () => {
    expect(hasActiveMonthlyPurchase([])).toBe(false);
  });

  it("is false when every purchase failed (must not permanently flip the button off 'Buy')", () => {
    const purchases = [purchase("p1", "failed", "2026-08"), purchase("p2", "failed", "2026-09")];
    expect(hasActiveMonthlyPurchase(purchases)).toBe(false);
  });

  it("is true when a generating purchase exists", () => {
    expect(hasActiveMonthlyPurchase([purchase("p1", "generating", "2026-08")])).toBe(true);
  });

  it("is true when a ready purchase exists", () => {
    expect(hasActiveMonthlyPurchase([purchase("p1", "ready", "2026-08")])).toBe(true);
  });

  it("is true when ready and failed purchases are mixed", () => {
    const purchases = [purchase("p1", "failed", "2026-08"), purchase("p2", "ready", "2026-09")];
    expect(hasActiveMonthlyPurchase(purchases)).toBe(true);
  });
});

describe("currentMonthKey", () => {
  it("formats the reference date's month as 'YYYY-MM'", () => {
    expect(currentMonthKey(new Date(Date.UTC(2026, 6, 15)))).toBe("2026-07");
  });

  it("pads single-digit months", () => {
    expect(currentMonthKey(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
  });

  it("is stable regardless of the host machine's local timezone (uses UTC)", () => {
    expect(currentMonthKey(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });
});

describe("formatPeriodMonth", () => {
  it("formats a YYYY-MM string as a full month + year label", () => {
    expect(formatPeriodMonth("2026-08")).toBe("August 2026");
  });

  it("is stable regardless of the host machine's local timezone (uses UTC)", () => {
    expect(formatPeriodMonth("2026-01")).toBe("January 2026");
    expect(formatPeriodMonth("2026-12")).toBe("December 2026");
  });
});

describe("filterVisibleReports", () => {
  const reports = [
    { key: "marriage", enabled: true },
    { key: "wealth", enabled: false },
    { key: "true_love", enabled: true },
  ];

  it("keeps only entries where BOTH the catalogue's own enabled flag AND the feature flag are true", () => {
    const isFeatureEnabled = (key: string) => key !== "reports.true_love";
    expect(filterVisibleReports(reports, isFeatureEnabled).map((r) => r.key)).toEqual(["marriage"]);
  });

  it("hides a catalogue-disabled entry even if the feature flag is open (fail-open elsewhere)", () => {
    expect(filterVisibleReports(reports, () => true).map((r) => r.key)).toEqual(["marriage", "true_love"]);
  });

  it("namespaces the feature-flag lookup as reports.<key>", () => {
    // Short-circuits on a catalogue-disabled entry (no need to check its
    // feature flag once it's already invisible) — only enabled entries reach
    // the lookup, so "wealth" (enabled: false) is intentionally absent here.
    const seen: string[] = [];
    filterVisibleReports(reports, (key) => {
      seen.push(key);
      return true;
    });
    expect(seen).toEqual(["reports.marriage", "reports.true_love"]);
  });
});

describe("computeDiscount", () => {
  it("returns null when originalPricePaise is null (no discount configured)", () => {
    expect(computeDiscount(9900, null)).toBeNull();
  });

  it("returns null when originalPricePaise equals pricePaise (no real discount)", () => {
    expect(computeDiscount(9900, 9900)).toBeNull();
  });

  it("returns null when originalPricePaise is lower than pricePaise (never fabricates a markup as a discount)", () => {
    expect(computeDiscount(9900, 5000)).toBeNull();
  });

  it("computes a rounded whole-number percentage off when originalPricePaise is strictly higher", () => {
    // 149 vs 499 -> 1 - 149/499 = 0.7014... -> rounds to 70.
    expect(computeDiscount(14900, 49900)).toEqual({ percentOff: 70 });
  });

  it("rounds to the nearest whole percent rather than truncating", () => {
    // 1 - 90/100 = 0.10 exactly -> 10%.
    expect(computeDiscount(9000, 10000)).toEqual({ percentOff: 10 });
  });
});
