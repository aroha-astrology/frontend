import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "@/i18n/config";
import DoshaCard from "./DoshaCard";

// Audit Sprint 4 (M2/M3, G6) sends `cycle` and `strength` on Sade Sati and Dhaiya.
// The Kundli card has to show them.

const sign = (s: string, saturnBindus: number, sarvaBindus: number, now: boolean, dignity = "neutral") => ({
  sign: s,
  saturnBindus,
  sarvaBindus,
  dignity,
  now,
});

const sadeSati = (over: Record<string, unknown> = {}) => ({
  active: true,
  phase: "peak",
  severity: "moderate",
  description: "Saturn is crossing your Moon sign.",
  cycle: 2,
  strength: {
    lagnaRole: null,
    signs: [sign("Capricorn", 3, 25, false), sign("Aquarius", 5, 31, true), sign("Pisces", 4, 27, false)],
  },
  ...over,
});

describe("DoshaCard: Sade Sati cycle number", () => {
  it.each([
    [1, "Your 1st Sade Sati"],
    [2, "Your 2nd Sade Sati"],
    [3, "Your 3rd Sade Sati"],
    [4, "Your Sade Sati number 4"],
  ])("cycle %i reads %s", (cycle, text) => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati({ cycle }) }} />);
    expect(html).toContain(text);
  });

  it("says nothing about a cycle when the backend sent none", () => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati({ cycle: null }) }} />);
    expect(html).not.toMatch(/Your \d(st|nd|rd) Sade Sati|Sade Sati number/);
  });
});

describe("DoshaCard: Saturn strength", () => {
  it("shows Saturn's support in the sign it is in now, not the other two", () => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati() }} />);
    expect(html).toContain("Saturn in Aquarius: 5 of 8 own points, sign total 31");
    expect(html).not.toContain("Saturn in Capricorn");
    expect(html).not.toContain("Saturn in Pisces");
  });

  it("calls it good support only when both numbers agree", () => {
    const good = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati() }} />);
    expect(good).toContain("Good support from your chart");
    const weak = renderToStaticMarkup(
      <DoshaCard
        doshas={{
          sadeSati: sadeSati({ strength: { lagnaRole: null, signs: [sign("Aquarius", 3, 24, true)] } }),
        }}
      />,
    );
    expect(weak).toContain("Less support from your chart");
    const mixed = renderToStaticMarkup(
      <DoshaCard
        doshas={{
          sadeSati: sadeSati({ strength: { lagnaRole: null, signs: [sign("Aquarius", 6, 26, true)] } }),
        }}
      />,
    );
    expect(mixed).toContain("Mixed support from your chart");
  });

  it("names Saturn's role for the rising sign and a strong or weak dignity", () => {
    const html = renderToStaticMarkup(
      <DoshaCard
        doshas={{
          sadeSati: sadeSati({
            strength: { lagnaRole: "lagna-lord", signs: [sign("Aries", 4, 30, true, "debilitated")] },
          }),
        }}
      />,
    );
    expect(html).toContain("Saturn rules your rising sign");
    expect(html).toContain("Saturn is weak in this sign");
    const yk = renderToStaticMarkup(
      <DoshaCard
        doshas={{ sadeSati: sadeSati({ strength: { lagnaRole: "yogakaraka", signs: [sign("Libra", 5, 30, true, "exalted")] } }) }}
      />,
    );
    expect(yk).toContain("Saturn is a yogakaraka for your rising sign");
    expect(yk).toContain("Saturn is strong in this sign");
  });

  it("shows it for Shani Dhaiya too", () => {
    const html = renderToStaticMarkup(
      <DoshaCard
        doshas={{
          dhaiya: {
            active: true,
            phase: "8th",
            name: "Ashtama Shani",
            severity: "moderate",
            description: "Saturn is in the 8th from your Moon.",
            strength: { lagnaRole: null, signs: [sign("Scorpio", 2, 22, true)] },
          },
        }}
      />,
    );
    expect(html).toContain("Saturn in Scorpio: 2 of 8 own points, sign total 22");
    expect(html).toContain("Less support from your chart");
  });

  it("shows no strength line when none is sent, or none of the signs is the current one", () => {
    const none = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati({ strength: undefined }) }} />);
    expect(none).not.toContain("own points");
    const noNow = renderToStaticMarkup(
      <DoshaCard
        doshas={{ sadeSati: sadeSati({ strength: { lagnaRole: null, signs: [sign("Pisces", 4, 27, false)] } }) }}
      />,
    );
    expect(noNow).not.toContain("own points");
  });

  it("is shown in plain mode as well as technical", () => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati: sadeSati() }} mode="plain" />);
    expect(html).toContain("Your 2nd Sade Sati");
    expect(html).toContain("Good support from your chart");
  });
});
