import { describe, expect, it } from "vitest";
import { EVENT_KINDS, formatEventDate, kindKey, splitVault, type VaultEntry } from "./memory";
import { REPORT_REASONS, signOfRoom, skyProblemOf } from "./same-sky";
import { makeNamer, nameKey } from "./panchang-names";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { guideAvatarSrc, guideName, type PersonaInfo } from "@/hooks/usePersona";
import { PILL_GROUPS, visiblePills } from "./nav-pills";
import { languageStrings } from "../scripts/i18n-parity";

const entry = (over: Partial<VaultEntry>): VaultEntry => ({
  id: "x",
  text: "t",
  toldByGuide: false,
  question: null,
  eventKind: null,
  eventDate: null,
  status: "ACTIVE",
  canConfirm: false,
  confirmed: false,
  createdAt: "2026-10-01T00:00:00Z",
  ...over,
});

describe("memory vault helpers", () => {
  it("puts dated things first (latest day first), then plain facts newest first", () => {
    const items = [
      entry({ id: "f-old", createdAt: "2026-09-01T00:00:00Z" }),
      entry({ id: "e-early", eventDate: "2026-11-01" }),
      entry({ id: "f-new", createdAt: "2026-10-20T00:00:00Z" }),
      entry({ id: "e-late", eventDate: "2026-12-01" }),
    ];
    const { events, facts } = splitVault(items);
    expect(events.map((e) => e.id)).toEqual(["e-late", "e-early"]);
    expect(facts.map((e) => e.id)).toEqual(["f-new", "f-old"]);
  });

  it("files every event kind under its own string and unknown kinds as a plain event", () => {
    for (const k of EVENT_KINDS) expect(kindKey(k)).toBe(`memory.kind.${k}`);
    expect(kindKey("surgery")).toBe("memory.kind.other");
    expect(kindKey(null)).toBe("memory.kind.other");
  });

  it("writes the day as that day, whatever the zone of the device", () => {
    expect(formatEventDate("2026-11-05", "en-GB")).toBe("5 Nov 2026");
    expect(formatEventDate("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("Same Sky helpers", () => {
  it("knows the problems the server names and nothing else", () => {
    expect(skyProblemOf("SKY_DAILY_LIMIT")).toBe("SKY_DAILY_LIMIT");
    expect(skyProblemOf("NO_ROOM")).toBe("NO_ROOM");
    expect(skyProblemOf("something")).toBeNull();
    expect(skyProblemOf(undefined)).toBeNull();
  });

  it("offers seven report reasons and names a room's sign", () => {
    expect(REPORT_REASONS).toHaveLength(7);
    expect(signOfRoom("taurus")).toBe("Taurus");
  });

  it("puts Same Sky in the Ask row only when its own switch is on", () => {
    const ask = PILL_GROUPS.find((g) => g.id === "ask")!;
    expect(visiblePills(ask, (p) => p.featureKey !== "community.sameSky").map((p) => p.href)).not.toContain("/sky");
    expect(visiblePills(ask, () => true).map((p) => p.href)).toContain("/sky");
  });
});

describe("panchang names", () => {
  const dict: Record<string, string> = { "tithiNames.purnima": "पूर्णिमा", "nakshatraNames.purvaphalguni": "पूर्वा फाल्गुनी", "nowBar.paksha.shukla": "शुक्ल" };
  const t = (key: string, o?: { defaultValue?: string }) => dict[key] ?? o?.defaultValue ?? key;

  it("files names under their letters only", () => {
    expect(nameKey("Purva Phalguni")).toBe("purvaphalguni");
    expect(nameKey("Purva-Ashadha")).toBe("purvaashadha");
  });

  it("returns the engine's English name untouched while the switch is off", () => {
    const n = makeNamer(t, false);
    expect(n.tithi("Purnima")).toBe("Purnima");
    expect(n.nakshatra("Purva Phalguni")).toBe("Purva Phalguni");
    expect(n.paksha("Shukla")).toBe("Shukla");
  });

  it("translates with the switch on, and keeps the English when a name is unknown", () => {
    const n = makeNamer(t, true);
    expect(n.tithi("Purnima")).toBe("पूर्णिमा");
    expect(n.nakshatra("Purva Phalguni")).toBe("पूर्वा फाल्गुनी");
    expect(n.paksha("Shukla")).toBe("शुक्ल");
    expect(n.tithi("Madeup")).toBe("Madeup");
    expect(n.tithi("")).toBe("");
  });

  it("all 16 tithi names and 27 nakshatra names exist in all 15 languages", async () => {
    for (const lang of ["en", "hi", "bn", "mr", "te", "ta", "gu", "kn", "es", "fr", "de", "pt", "it", "ru", "ja"] as const) {
      const s = await languageStrings(lang);
      expect(Object.keys(s).filter((k) => k.startsWith("tithiNames.")), lang).toHaveLength(16);
      expect(Object.keys(s).filter((k) => k.startsWith("nakshatraNames.")), lang).toHaveLength(27);
    }
  });
});

describe("guideName", () => {
  const info = (current: string): PersonaInfo => ({
    look: "MODERN_COSMIC",
    current,
    options: [
      { id: "orion", name: "Orion" },
      { id: "maya", name: "Maya" },
    ],
  });

  it("shows the translated default for Yogi Baba or when nothing is loaded, and the plain name otherwise", () => {
    expect(guideName(null, "योगी बाबा")).toBe("योगी बाबा");
    expect(guideName(info("maya"), "योगी बाबा")).toBe("Maya");
    expect(guideName({ ...info("yogi-baba"), options: [{ id: "yogi-baba", name: "Yogi Baba" }] }, "योगी बाबा")).toBe("योगी बाबा");
  });
});

describe("guideAvatarSrc", () => {
  it("gives every guide a portrait file that exists, and Yogi Baba's for him or an unknown id", () => {
    for (const id of ["pandit-vikram", "gauri", "kavitha-ji", "orion", "soren", "maya", "elena"]) {
      const src = guideAvatarSrc(id);
      expect(src).toBe(`/guides/${id}.webp`);
      expect(existsSync(join(process.cwd(), "public", src)), id).toBe(true);
    }
    expect(guideAvatarSrc("yogi-baba")).toBe("/yogi-baba.webp");
    expect(guideAvatarSrc("someone-new")).toBe("/yogi-baba.webp");
    expect(guideAvatarSrc(null)).toBe("/yogi-baba.webp");
  });
});
