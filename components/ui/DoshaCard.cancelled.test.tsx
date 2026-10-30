import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import "@/i18n/config";
import DoshaCard, { countPresentDoshas, hasDoshaCardContent } from "./DoshaCard";

// Audit 2026-10-28, Sprint 1.
// H2: a cancelled Mangal Dosha (severity "none") showed as a MEDIUM dosha, was counted in "doshas
// found", and its reason never appeared because the card read `cancellation` while the backend
// sends `cancellations`.
// M13: Sade Sati and Dhaiya on a retrograde break, or coming next, showed nothing at all.

const cancelledMangal = {
  present: true,
  severity: "none",
  type: "cancelled",
  cancellations: ["Mars in own sign Aries - cancellation applies"],
  description: "Mars sits in house 4 from your Lagna, which would normally form Mangal Dosha, but Mars in own sign Aries.",
};

describe("DoshaCard — cancelled Mangal Dosha", () => {
  it("shows it as cancelled, with the reason, never as a medium dosha", () => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ mangal: cancelledMangal }} />);
    expect(html).toContain(">Cancelled<");
    expect(html).toContain("Mars in own sign Aries");
    expect(html).not.toContain("cancellation applies");
    expect(html).not.toMatch(/>medium</);
    expect(html).not.toContain("orange-");
  });

  it("is not counted among the doshas present", () => {
    expect(countPresentDoshas({ mangal: cancelledMangal })).toBe(0);
    expect(
      countPresentDoshas({
        mangal: cancelledMangal,
        sadeSati: { active: true, phase: "peak", severity: "severe" },
      }),
    ).toBe(1);
  });

  it("still counts and colours a Mangal Dosha in force", () => {
    const mangal = { present: true, severity: "mild", type: "partial", cancellations: [] };
    expect(countPresentDoshas({ mangal })).toBe(1);
    expect(renderToStaticMarkup(<DoshaCard doshas={{ mangal }} />)).toMatch(/>low</);
  });

  it("does not turn a severity of none into medium for any dosha", () => {
    const html = renderToStaticMarkup(
      <DoshaCard doshas={{ pitra: { present: true, severity: "none" } }} />,
    );
    expect(html).not.toMatch(/>medium</);
  });
});

describe("DoshaCard — Saturn on a break or coming next", () => {
  it("says when a Sade Sati on a retrograde break resumes", () => {
    const sadeSati = {
      active: false,
      phase: "none",
      resumesOn: "2028-02-23T14:22:00.000Z",
      next: null,
    };
    expect(hasDoshaCardContent({ sadeSati })).toBe(true);
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati }} />);
    expect(html).toContain("Sade Sati: on a break until 23 Feb 2028");
  });

  it("gives the next Sade Sati's start date when none is running", () => {
    const sadeSati = {
      active: false,
      phase: "none",
      resumesOn: null,
      next: { startDate: "2027-06-03T00:47:00.000Z", endDate: "2034-08-08T00:00:00.000Z" },
    };
    const html = renderToStaticMarkup(<DoshaCard doshas={{ sadeSati }} />);
    expect(html).toContain("Next: Sade Sati from 3 Jun 2027");
    expect(countPresentDoshas({ sadeSati })).toBe(0);
  });

  it("gives the next Dhaiya too", () => {
    const dhaiya = {
      active: false,
      phase: "none" as const,
      resumesOn: null,
      next: { phase: "8th" as const, startDate: "2027-06-03T00:47:00.000Z", endDate: "2029-08-08T00:00:00.000Z" },
    };
    expect(hasDoshaCardContent({ dhaiya })).toBe(true);
    expect(renderToStaticMarkup(<DoshaCard doshas={{ dhaiya }} />)).toContain(
      "Next: Shani Dhaiya from 3 Jun 2027",
    );
  });

  it("has nothing to show when nothing is running, paused or dated next", () => {
    expect(hasDoshaCardContent({ sadeSati: { active: false, phase: "none" } })).toBe(false);
  });
});
