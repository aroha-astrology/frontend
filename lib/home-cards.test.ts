import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLOTS,
  HOME_CARDS,
  MOMENT_CARDS,
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

describe("home.timeMorph", () => {
  const cards = ["nowBar", "hookKavach", "hookSleep", "hookDiya", "hookShubhLabh", "hookMystery", "hookRahasya", "hookReceipts"].map((id) => ({ id }));

  it("does nothing while the switch is off", () => {
    expect(ids(arrangeCards(cards, null, "vedic", at(7)))).toEqual(ids(cards));
    expect(ids(arrangeCards(cards, defaultHomeLayout(), "vedic", at(7)))).toEqual(ids(cards));
  });

  it("brings the card whose moment it is to the front, without a saved layout", () => {
    const lead = (h: number, m = 0) => ids(arrangeCards(cards, null, "vedic", at(h, m), { timeMorph: true }))[0];
    expect(lead(7)).toBe("hookKavach"); // morning
    expect(lead(12)).toBe("hookDiya"); // midday
    expect(lead(19)).toBe("hookMystery"); // evening
    expect(lead(21)).toBe("hookReceipts"); // night
  });

  it("keeps everything else in order", () => {
    const out = ids(arrangeCards(cards, null, "vedic", at(12), { timeMorph: true }));
    expect(out).toEqual(["hookDiya", "nowBar", "hookKavach", "hookSleep", "hookShubhLabh", "hookMystery", "hookRahasya", "hookReceipts"]);
  });

  it("skips a moment card that is not on Home and takes the next, or leaves the order alone", () => {
    const noKavach = cards.filter((c) => c.id !== "hookKavach");
    expect(ids(arrangeCards(noKavach, null, "vedic", at(7), { timeMorph: true }))[0]).toBe("hookSleep");
    const none = [{ id: "nowBar" }, { id: "x" }];
    expect(ids(arrangeCards(none, null, "vedic", at(7), { timeMorph: true }))).toEqual(["nowBar", "x"]);
  });

  it("the owner's hero for the slot wins over the moment card", () => {
    const layout = layoutOf(ids(cards), { midday: "hookRahasya" });
    expect(ids(arrangeCards(cards, layout, "vedic", at(12), { timeMorph: true }))[0]).toBe("hookRahasya");
  });

  it("with a layout but no hero set for the slot, the moment card still leads", () => {
    const layout = layoutOf(ids(cards));
    expect(ids(arrangeCards(cards, layout, "vedic", at(12), { timeMorph: true }))[0]).toBe("hookDiya");
  });

  it("every moment card is a real Home card", () => {
    const known = new Set(HOME_CARDS.map((c) => c.id));
    for (const slot of ["morning", "midday", "evening", "night"] as const) for (const id of MOMENT_CARDS[slot]) expect(known.has(id)).toBe(true);
  });
});

describe("the hook cards on Home", () => {
  it("are eight, each ship-dark (isNew) and tied to its own hooks.* switch", () => {
    const hooks = HOME_CARDS.filter((c) => c.id.startsWith("hook"));
    expect(hooks).toHaveLength(8);
    for (const c of hooks) {
      expect(c.isNew).toBe(true);
      expect(c.featureKey).toMatch(/^hooks\./);
    }
  });
});
