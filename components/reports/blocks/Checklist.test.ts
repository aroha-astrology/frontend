import { describe, it, expect } from "vitest";
import { normalizeChecklistItems } from "./Checklist";

describe("normalizeChecklistItems", () => {
  it("passes through a plain string array unchanged", () => {
    expect(normalizeChecklistItems(["Buy a gemstone", "Visit temple"])).toEqual([
      "Buy a gemstone",
      "Visit temple",
    ]);
  });

  it("extracts .text from a {text} object array", () => {
    expect(normalizeChecklistItems([{ text: "Do X" }, { text: "Do Y" }])).toEqual(["Do X", "Do Y"]);
  });

  it("handles a mixed array of strings and objects", () => {
    expect(normalizeChecklistItems(["Plain", { text: "Object" }])).toEqual(["Plain", "Object"]);
  });

  it("trims whitespace and drops blank/whitespace-only entries", () => {
    expect(normalizeChecklistItems(["  Trim me  ", "   ", "", { text: "  " }])).toEqual(["Trim me"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(normalizeChecklistItems([])).toEqual([]);
  });
});
