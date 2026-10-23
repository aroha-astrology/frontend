// Devanagari -> other scripts, by rule, for the Bhagavad Gita (switch lang.gitaScripts).
//
// The Sanskrit is never changed. A reader whose own script is Bengali, Gujarati, Telugu, Tamil or Kannada can
// see the verse in that script, and a reader of a Latin-script language sees IAST (the scholarly Latin
// transliteration). Hindi and Marathi readers already read Devanagari, so nothing is added for them.
//
// Deterministic and dependency-free: the same text always gives the same result, so it is safe to compute
// while rendering and to test by example. No guessing: a character this file does not know is passed through.

export type TranslitTarget = "iast" | "bn" | "gu" | "te" | "ta" | "kn";

/** Which transliteration an app language gets, or null when its readers already read Devanagari. */
export function targetForLanguage(lang: string): TranslitTarget | null {
  const base = lang.split("-")[0]!.toLowerCase();
  switch (base) {
    case "bn":
    case "gu":
    case "te":
    case "ta":
    case "kn":
      return base;
    case "hi":
    case "mr":
      return null;
    default:
      // English and every Latin-script language, Japanese and Russian included: IAST.
      return "iast";
  }
}

/** The Devanagari block's pieces this file maps. */
const VIRAMA = 0x094d;
const NUKTA = 0x093c;

const isConsonant = (cp: number) => (cp >= 0x0915 && cp <= 0x0939) || cp === 0x0933 || (cp >= 0x0958 && cp <= 0x095f);
const isMatra = (cp: number) => (cp >= 0x093e && cp <= 0x094c) || cp === 0x0962 || cp === 0x0963;

/* -------------------------------------------------------------------------- */
/* IAST                                                                        */
/* -------------------------------------------------------------------------- */

const IAST_CONSONANT: Record<number, string> = {
  0x0915: "k", 0x0916: "kh", 0x0917: "g", 0x0918: "gh", 0x0919: "ṅ",
  0x091a: "c", 0x091b: "ch", 0x091c: "j", 0x091d: "jh", 0x091e: "ñ",
  0x091f: "ṭ", 0x0920: "ṭh", 0x0921: "ḍ", 0x0922: "ḍh", 0x0923: "ṇ",
  0x0924: "t", 0x0925: "th", 0x0926: "d", 0x0927: "dh", 0x0928: "n",
  0x092a: "p", 0x092b: "ph", 0x092c: "b", 0x092d: "bh", 0x092e: "m",
  0x092f: "y", 0x0930: "r", 0x0932: "l", 0x0933: "ḷ", 0x0935: "v",
  0x0936: "ś", 0x0937: "ṣ", 0x0938: "s", 0x0939: "h",
  0x0958: "q", 0x0959: "x", 0x095a: "ġ", 0x095b: "z", 0x095c: "ṛ", 0x095d: "ṛh", 0x095e: "f", 0x095f: "y",
};
/** Consonant + nukta (U+093C) as one letter. */
const IAST_NUKTA: Record<number, string> = {
  0x0915: "q", 0x0916: "x", 0x0917: "ġ", 0x091c: "z", 0x0921: "ṛ", 0x0922: "ṛh", 0x092b: "f",
};
const IAST_VOWEL: Record<number, string> = {
  0x0904: "a", 0x0905: "a", 0x0906: "ā", 0x0907: "i", 0x0908: "ī", 0x0909: "u", 0x090a: "ū",
  0x090b: "ṛ", 0x0960: "ṝ", 0x090c: "ḷ", 0x0961: "ḹ",
  0x090d: "e", 0x090e: "e", 0x090f: "e", 0x0910: "ai", 0x0911: "o", 0x0912: "o", 0x0913: "o", 0x0914: "au",
};
const IAST_MATRA: Record<number, string> = {
  0x093e: "ā", 0x093f: "i", 0x0940: "ī", 0x0941: "u", 0x0942: "ū", 0x0943: "ṛ", 0x0944: "ṝ",
  0x0945: "e", 0x0946: "e", 0x0947: "e", 0x0948: "ai", 0x0949: "o", 0x094a: "o", 0x094b: "o", 0x094c: "au",
  0x0962: "ḷ", 0x0963: "ḹ",
};

function toIast(text: string): string {
  const cps = Array.from(text, (c) => c.codePointAt(0)!);
  let out = "";
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    if (isConsonant(cp)) {
      let letter = IAST_CONSONANT[cp] ?? "";
      let j = i + 1;
      if (cps[j] === NUKTA) {
        letter = IAST_NUKTA[cp] ?? letter;
        j++;
      }
      const next = cps[j];
      if (next === VIRAMA) {
        out += letter;
        i = j;
      } else if (next !== undefined && isMatra(next)) {
        out += letter + (IAST_MATRA[next] ?? "");
        i = j;
      } else {
        out += letter + "a";
        i = j - 1;
      }
      continue;
    }
    if (IAST_VOWEL[cp] !== undefined) out += IAST_VOWEL[cp];
    else if (cp === 0x0902) out += "ṃ";
    else if (cp === 0x0903) out += "ḥ";
    else if (cp === 0x0901) out += "m̐";
    else if (cp === 0x093d) out += "’";
    else if (cp === 0x0950) out += "oṃ";
    else if (cp === 0x0964) out += "|";
    else if (cp === 0x0965) out += "||";
    else if (cp >= 0x0966 && cp <= 0x096f) out += String(cp - 0x0966);
    else if ((cp >= 0x0951 && cp <= 0x0954) || cp === 0x200c || cp === 0x200d) continue; // Vedic accents, joiners
    else out += String.fromCodePoint(cp);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Bengali, Gujarati, Telugu, Kannada: the scripts share the Devanagari layout */
/* -------------------------------------------------------------------------- */

const BLOCK_BASE: Record<"bn" | "gu" | "te" | "kn", number> = { bn: 0x0980, gu: 0x0a80, te: 0x0c00, kn: 0x0c80 };
const DIGIT_BASE: Record<"bn" | "gu" | "te" | "kn", number> = { bn: 0x09e6, gu: 0x0ae6, te: 0x0c66, kn: 0x0ce6 };

/** Letters the target script has no slot for, written with the nearest one. */
const BLOCK_OVERRIDES: Record<"bn" | "gu" | "te" | "kn", Record<number, string>> = {
  bn: { 0x0935: "ব", 0x0933: "ল", 0x0950: "ওঁ", 0x090d: "এ", 0x0911: "অ", 0x0904: "অ" },
  gu: { 0x0950: "ૐ" },
  te: { 0x0950: "ఓం", [NUKTA]: "" },
  kn: { 0x0950: "ಓಂ" },
};

function toBlockScript(text: string, target: "bn" | "gu" | "te" | "kn"): string {
  const base = BLOCK_BASE[target];
  const overrides = BLOCK_OVERRIDES[target];
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (overrides[cp] !== undefined) out += overrides[cp];
    else if (cp >= 0x0966 && cp <= 0x096f) out += String.fromCodePoint(DIGIT_BASE[target] + (cp - 0x0966));
    else if ((cp >= 0x0901 && cp <= 0x0963) || cp === 0x0950) out += String.fromCodePoint(cp - 0x0900 + base);
    else if ((cp >= 0x0951 && cp <= 0x0954) || cp === 0x200c || cp === 0x200d) continue;
    else out += ch; // spaces, newlines, danda (shared punctuation), anything else
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Tamil: has no aspirated or voiced letters, so the usual superscript numerals */
/* (kha = க², ga = க³, gha = க⁴) and the Grantha letters for ja, sha, ṣa, sa, ha */
/* -------------------------------------------------------------------------- */

const TAMIL_CONSONANT: Record<number, string> = {
  0x0915: "க", 0x0916: "க²", 0x0917: "க³", 0x0918: "க⁴", 0x0919: "ங",
  0x091a: "ச", 0x091b: "ச²", 0x091c: "ஜ", 0x091d: "ஜ²", 0x091e: "ஞ",
  0x091f: "ட", 0x0920: "ட²", 0x0921: "ட³", 0x0922: "ட⁴", 0x0923: "ண",
  0x0924: "த", 0x0925: "த²", 0x0926: "த³", 0x0927: "த⁴", 0x0928: "ந",
  0x092a: "ப", 0x092b: "ப²", 0x092c: "ப³", 0x092d: "ப⁴", 0x092e: "ம",
  0x092f: "ய", 0x0930: "ர", 0x0932: "ல", 0x0933: "ள", 0x0935: "வ",
  0x0936: "ஶ", 0x0937: "ஷ", 0x0938: "ஸ", 0x0939: "ஹ",
  0x0958: "க", 0x0959: "க²", 0x095a: "க³", 0x095b: "ஜ", 0x095c: "ட", 0x095d: "ட⁴", 0x095e: "ப²", 0x095f: "ய",
};
const SUPERSCRIPT = /[²³⁴]$/;
const TAMIL_VOWEL: Record<number, string> = {
  0x0904: "அ", 0x0905: "அ", 0x0906: "ஆ", 0x0907: "இ", 0x0908: "ஈ", 0x0909: "உ", 0x090a: "ஊ",
  0x090b: "ரு", 0x0960: "ரூ", 0x090c: "லு", 0x0961: "லூ",
  0x090d: "எ", 0x090e: "எ", 0x090f: "ஏ", 0x0910: "ஐ", 0x0911: "ஒ", 0x0912: "ஒ", 0x0913: "ஓ", 0x0914: "ஔ",
};
const TAMIL_MATRA: Record<number, string> = {
  0x093e: "ா", 0x093f: "ி", 0x0940: "ீ", 0x0941: "ு", 0x0942: "ூ",
  0x0945: "ெ", 0x0946: "ெ", 0x0947: "ே", 0x0948: "ை", 0x0949: "ொ", 0x094a: "ொ", 0x094b: "ோ", 0x094c: "ௌ",
};
/** Vocalic r/l signs have no Tamil sign: they are written as the consonant r or l plus u. */
const TAMIL_VOCALIC: Record<number, string> = { 0x0943: "ரு", 0x0944: "ரூ", 0x0962: "லு", 0x0963: "லூ" };
const PULLI = "்";

function splitSuper(letter: string): { base: string; sup: string } {
  const m = SUPERSCRIPT.exec(letter);
  return m ? { base: letter.slice(0, -1), sup: m[0] } : { base: letter, sup: "" };
}

function toTamil(text: string): string {
  const cps = Array.from(text, (c) => c.codePointAt(0)!);
  let out = "";
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!;
    if (isConsonant(cp)) {
      const { base, sup } = splitSuper(TAMIL_CONSONANT[cp] ?? "");
      let j = i + 1;
      if (cps[j] === NUKTA) j++;
      const next = cps[j];
      if (next === VIRAMA) {
        out += base + PULLI + sup;
        i = j;
      } else if (next !== undefined && TAMIL_VOCALIC[next] !== undefined) {
        out += base + PULLI + sup + TAMIL_VOCALIC[next];
        i = j;
      } else if (next !== undefined && isMatra(next)) {
        out += base + (TAMIL_MATRA[next] ?? "") + sup;
        i = j;
      } else {
        out += base + sup;
        i = j - 1;
      }
      continue;
    }
    if (TAMIL_VOWEL[cp] !== undefined) out += TAMIL_VOWEL[cp];
    else if (cp === 0x0902 || cp === 0x0901) out += "ம்";
    else if (cp === 0x0903) out += "ஃ";
    else if (cp === 0x093d) out += "’";
    else if (cp === 0x0950) out += "ஓம்";
    else if (cp >= 0x0966 && cp <= 0x096f) out += String.fromCodePoint(0x0be6 + (cp - 0x0966));
    else if ((cp >= 0x0951 && cp <= 0x0954) || cp === 0x200c || cp === 0x200d) continue;
    else out += String.fromCodePoint(cp);
  }
  return out;
}

/* -------------------------------------------------------------------------- */

/** Devanagari text in the target script. Text that has no Devanagari in it comes back unchanged. */
export function transliterate(text: string, target: TranslitTarget): string {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  switch (target) {
    case "iast":
      return toIast(text);
    case "ta":
      return toTamil(text);
    default:
      return toBlockScript(text, target);
  }
}
