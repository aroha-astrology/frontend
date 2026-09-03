import { describe, expect, it, beforeEach, vi } from "vitest";

// Same in-memory localStorage stub as lib/app-review.test.ts — this project
// has no jsdom (see vitest.config.ts), and this module only ever touches
// localStorage.getItem/setItem.
function makeLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

vi.stubGlobal("window", { localStorage: makeLocalStorageStub() });

const { hasRatedReport, markReportRated } = await import("./report-rating");

describe("report-rating", () => {
  beforeEach(() => {
    (window as unknown as { localStorage: Storage }).localStorage.clear();
  });

  it("is false for a report that was never rated", () => {
    expect(hasRatedReport("report-1")).toBe(false);
  });

  it("becomes true after marking that report rated", () => {
    markReportRated("report-1");
    expect(hasRatedReport("report-1")).toBe(true);
  });

  it("does not mark an unrelated report", () => {
    markReportRated("report-1");
    expect(hasRatedReport("report-2")).toBe(false);
  });

  it("accumulates multiple rated reports", () => {
    markReportRated("report-1");
    markReportRated("report-2");
    expect(hasRatedReport("report-1")).toBe(true);
    expect(hasRatedReport("report-2")).toBe(true);
  });

  it("does not duplicate an id marked twice", () => {
    markReportRated("report-1");
    markReportRated("report-1");
    const raw = window.localStorage.getItem("aroha:ratedReports:v1");
    expect(JSON.parse(raw ?? "[]")).toEqual(["report-1"]);
  });
});
