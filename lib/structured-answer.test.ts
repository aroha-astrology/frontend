import { describe, expect, it } from "vitest";
import {
  isStructuredAnswer,
  parseStructuredAnswer,
  structuredToPlainText,
  structuredToSpeech,
} from "./structured-answer";
import { speechLangFor } from "./speech-lang";

const FULL = [
  "FACTOR: Current Dasha | Mercury period favours planning.",
  "FACTOR: Career house | 10th-house activity is high.",
  "FACTOR: Saturn | Saturn tests patience.",
  "MEANING: Stay put for now and prepare.",
  "TIMELINE: October to January.",
  "Ask next: Best months? | Job or business?",
].join("\n");

describe("parseStructuredAnswer", () => {
  it("reads factors, meaning and timeline, ignoring the Ask next line", () => {
    expect(parseStructuredAnswer(FULL)).toEqual({
      factors: [
        { title: "Current Dasha", detail: "Mercury period favours planning." },
        { title: "Career house", detail: "10th-house activity is high." },
        { title: "Saturn", detail: "Saturn tests patience." },
      ],
      meaning: "Stay put for now and prepare.",
      timeline: "October to January.",
    });
  });

  it("works on a half-received stream", () => {
    const partial = parseStructuredAnswer("FACTOR: Current Dasha | Mercury per");
    expect(partial.factors).toEqual([{ title: "Current Dasha", detail: "Mercury per" }]);
    expect(partial.meaning).toBe("");
  });

  it("joins a meaning that wrapped onto a second line, with native-script content", () => {
    const a = parseStructuredAnswer("MEANING: अभी रुकें\nऔर तैयारी करें।\nTIMELINE: अक्टूबर");
    expect(a.meaning).toBe("अभी रुकें और तैयारी करें।");
    expect(a.timeline).toBe("अक्टूबर");
  });

  it("only treats the card format as structured", () => {
    expect(isStructuredAnswer(FULL)).toBe(true);
    expect(isStructuredAnswer("Your career looks steady: patience pays off.")).toBe(false);
  });
});

describe("structuredToSpeech", () => {
  it("reads the answer first, without markers or pipes", () => {
    const speech = structuredToSpeech(FULL);
    expect(speech.startsWith("Stay put for now and prepare.")).toBe(true);
    expect(speech).not.toMatch(/FACTOR|MEANING|TIMELINE|\|/);
  });

  it("gives copy/share a bulleted plain-text version", () => {
    expect(structuredToPlainText(FULL)).toBe(
      [
        "Stay put for now and prepare.",
        "",
        "• Current Dasha: Mercury period favours planning.",
        "• Career house: 10th-house activity is high.",
        "• Saturn: Saturn tests patience.",
        "",
        "October to January.",
      ].join("\n"),
    );
  });
});

describe("speechLangFor", () => {
  it("picks the voice from the script, not the app language", () => {
    expect(speechLangFor("আপনার চাকরি ভালো যাবে", "en")).toBe("bn");
    expect(speechLangFor("आपकी शादी जल्द होगी", "en")).toBe("hi");
    expect(speechLangFor("तुमचे लग्न लवकर होईल", "mr")).toBe("mr");
    expect(speechLangFor("உங்கள் வேலை", "en")).toBe("ta");
    expect(speechLangFor("Your Saturn period matters", "hi")).toBe("en");
    expect(speechLangFor("12345", "gu")).toBe("gu");
  });
});
