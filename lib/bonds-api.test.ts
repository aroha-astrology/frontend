import { describe, expect, it } from "vitest";
import { resources } from "@/i18n/resources";
import { ROADMAP_BUNDLES } from "@/i18n/roadmap";
import { ROADMAP_LANGS } from "@/i18n/roadmap/types";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import { BOND_CATEGORIES, CATEGORY_ART, RELATIONSHIP_CATEGORY, relationshipsIn } from "@/lib/bonds-api";

type Tree = { [key: string]: unknown };

function merge(a: Tree, b: Tree): Tree {
  const out: Tree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === "object" && v && typeof v === "object" ? merge(cur as Tree, v as Tree) : v;
  }
  return out;
}

const at = (tree: Tree, key: string) => key.split(".").reduce<unknown>((node, k) => (node as Tree | undefined)?.[k], tree);

/** Everything a reader of `lang` gets: the hand-written bundles, then the generated file filling the gaps. */
async function textFor(lang: string): Promise<Tree> {
  const all = resources as unknown as Record<string, { translation: Tree } | undefined>;
  let tree: Tree = all[lang]?.translation ?? {};
  if ((ROADMAP_LANGS as readonly string[]).includes(lang)) {
    for (const bundle of ROADMAP_BUNDLES) tree = merge(tree, bundle[lang as (typeof ROADMAP_LANGS)[number]] as Tree);
  }
  if (lang !== "en") tree = merge((await import(`@/i18n/generated/${lang}.json`)).default as Tree, tree);
  return tree;
}

const LANGS = ["en", "hi", "bn", "mr", "te", "ta", "gu", "kn", "es", "fr", "de", "pt", "it", "ru", "ja"];
const RELATIONSHIPS = Object.keys(RELATIONSHIP_CATEGORY);

describe("Aroha Bonds relationships", () => {
  it("has 28 relationships, each in a group the picker offers", () => {
    expect(RELATIONSHIPS).toHaveLength(28);
    expect(Object.keys(RELATIONSHIP_KEYS).sort()).toEqual([...RELATIONSHIPS].sort());
    const offered = BOND_CATEGORIES.flatMap((c) => relationshipsIn(c));
    expect([...offered].sort()).toEqual([...RELATIONSHIPS].sort());
    for (const c of BOND_CATEGORIES) expect(CATEGORY_ART[c]).toMatch(/^\/.+\.png$/);
  });

  for (const lang of LANGS) {
    it(`${lang}: every relationship, tab and meter has its own text`, async () => {
      const text = await textFor(lang);
      const keys = [
        ...RELATIONSHIPS.map((r) => `profileSwitcher.relationship.${r}`),
        ...["all", ...BOND_CATEGORIES].map((c) => `bonds.tabs.${c}`),
        ...["emotion", "communication", "spark", "workflow", "vibe", "foundation"].flatMap((m) => [
          `bonds.relate.name.${m}`,
          ...["high", "mid", "low"].map((level) => `bonds.relate.line.${m}.${level}`),
        ]),
        ...["signs", "moonElement", "cross", "lords"].map((p) => `bonds.relate.part.${p}`),
        ...["neither", "both", "youOnly", "themOnly", "title"].map((k) => `bonds.mangal.${k}`),
        ...["theirGood", "theirCare", "sharedGood", "sharedCare", "birthday", "windowGood", "windowCare"].map((k) => `bonds.dates.${k}`),
        "bonds.why.theirTransit",
        "bonds.phase.you",
        "bonds.phase.period",
        "bonds.phase.sameTheme",
        "bonds.phase.differentTheme",
        "bonds.upcoming.bothGood",
        "bonds.upcoming.bothCare",
        "bonds.mother",
        "bonds.father",
        "bonds.picker.group",
        "bonds.retry",
      ];
      for (const key of keys) {
        const value = at(text, key);
        expect(typeof value === "string" && value.trim() !== "", `${lang}: ${key}`).toBe(true);
      }
    });
  }
});
