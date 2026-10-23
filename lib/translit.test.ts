import { describe, expect, it } from "vitest";
import { targetForLanguage, transliterate } from "./translit";

const DHARMA = "धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।";

describe("targetForLanguage", () => {
  it("gives each Indic language its own script, and Latin readers IAST", () => {
    expect(targetForLanguage("bn")).toBe("bn");
    expect(targetForLanguage("gu")).toBe("gu");
    expect(targetForLanguage("te")).toBe("te");
    expect(targetForLanguage("ta")).toBe("ta");
    expect(targetForLanguage("kn")).toBe("kn");
    for (const lang of ["en", "es", "fr", "de", "pt", "it", "ru", "ja", "en-IN"]) {
      expect(targetForLanguage(lang)).toBe("iast");
    }
  });

  it("adds nothing for Hindi and Marathi, who already read Devanagari", () => {
    expect(targetForLanguage("hi")).toBeNull();
    expect(targetForLanguage("mr")).toBeNull();
    expect(targetForLanguage("hi-IN")).toBeNull();
  });
});

describe("IAST", () => {
  it.each([
    ["धृतराष्ट्र उवाच", "dhṛtarāṣṭra uvāca"],
    [DHARMA, "dharmakṣetre kurukṣetre samavetā yuyutsavaḥ|"],
    ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।", "karmaṇyevādhikāraste mā phaleṣu kadācana|"],
    ["मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥", "māmakāḥ pāṇḍavāścaiva kimakurvata sañjaya||"],
    ["स्थितप्रज्ञस्य का भाषा", "sthitaprajñasya kā bhāṣā"],
    ["ॐ", "oṃ"],
    ["अहं ब्रह्मास्मि", "ahaṃ brahmāsmi"],
    ["ऽहम्", "’ham"],
    ["ऋषिः", "ṛṣiḥ"],
    ["ऐश्वर्यम् औषधम्", "aiśvaryam auṣadham"],
    ["ज़रा फ़ौज", "zarā fauja"],
  ])("%s -> %s", (devanagari, iast) => {
    expect(transliterate(devanagari, "iast")).toBe(iast);
  });

  it("keeps line breaks and ordinary punctuation", () => {
    expect(transliterate("अर्जुन उवाच\n\nकिम्॥", "iast")).toBe("arjuna uvāca\n\nkim||");
  });

  it("turns Devanagari digits into ordinary ones", () => {
    expect(transliterate("॥ १८.७८ ॥", "iast")).toBe("|| 18.78 ||");
  });
});

describe("Bengali, Gujarati, Telugu, Kannada", () => {
  it.each([
    ["bn", "ধর্মক্ষেত্রে কুরুক্ষেত্রে সমবেতা যুযুত্সবঃ।"],
    ["gu", "ધર્મક્ષેત્રે કુરુક્ષેત્રે સમવેતા યુયુત્સવઃ।"],
    ["te", "ధర్మక్షేత్రే కురుక్షేత్రే సమవేతా యుయుత్సవః।"],
    ["kn", "ಧರ್ಮಕ್ಷೇತ್ರೇ ಕುರುಕ್ಷೇತ್ರೇ ಸಮವೇತಾ ಯುಯುತ್ಸವಃ।"],
  ] as const)("%s: the opening line of the Gita", (target, expected) => {
    expect(transliterate(DHARMA, target)).toBe(expected);
  });

  it("Bengali has no separate va, so va is written with ba", () => {
    expect(transliterate("वव", "bn")).toBe("বব");
  });

  it("Telugu drops the nukta it has no sign for", () => {
    expect(transliterate("ज़", "te")).toBe("జ");
  });

  it("writes Om in each script's own way", () => {
    expect(transliterate("ॐ", "gu")).toBe("ૐ");
    expect(transliterate("ॐ", "te")).toBe("ఓం");
    expect(transliterate("ॐ", "kn")).toBe("ಓಂ");
    expect(transliterate("ॐ", "bn")).toBe("ওঁ");
  });

  it("uses the script's own digits", () => {
    expect(transliterate("१८", "bn")).toBe("১৮");
    expect(transliterate("१८", "kn")).toBe("೧೮");
  });
});

describe("Tamil", () => {
  it.each([
    ["धर्मक्षेत्रे", "த⁴ர்மக்ஷேத்ரே"],
    ["सञ्जय", "ஸஞ்ஜய"],
    ["कृष्ण", "க்ருஷ்ண"],
    ["भगवान्", "ப⁴க³வாந்"],
    ["गीता", "கீ³தா"],
    ["बुद्धि", "பு³த்³தி⁴"],
    ["धृतराष्ट्र उवाच", "த்⁴ருதராஷ்ட்ர உவாச"],
    ["ॐ", "ஓம்"],
    ["अहं", "அஹம்"],
    ["नमः", "நமஃ"],
  ])("%s -> %s", (devanagari, tamil) => {
    expect(transliterate(devanagari, "ta")).toBe(tamil);
  });
});

describe("every letter in the Gita is covered", () => {
  // the 67 characters the 701 verses actually use, plus the rest of the Devanagari letters
  const LETTERS =
    "ँंःअआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहऽ।॥ऌॠऍऑऎऒळ" +
    " काकिकीकुकूकृकॄकेकैकोकौक् कॅकॉकॆकॊ";

  it.each(["bn", "gu", "te", "ta", "kn"] as const)("%s: no Devanagari letter is left behind", (target) => {
    const out = transliterate(LETTERS, target);
    // the danda stays: it is punctuation shared by every Indic script
    expect(out.replace(/[।॥]/g, "")).not.toMatch(/[ऀ-ॿ]/);
  });

  it("iast: the output is Latin letters and punctuation only", () => {
    const out = transliterate(LETTERS, "iast");
    expect(out).not.toMatch(/[ऀ-ॿ]/);
  });

  it("leaves Latin text alone", () => {
    expect(transliterate("Chapter 2", "ta")).toBe("Chapter 2");
    expect(transliterate("", "iast")).toBe("");
  });

  it("is deterministic", () => {
    expect(transliterate(DHARMA, "ta")).toBe(transliterate(DHARMA, "ta"));
  });
});
