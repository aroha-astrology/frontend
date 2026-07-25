import { describe, it, expect } from "vitest";
import {
  bundleLadderPaise,
  estimateBundleTotalPaise,
  splitReportsByType,
  deriveOneTimeCardState,
  purchasedMonthSet,
  purchasedMonthChips,
  nextMonths,
  formatPeriodMonth,
  filterVisibleReports,
  type ReportPurchase,
} from "./reports-logic";

describe("bundleLadderPaise", () => {
  it("is the base price for 1 month", () => {
    expect(bundleLadderPaise(1)).toBe(2500);
  });

  it("adds one step per additional month", () => {
    expect(bundleLadderPaise(2)).toBe(4500);
    expect(bundleLadderPaise(3)).toBe(6500);
  });

  it("caps at the ceiling for a large month count", () => {
    // 2500 + 8*2000 = 18500, 2500 + 9*2000 = 20500 -> capped at 19900
    expect(bundleLadderPaise(9)).toBe(18500);
    expect(bundleLadderPaise(10)).toBe(19900);
    expect(bundleLadderPaise(12)).toBe(19900);
  });

  it("is 0 for a non-positive month count", () => {
    expect(bundleLadderPaise(0)).toBe(0);
    expect(bundleLadderPaise(-1)).toBe(0);
  });
});

describe("estimateBundleTotalPaise", () => {
  it("matches the plain ladder when pricePaise is the structural base (2500)", () => {
    expect(estimateBundleTotalPaise(1, 2500)).toBe(2500);
    expect(estimateBundleTotalPaise(3, 2500)).toBe(6500);
  });

  it("scales proportionally when an admin overrides the per-month price", () => {
    // pricePaise = 5000 -> ratio 2 -> every ladder value doubles
    expect(estimateBundleTotalPaise(1, 5000)).toBe(5000);
    expect(estimateBundleTotalPaise(3, 5000)).toBe(13000);
  });

  it("scales down for a cheaper admin-overridden price", () => {
    // pricePaise = 1250 -> ratio 0.5
    expect(estimateBundleTotalPaise(2, 1250)).toBe(2250); // 4500 * 0.5
  });

  it("rounds once on the final total, not per-step", () => {
    // pricePaise = 999 -> ratio 0.3996; ladder(3) = 6500 -> 6500*0.3996 = 2597.4 -> 2597
    expect(estimateBundleTotalPaise(3, 999)).toBe(2597);
  });

  it("is 0 for zero months regardless of price", () => {
    expect(estimateBundleTotalPaise(0, 5000)).toBe(0);
  });
});

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

describe("nextMonths", () => {
  it("returns the requested count starting at the reference month", () => {
    expect(nextMonths(3, new Date(Date.UTC(2026, 6, 15)))).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("rolls over the calendar year boundary", () => {
    expect(nextMonths(3, new Date(Date.UTC(2026, 10, 1)))).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("returns an empty array for count 0", () => {
    expect(nextMonths(0, new Date(Date.UTC(2026, 6, 15)))).toEqual([]);
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
