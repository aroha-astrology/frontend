// Counts how far each of the 15 app languages is from English. Shared by the CI check
// (scripts/verify-i18n-parity.test.ts) and by `pnpm i18n:parity` for the printed report.
import { resources } from "../i18n/resources";
import { ROADMAP_BUNDLES } from "../i18n/roadmap";
import { ROADMAP_LANGS } from "../i18n/roadmap/types";

type Tree = { [key: string]: unknown };

export const ALL_LANGS = ["en", "hi", "bn", "mr", "te", "ta", "gu", "kn", "es", "fr", "de", "pt", "it", "ru", "ja"] as const;
export type Lang = (typeof ALL_LANGS)[number];

function merge(a: Tree, b: Tree): Tree {
  const out: Tree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === "object" && !Array.isArray(cur) && v && typeof v === "object" && !Array.isArray(v) ? merge(cur as Tree, v as Tree) : v;
  }
  return out;
}

export function leaves(node: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof node === "string") out[prefix] = node;
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${prefix}.${i}`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

export const placeholders = (s: string): string[] => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!).sort();

/** Keys that are English-only on purpose. Each one needs a reason. */
export const KNOWN_EXCEPTIONS: Record<string, string> = {
  "gita.meanings": "Bhagavad Gita meanings come later; for now only the verse and its transliteration are shown",
};

/** All strings a language has once the hand-written blocks and the generated file are put together. */
export async function languageStrings(code: Lang): Promise<Record<string, string>> {
  const hand = (resources as unknown as Record<string, { translation: Tree }>)[code]?.translation ?? {};
  let tree: Tree = hand;
  for (const b of ROADMAP_BUNDLES) {
    if ((ROADMAP_LANGS as readonly string[]).includes(code)) tree = merge(tree, (b as unknown as Record<string, Tree>)[code] ?? {});
  }
  const flat = leaves(tree);
  if (code !== "en") {
    // Same precedence as switch-language.ts: what is hand-written wins, the generated file fills the rest.
    const generated = leaves((await import(`../i18n/generated/${code}.json`)).default);
    for (const [k, v] of Object.entries(generated)) if (!(k in flat)) flat[k] = v;
  }
  return flat;
}

export interface LangParity {
  code: Lang;
  total: number;
  missing: string[];
  badPlaceholders: string[];
  empty: string[];
  unknown: string[];
}

export async function computeParity(): Promise<LangParity[]> {
  const en = await languageStrings("en");
  const out: LangParity[] = [];
  for (const code of ALL_LANGS) {
    if (code === "en") continue;
    const own = await languageStrings(code);
    const missing: string[] = [];
    const badPlaceholders: string[] = [];
    const empty: string[] = [];
    for (const [key, value] of Object.entries(en)) {
      if (Object.keys(KNOWN_EXCEPTIONS).some((p) => key === p || key.startsWith(`${p}.`))) continue;
      const mine = own[key];
      if (mine === undefined) {
        missing.push(key);
        continue;
      }
      if (!mine.trim()) empty.push(key);
      else if (placeholders(mine).join() !== placeholders(value).join()) badPlaceholders.push(key);
    }
    const unknown = Object.keys(own).filter((k) => !(k in en));
    out.push({ code, total: Object.keys(en).length, missing, badPlaceholders, empty, unknown });
  }
  return out;
}
