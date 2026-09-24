import { describe, expect, it } from "vitest";
import { ROADMAP_BUNDLES } from "./index";
import { ROADMAP_LANGS, type TranslationTree } from "./types";

function flatten(tree: TranslationTree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe("roadmap translation bundles", () => {
  ROADMAP_BUNDLES.forEach((bundle, i) => {
    const en = flatten(bundle.en);

    it(`bundle #${i} has every key in all 7 languages, non-empty`, () => {
      for (const lang of ROADMAP_LANGS) {
        const flat = flatten(bundle[lang]);
        expect(Object.keys(flat).sort(), lang).toEqual(Object.keys(en).sort());
        for (const [key, value] of Object.entries(flat)) expect(value.trim(), `${lang}:${key}`).not.toBe("");
      }
    });

    it(`bundle #${i} keeps the same {{placeholders}} in every translation`, () => {
      for (const lang of ROADMAP_LANGS) {
        const flat = flatten(bundle[lang]);
        for (const [key, value] of Object.entries(en)) {
          expect(placeholders(flat[key]!), `${lang}:${key}`).toEqual(placeholders(value));
        }
      }
    });
  });
});
