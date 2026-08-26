import { describe, expect, it } from "vitest";
import { findTour, TOURS } from "./tour-registry";

describe("findTour", () => {
  it("matches the home tour only on an exact /", () => {
    expect(findTour("/")?.id).toBe("home");
    expect(findTour("/kundli")).toBeUndefined();
  });

  it("claims a report view but not the reports list or history", () => {
    expect(findTour("/reports/abc-123")?.id).toBe("report-detail");
    // The list page is the prefix itself — a prefix tour must not claim it.
    expect(findTour("/reports")).toBeUndefined();
    // A real sibling route living under the same prefix.
    expect(findTour("/reports/history")).toBeUndefined();
  });

  it("returns nothing for routes with no tour", () => {
    expect(findTour("/settings")).toBeUndefined();
    expect(findTour("/admin/users")).toBeUndefined();
  });
});

describe("TOURS", () => {
  it("has unique ids — an id is the persisted completion key", () => {
    const ids = TOURS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every step a title and body key, and unique step ids per tour", () => {
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThan(0);
      const stepIds = tour.steps.map((s) => s.id);
      expect(new Set(stepIds).size, `${tour.id} has duplicate step ids`).toBe(stepIds.length);
      for (const step of tour.steps) {
        expect(step.titleKey, `${tour.id}/${step.id}`).toMatch(/^tour\./);
        expect(step.bodyKey, `${tour.id}/${step.id}`).toMatch(/^tour\./);
      }
    }
  });

  it("orders more specific paths before the prefixes they would shadow", () => {
    for (let i = 0; i < TOURS.length; i++) {
      for (let j = i + 1; j < TOURS.length; j++) {
        const earlier = TOURS[i]!;
        const later = TOURS[j]!;
        // A later entry must never be a strict prefix-match of an earlier one,
        // or the earlier one silently swallows its routes.
        if (!earlier.exact && later.path.startsWith(earlier.path)) {
          throw new Error(`${later.id} (${later.path}) is shadowed by ${earlier.id} (${earlier.path})`);
        }
      }
    }
  });
});
