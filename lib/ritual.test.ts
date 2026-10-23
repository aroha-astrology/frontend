import { describe, expect, it } from "vitest";
import { ROADMAP_LANGS, type TranslationTree } from "@/i18n/roadmap/types";
import { prashnaBundle } from "@/i18n/roadmap/prashna";
import {
  LENS_KEYS,
  NAKSHATRA_KEYS,
  PRASHNA_CARDS,
  prashnaKeys,
  prashnaRef,
} from "./ritual";

function lookup(tree: TranslationTree, key: string): string {
  let node: string | TranslationTree | undefined = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return "";
    node = node[part];
  }
  return typeof node === "string" ? node : "";
}

describe("prashnaRef", () => {
  it("cuts 108 cards into 27 nakshatras of 4 padas", () => {
    expect(PRASHNA_CARDS).toBe(108);
    expect(NAKSHATRA_KEYS).toHaveLength(27);
    expect(prashnaRef(0)).toMatchObject({ nakshatra: 0, nakshatraKey: "ashwini", pada: 1, lens: "dharma" });
    expect(prashnaRef(5)).toMatchObject({ nakshatra: 1, nakshatraKey: "bharani", pada: 2, lens: "artha" });
    expect(prashnaRef(107)).toMatchObject({ nakshatra: 26, nakshatraKey: "revati", pada: 4, lens: "moksha" });
  });

  it("pada 1-4 stand for dharma, artha, kama, moksha", () => {
    expect([0, 1, 2, 3].map((i) => prashnaRef(i).lens)).toEqual([...LENS_KEYS]);
  });

  it("wraps an index outside 0-107", () => {
    expect(prashnaRef(108).index).toBe(0);
    expect(prashnaRef(-1).index).toBe(107);
  });
});

describe("the 108 Prashna cards", () => {
  for (const lang of ROADMAP_LANGS) {
    for (const look of ["vedic", "cosmic"] as const) {
      it(`${lang} / ${look}: every card has a theme, an aim and a question, and no two cards read alike`, () => {
        const seen = new Set<string>();
        for (let i = 0; i < PRASHNA_CARDS; i++) {
          const keys = prashnaKeys(look, prashnaRef(i));
          const theme = lookup(prashnaBundle[lang], keys.theme);
          const label = lookup(prashnaBundle[lang], keys.lensLabel);
          const question = lookup(prashnaBundle[lang], keys.question);
          expect(theme, `${lang} ${look} #${i} theme`).not.toBe("");
          expect(label, `${lang} ${look} #${i} label`).not.toBe("");
          expect(question, `${lang} ${look} #${i} question`).toContain("{{theme}}");
          seen.add(question.replace("{{theme}}", theme));
        }
        expect(seen.size).toBe(PRASHNA_CARDS);
      });
    }
  }

  it("the Classic and Cosmic looks word the themes differently", () => {
    let different = 0;
    for (const key of NAKSHATRA_KEYS) {
      if (lookup(prashnaBundle.en, `prashna.vedic.theme.${key}`) !== lookup(prashnaBundle.en, `prashna.cosmic.theme.${key}`)) different++;
    }
    expect(different).toBeGreaterThanOrEqual(24);
  });
});
