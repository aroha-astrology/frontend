import { describe, expect, it } from "vitest";
import { lalKitabLines, practiceItemTitle } from "./practice-format";

const t = (key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`).join(",")})` : key;

describe("practice-format", () => {
  it("titles each kind of item", () => {
    expect(practiceItemTitle(t, { id: "remedy", kind: "chant", why: [] }, "en")).toBe("practice.items.remedy");
    expect(
      practiceItemTitle(
        t,
        { id: "dasha", kind: "chant", why: [{ kind: "dasha", planet: "Saturn", effect: 0, textKey: "practice.why.dasha" }] },
        "en",
      ),
    ).toBe("practice.items.dasha(planet=planetNames.saturn)");
    expect(
      practiceItemTitle(
        t,
        { id: "weekday", kind: "chant", why: [{ kind: "panchang", effect: 0, textKey: "practice.why.weekday", params: { weekday: 4 } }] },
        "en",
      ),
    ).toBe("practice.items.weekday(weekday=Thursday)");
    expect(
      practiceItemTitle(
        t,
        { id: "weekday", kind: "chant", why: [{ kind: "panchang", effect: 0, textKey: "practice.why.gayatri", params: { weekday: 6 } }] },
        "en",
      ),
    ).toBe("practice.items.gayatri");
  });

  it("looks up the Lal Kitab lines by house", () => {
    expect(lalKitabLines(t, { id: "lalKitab", kind: "action", lalKitab: { house: 8, lines: [0, 1] }, why: [] })).toEqual([
      "practice.lalKitabLines.h8.0",
      "practice.lalKitabLines.h8.1",
    ]);
  });
});
