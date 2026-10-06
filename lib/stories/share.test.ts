import { describe, expect, it } from "vitest";
import { parseInstallReferrer } from "@/lib/referral";
import { storyShareUrl, textShareLink } from "./share";

describe("storyShareUrl", () => {
  it("is the Play Store listing with the story as the campaign", () => {
    const url = new URL(storyShareUrl("hora"));
    expect(url.origin + url.pathname).toBe("https://play.google.com/store/apps/details");
    expect(url.searchParams.get("id")).toBe("com.aroha.astrology");
    expect(url.searchParams.get("referrer")).toBe("utm_source=story_share&utm_campaign=hora");
  });

  it("carries the sharer's referral code in a form the app's install-referrer reader understands", () => {
    const referrer = new URL(storyShareUrl("gita", "AB12CD")).searchParams.get("referrer")!;
    expect(parseInstallReferrer(referrer)).toEqual({ code: "AB12CD", utmSource: "story_share/gita" });
  });

  it("leaves the code out when the user has none", () => {
    for (const code of [null, undefined, ""]) {
      expect(new URL(storyShareUrl("deity", code)).searchParams.get("referrer")).toBe(
        "utm_source=story_share&utm_campaign=deity",
      );
    }
  });
});

describe("textShareLink", () => {
  const caption = "Moon Hora, 9:28 AM to 10:28 AM.\n\nhttps://play.google.com/store/apps/details?id=x&referrer=a%3Db";

  it("opens WhatsApp, SMS and X with the caption filled in", () => {
    const encoded = encodeURIComponent(caption);
    expect(textShareLink("whatsapp", caption)).toBe(`https://wa.me/?text=${encoded}`);
    expect(textShareLink("whatsappStatus", caption)).toBe(`https://wa.me/?text=${encoded}`);
    expect(textShareLink("sms", caption)).toBe(`sms:?body=${encoded}`);
    expect(textShareLink("x", caption)).toBe(`https://twitter.com/intent/tweet?text=${encoded}`);
  });

  it("keeps the caption whole through the link, line breaks and inner link included", () => {
    expect(new URL(textShareLink("whatsapp", caption)!).searchParams.get("text")).toBe(caption);
  });

  it("has no text link for the picture-only places", () => {
    for (const target of ["instagram", "instagramStory", "copy", "system"] as const) {
      expect(textShareLink(target, caption)).toBeNull();
    }
  });
});
