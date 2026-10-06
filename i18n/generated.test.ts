import { describe, expect, it } from "vitest";
import { resources } from "./resources";
import { ROADMAP_BUNDLES } from "./roadmap";

type Tree = { [key: string]: unknown };

function merge(a: Tree, b: Tree): Tree {
  const out: Tree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === "object" && !Array.isArray(cur) && v && typeof v === "object" && !Array.isArray(v) ? merge(cur as Tree, v as Tree) : v;
  }
  return out;
}

function leaves(node: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof node === "string") out[prefix] = node;
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${prefix}.${i}`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

const en = leaves(ROADMAP_BUNDLES.reduce<Tree>((acc, b) => merge(acc, b.en as Tree), resources.en.translation as unknown as Tree));
const CODES = ["hi", "bn", "mr", "te", "ta", "gu", "kn", "es", "fr", "de", "pt", "it", "ru", "ja"];

describe("generated translations (i18n/generated/*.json)", () => {
  for (const code of CODES) {
    it(`${code}: only known keys, same {{placeholders}}, nothing empty`, async () => {
      const data = (await import(`./generated/${code}.json`)).default;
      const flat = leaves(data);
      for (const [key, value] of Object.entries(flat)) {
        expect(en[key], `${code}: unknown key ${key}`).toBeDefined();
        expect(value.trim(), `${code}:${key}`).not.toBe("");
        expect(placeholders(value), `${code}:${key}`).toEqual(placeholders(en[key]!));
      }
    });
  }
});
