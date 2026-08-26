import { describe, expect, it } from "vitest";
import { findTour, TOURS } from "./tour-registry";
import { resources } from "@/i18n/resources";

describe("findTour", () => {
  it("matches the home tour only on an exact /", () => {
    expect(findTour("/")?.id).toBe("home");
    // "/" is exact, so it must not swallow every other route as a prefix.
    expect(findTour("/kundli")?.id).toBe("kundli");
    expect(findTour("/profile")).toBeUndefined();
  });

  it("keeps the report view, the reports list and history apart", () => {
    expect(findTour("/reports/abc-123")?.id).toBe("report-detail");
    // The list page is the prefix itself — the prefix tour must not claim it,
    // it has its own.
    expect(findTour("/reports")?.id).toBe("reports-list");
    // A real sibling route under the same prefix, with no tour of its own.
    expect(findTour("/reports/history")).toBeUndefined();
  });

  it("matches every other registered screen exactly", () => {
    for (const path of ["/kundli", "/ai-chat", "/horoscope", "/panchang", "/remedies", "/vastu", "/palm"]) {
      expect(findTour(path), path).toBeDefined();
    }
    // Exact-matched tours must not leak onto their own sub-routes.
    expect(findTour("/palm/abc-123")).toBeUndefined();
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

describe("tour i18n", () => {
  const LANGS = Object.keys(resources) as (keyof typeof resources)[];

  const lookup = (lang: keyof typeof resources, dotted: string): unknown =>
    dotted
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
        resources[lang].translation,
      );

  // The registry references keys by string, so a typo or a half-finished
  // translation is invisible until a step renders the raw key to a user.
  it.each(LANGS)("resolves every step's title and body in %s", (lang) => {
    const missing: string[] = [];
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        for (const key of [step.titleKey, step.bodyKey]) {
          const value = lookup(lang, key);
          if (typeof value !== "string" || value.length === 0) missing.push(key);
        }
      }
    }
    expect(missing, `${lang} missing: ${missing.join(", ")}`).toEqual([]);
  });

  it("translates the tour chrome in every language", () => {
    for (const lang of LANGS) {
      for (const key of ["tour.next", "tour.back", "tour.done", "tour.skip"]) {
        expect(typeof lookup(lang, key), `${lang} ${key}`).toBe("string");
      }
    }
  });
});
