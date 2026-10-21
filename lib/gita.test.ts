import { describe, expect, it } from "vitest";
import { gitaChantHref, gitaImage, splitGitaVerse, type GitaVerse } from "./gita";

// Real verses from backend/data/gita-content.json.
const CH1_V1 = "धृतराष्ट्र उवाच\n\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।\n\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥";
const CH2_V47 = "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\n\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥";
const CH2_V55 = "श्री भगवानुवाच\n\nप्रजहाति यदा कामान् सर्वान् पार्थ मनोगतान्।\n\nआत्मन्येवात्मना तुष्टः स्थितप्रज्ञस्तदोच्यते॥";
const CH12_V1 = "अर्जुन उवाचएवं सततयुक्ता ये भक्तास्त्वां पर्युपासते।येचाप्यक्षरमव्यक्तं तेषां के योगवित्तमाः॥";
const CH18_V74 = "सञ्जय उवाचइत्यहं वासुदेवस्य पार्थस्य च महात्मनः।संवादमिममश्रौषमद्भुतं रोमहर्षणम्॥";

describe("splitGitaVerse", () => {
  it("takes the speaker line off, so a card shows the verse and not only 'धृतराष्ट्र उवाच'", () => {
    expect(splitGitaVerse(CH1_V1)).toEqual({
      speaker: "dhritarashtra",
      lines: ["धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः।", "मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय॥"],
    });
  });

  it("drops the blank lines between the padas", () => {
    expect(splitGitaVerse(CH2_V47)).toEqual({
      speaker: null,
      lines: ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।", "मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥"],
    });
  });

  it("knows Krishna's line", () => {
    expect(splitGitaVerse(CH2_V55).speaker).toBe("krishna");
    expect(splitGitaVerse(CH2_V55).lines[0]).toBe("प्रजहाति यदा कामान् सर्वान् पार्थ मनोगतान्।");
  });

  it("splits a speaker run straight into the verse, and breaks the line after the danda", () => {
    expect(splitGitaVerse(CH12_V1)).toEqual({
      speaker: "arjuna",
      lines: ["एवं सततयुक्ता ये भक्तास्त्वां पर्युपासते।", "येचाप्यक्षरमव्यक्तं तेषां के योगवित्तमाः॥"],
    });
    expect(splitGitaVerse(CH18_V74).speaker).toBe("sanjaya");
    expect(splitGitaVerse(CH18_V74).lines[0]).toBe("इत्यहं वासुदेवस्य पार्थस्य च महात्मनः।");
  });

  it("drops the verse number one source line carries (18.78)", () => {
    const v = "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।\n\nतत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम।।18.78।";
    expect(splitGitaVerse(v).lines).toEqual([
      "यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।",
      "तत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥",
    ]);
  });

  it("leaves 'उवाच' inside a verse alone", () => {
    const v = "भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम्।\n\nउवाच पार्थ पश्यैतान्समवेतान्कुरूनिति॥";
    expect(splitGitaVerse(v)).toEqual({
      speaker: null,
      lines: ["भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम्।", "उवाच पार्थ पश्यैतान्समवेतान्कुरूनिति॥"],
    });
  });
});

describe("gitaImage", () => {
  const verse = (extra: Partial<GitaVerse>): GitaVerse => ({
    id: "ch2-v47",
    chapter: 2,
    verse: 47,
    sanskrit: CH2_V47,
    mainCategory: "कर्मयोग",
    tags: [],
    ...extra,
  });

  it("shows the meditation art for chapter 6, Dhyana Yoga", () => {
    expect(gitaImage(verse({ chapter: 6, mainCategory: "ध्यानयोग" }))).toBe("/shlokas/img/gita-48.webp");
    expect(gitaImage(verse({ mainCategory: "ध्यानयोग" }))).toBe("/shlokas/img/gita-247.webp");
  });

  it("shows the battlefield for the story and for anyone but Krishna speaking", () => {
    expect(gitaImage(verse({ mainCategory: "कथाप्रसङ्गः" }))).toBe("/shlokas/img/gita-47.webp");
    expect(gitaImage(verse({ sanskrit: CH12_V1, mainCategory: "भक्तियोग" }))).toBe("/shlokas/img/gita-47.webp");
  });

  it("shows Krishna for his teaching", () => {
    expect(gitaImage(verse({}))).toBe("/shlokas/img/gita-247.webp");
  });
});

it("gitaChantHref opens the chant screen for the verse", () => {
  expect(gitaChantHref("ch2-v47")).toBe("/shlokas/mala?verse=ch2-v47&type=gita");
});
