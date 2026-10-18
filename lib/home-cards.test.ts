import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLOTS,
  HOME_CARDS,
  arrangeCards,
  completeOrder,
  defaultHomeLayout,
  dropCard,
  moveCard,
  slotAt,
  type HomeLayoutDoc,
} from "./home-cards";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((i) => i.id);

function layoutOf(order: string[], hero: Partial<Record<"morning" | "midday" | "evening" | "night", string>> = {}): HomeLayoutDoc {
  const base = defaultHomeLayout();
  return {
    ...base,
    vedic: {
      order,
      heroBySlot: { morning: null, midday: null, evening: null, night: null, ...hero },
    },
  };
}

// 2026-11-01 at local time h:m
const at = (h: number, m = 0) => new Date(2026, 10, 1, h, m);

describe("slotAt", () => {
  it("follows the slot start times, and before the morning start it is still night", () => {
    expect(slotAt(at(7), DEFAULT_SLOTS)).toBe("morning");
    expect(slotAt(at(12), DEFAULT_SLOTS)).toBe("midday");
    expect(slotAt(at(18, 30), DEFAULT_SLOTS)).toBe("evening");
    expect(slotAt(at(21), DEFAULT_SLOTS)).toBe("night");
    expect(slotAt(at(3), DEFAULT_SLOTS)).toBe("night");
  });

  it("is exact on the boundary minute", () => {
    expect(slotAt(at(11, 29), DEFAULT_SLOTS)).toBe("morning");
    expect(slotAt(at(11, 30), DEFAULT_SLOTS)).toBe("midday");
  });
});

describe("arrangeCards", () => {
  it("with no layout the built-in order stays", () => {
    expect(ids(arrangeCards(items, null, "vedic", at(9)))).toEqual(["a", "b", "c", "d"]);
  });

  it("follows the layout's order", () => {
    expect(ids(arrangeCards(items, layoutOf(["d", "b", "a", "c"]), "vedic", at(9)))).toEqual(["d", "b", "a", "c"]);
  });

  it("ignores ids that are not cards, and puts unplaced cards at the end in built-in order", () => {
    expect(ids(arrangeCards(items, layoutOf(["ghost", "c", "a"]), "vedic", at(9)))).toEqual(["c", "a", "b", "d"]);
  });

  it("a card that is not among the items (switched off) stays out, whatever the layout says", () => {
    const shown = items.filter((i) => i.id !== "b");
    expect(ids(arrangeCards(shown, layoutOf(["b", "d", "a", "c"]), "vedic", at(9)))).toEqual(["d", "a", "c"]);
  });

  it("the hero for the time slot goes to the top; other slots are unaffected", () => {
    const layout = layoutOf(["a", "b", "c", "d"], { evening: "c" });
    expect(ids(arrangeCards(items, layout, "vedic", at(19)))).toEqual(["c", "a", "b", "d"]);
    expect(ids(arrangeCards(items, layout, "vedic", at(9)))).toEqual(["a", "b", "c", "d"]);
  });

  it("a hero that is switched off is ignored", () => {
    const layout = layoutOf(["a", "b", "c", "d"], { morning: "zzz" });
    expect(ids(arrangeCards(items, layout, "vedic", at(8)))).toEqual(["a", "b", "c", "d"]);
  });

  it("each look has its own order", () => {
    const layout = { ...layoutOf(["a", "b", "c", "d"]), cosmic: { order: ["d", "c", "b", "a"], heroBySlot: { morning: null, midday: null, evening: null, night: null } } };
    expect(ids(arrangeCards(items, layout, "cosmic", at(9)))).toEqual(["d", "c", "b", "a"]);
    expect(ids(arrangeCards(items, layout, "vedic", at(9)))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("editing an order", () => {
  it("moves a card up or down one place and stops at the ends", () => {
    expect(moveCard(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveCard(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveCard(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveCard(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });

  it("drops a card onto another card's place", () => {
    expect(dropCard(["a", "b", "c", "d"], "d", "a")).toEqual(["d", "a", "b", "c"]);
    expect(dropCard(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(dropCard(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });

  it("completeOrder drops unknown ids and adds every card the order missed", () => {
    const out = completeOrder(["remedies", "ghost", "todayReading"]);
    expect(out.slice(0, 2)).toEqual(["remedies", "todayReading"]);
    expect(out).toHaveLength(HOME_CARDS.length);
    expect(new Set(out).size).toBe(HOME_CARDS.length);
  });
});
