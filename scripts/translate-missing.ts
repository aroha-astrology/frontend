// Fills in the strings a language is missing, using Oxion (oxionai.com/v1).
//
// Every language falls back to English for a key it lacks. This finds each key the English tree
// has and a language does not (in resources.ts, the roadmap bundles or i18n/generated/<code>.json),
// asks Oxion to translate only those, checks the {{placeholders}} survived, and merges the result
// into i18n/generated/<code>.json (which i18n/generated.test.ts then verifies).
//
//   node_modules/.pnpm/vite-node@3.2.4*/node_modules/vite-node/vite-node.mjs scripts/translate-missing.ts [prefix ...] [--dry]
//
// A prefix (e.g. `palm.` `reports.book.`) limits it to those keys. Key: OXION_API_KEY, or `oxionai=`
// in ../backend/.env.

import fs from "node:fs";
import path from "node:path";
import { resources } from "../i18n/resources";
import { ROADMAP_BUNDLES } from "../i18n/roadmap";

type Tree = { [key: string]: unknown };
const MODEL = "gemini-3.7-flash";
const CODES: Record<string, string> = {
  hi: "Hindi", bn: "Bengali", mr: "Marathi", te: "Telugu", ta: "Tamil", gu: "Gujarati", kn: "Kannada",
  es: "Spanish", fr: "French", de: "German", pt: "Portuguese", it: "Italian", ru: "Russian", ja: "Japanese",
};

function merge(a: Tree, b: Tree): Tree {
  const out: Tree = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    const obj = (x: unknown): x is Tree => !!x && typeof x === "object" && !Array.isArray(x);
    out[k] = obj(cur) && obj(v) ? merge(cur, v) : v;
  }
  return out;
}

function leaves(node: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof node === "string") out[prefix] = node;
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${prefix}.${i}`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

function setPath(tree: Tree, dotted: string, value: string) {
  const parts = dotted.split(".");
  let cur: Tree = tree;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Tree;
  }
  cur[parts[parts.length - 1]!] = value;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");

function key(): string {
  if (process.env.OXION_API_KEY) return process.env.OXION_API_KEY;
  const env = fs.readFileSync(path.resolve(__dirname, "../../backend/.env"), "utf8");
  return env.match(/^oxionai=(.*)$/m)![1]!.trim().replace(/^"|"$/g, "");
}

async function ask(language: string, batch: Record<string, string>): Promise<Record<string, string>> {
  const prompt =
    `Translate these app strings from English into ${language} for an Indian astrology app (Aroha Astrology). ` +
    `Keep the tone warm and simple. Keep every {{placeholder}} exactly as is, and keep brand/product names ` +
    `(Aroha, Aroha Pass, Life Timeline, Bonds, Palmistry) in English letters. Return ONLY a JSON object with the ` +
    `same keys and the translated strings as values.\n\n${JSON.stringify(batch)}`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch("https://oxionai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 16000, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(240_000),
    });
    const body = await res.text();
    if (res.ok) {
      const text = (JSON.parse(body).choices?.[0]?.message?.content ?? "") as string;
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]) as Record<string, string>;
    }
    console.log(`  ${language}: attempt ${attempt} failed (${res.status} ${body.slice(0, 80).replace(/\s+/g, " ")}), retrying`);
    await new Promise((r) => setTimeout(r, 20_000 * attempt));
  }
  throw new Error(`Oxion would not translate into ${language}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const prefixes = args.filter((a) => !a.startsWith("--"));
  const en = leaves(ROADMAP_BUNDLES.reduce<Tree>((acc, b) => merge(acc, b.en as Tree), resources.en.translation as unknown as Tree));
  const wanted = Object.keys(en).filter((k) => prefixes.length === 0 || prefixes.some((p) => k.startsWith(p)));

  for (const [code, language] of Object.entries(CODES)) {
    const file = path.resolve(__dirname, `../i18n/generated/${code}.json`);
    const generated = JSON.parse(fs.readFileSync(file, "utf8")) as Tree;
    const have = leaves(
      merge(
        ROADMAP_BUNDLES.reduce<Tree>((acc, b) => merge(acc, ((b as unknown as Record<string, Tree>)[code] ?? {}) as Tree), {}),
        merge(((resources as unknown as Record<string, { translation: Tree }>)[code]?.translation ?? {}) as Tree, generated),
      ),
    );
    const missing = wanted.filter((k) => !(k in have));
    console.log(`${code}: ${missing.length} missing`);
    if (dry || missing.length === 0) continue;
    for (let i = 0; i < missing.length; i += 60) {
      const batch = Object.fromEntries(missing.slice(i, i + 60).map((k) => [k, en[k]!]));
      const out = await ask(language, batch);
      for (const [k, english] of Object.entries(batch)) {
        const t = out[k];
        if (typeof t !== "string" || !t.trim() || placeholders(t) !== placeholders(english)) {
          console.log(`  ${code}: skipped ${k} (missing or placeholders changed)`);
          continue;
        }
        setPath(generated, k, t.trim());
      }
    }
    fs.writeFileSync(file, JSON.stringify(generated));
  }
}

void main();
