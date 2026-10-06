import i18n from "./config";

/**
 * Translations generated from docs/translations (i18n/generated/<code>.json) load on
 * demand, so a reader only downloads the language they pick. They fill in anything the
 * hand-written bundles in resources.ts and roadmap/* don't carry (overwrite is off).
 */
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  hi: () => import("./generated/hi.json"),
  bn: () => import("./generated/bn.json"),
  mr: () => import("./generated/mr.json"),
  te: () => import("./generated/te.json"),
  ta: () => import("./generated/ta.json"),
  gu: () => import("./generated/gu.json"),
  kn: () => import("./generated/kn.json"),
  es: () => import("./generated/es.json"),
  fr: () => import("./generated/fr.json"),
  de: () => import("./generated/de.json"),
  pt: () => import("./generated/pt.json"),
  it: () => import("./generated/it.json"),
  ru: () => import("./generated/ru.json"),
  ja: () => import("./generated/ja.json"),
};

export async function switchLanguage(code: string): Promise<void> {
  const load = LOADERS[code];
  if (load && !i18n.hasResourceBundle(code, "generated")) {
    try {
      const mod = await load();
      i18n.addResourceBundle(code, "translation", mod.default, true, false);
      i18n.addResourceBundle(code, "generated", {}, false, false); // marks it as loaded
    } catch {
      // Offline or a failed chunk: fall through to whatever is already bundled.
    }
  }
  await i18n.changeLanguage(code);
}
