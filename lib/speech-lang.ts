import type { LangCode } from "@/providers/language-provider";

/**
 * Which voice should read `text`: the language of its script, so a Bengali
 * reply is spoken in a Bengali voice even while the app is set to English
 * (someone asking "amar chakri kemon?" often gets a Bengali answer).
 * Devanagari could be Hindi or Marathi — keep the app language when it's one
 * of those, otherwise Hindi. Latin text is read in English. Text with no
 * letters at all keeps the app language.
 */
export function speechLangFor(text: string, appLang: LangCode): LangCode {
  const counts: Record<string, number> = { deva: 0, beng: 0, taml: 0, telu: 0, gujr: 0, latn: 0 };
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0900 && c <= 0x097f) counts.deva!++;
    else if (c >= 0x0980 && c <= 0x09ff) counts.beng!++;
    else if (c >= 0x0b80 && c <= 0x0bff) counts.taml!++;
    else if (c >= 0x0c00 && c <= 0x0c7f) counts.telu!++;
    else if (c >= 0x0a80 && c <= 0x0aff) counts.gujr!++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) counts.latn!++;
  }
  const [script, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]!;
  if (n === 0) return appLang;
  switch (script) {
    case "deva":
      return appLang === "mr" ? "mr" : "hi";
    case "beng":
      return "bn";
    case "taml":
      return "ta";
    case "telu":
      return "te";
    case "gujr":
      return "gu";
    default:
      return "en";
  }
}
