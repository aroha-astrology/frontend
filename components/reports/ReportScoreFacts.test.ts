import { describe, it, expect } from "vitest";
import { isLongNestedFact } from "./ReportScoreFacts";
import type { NestedFact } from "@/lib/report-score-facts";

function nestedFact(entries: { label: string; display: string }[]): NestedFact {
  return { key: "modernRealities", label: "Modern Realities", type: "nested", entries };
}

describe("isLongNestedFact", () => {
  it("promotes a fact with long labels but short values to full width", () => {
    // Reproduces the Modern Realities overflow: labels like "Seventh House Planet
    // Count" are long, but the values ("1", "✗") are trivially short — a
    // length check on values alone misses this and squeezes it into a
    // half-width grid tile, overflowing the rigid, non-wrapping label.
    const fact = nestedFact([
      { label: "Late Marriage Leaning", display: "✗" },
      { label: "Rahu House", display: "1" },
      { label: "Seventh House Planet Count", display: "1" },
    ]);
    expect(isLongNestedFact(fact)).toBe(true);
  });

  it("keeps a fact with short labels and short values in the half-width grid", () => {
    const fact = nestedFact([
      { label: "Sun", display: "Strong" },
      { label: "Moon", display: "Weak" },
    ]);
    expect(isLongNestedFact(fact)).toBe(false);
  });

  it("still promotes a fact with long combined values (existing behavior)", () => {
    const fact = nestedFact([
      { label: "Note", display: "A fairly long sentence that clearly exceeds the threshold on its own." },
    ]);
    expect(isLongNestedFact(fact)).toBe(true);
  });
});
