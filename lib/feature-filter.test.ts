import { describe, it, expect } from "vitest";
import { filterByFeature } from "./feature-filter";

interface Item {
  id: string;
  featureKey: string;
}

const ITEMS: Item[] = [
  { id: "a", featureKey: "nav.home" },
  { id: "b", featureKey: "nav.vastu" },
  { id: "c", featureKey: "nav.horoscope" },
];

describe("filterByFeature", () => {
  it("keeps every item when isEnabled always returns true", () => {
    expect(filterByFeature(ITEMS, () => true)).toEqual(ITEMS);
  });

  it("drops only the items whose featureKey resolves to disabled", () => {
    const disabled = new Set(["nav.vastu"]);
    const result = filterByFeature(ITEMS, (key) => !disabled.has(key));
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("returns an empty array when every item is disabled", () => {
    expect(filterByFeature(ITEMS, () => false)).toEqual([]);
  });

  it("preserves original order and does not mutate the input array", () => {
    const result = filterByFeature(ITEMS, () => true);
    expect(result).not.toBe(ITEMS);
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
