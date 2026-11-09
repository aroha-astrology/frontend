import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DoshaCard from "./DoshaCard";

// Shani Dhaiya on the kundli's dosha card: shown only while it is running, like Sade Sati, with
// its own name and the engine's dated description.

const running = {
  active: true,
  phase: "8th" as const,
  name: "Ashtama Shani",
  severity: "moderate",
  description:
    "Saturn is transiting Pisces, the 8th sign from your Moon in Leo: Shani's Dhaiya (Ashtama Shani). It runs from 2025-03-29 to 2028-02-23.",
};

describe("DoshaCard — Shani Dhaiya", () => {
  it("shows a running Dhaiya with its name, description and Kantaka/Ashtama label", () => {
    const html = renderToStaticMarkup(<DoshaCard doshas={{ dhaiya: running }} />);
    expect(html).toMatch(/Shani Dhaiya|kundli\.doshaNames\.dhaiya/);
    expect(html).toContain("2025-03-29 to 2028-02-23");
    expect(html).toContain("Ashtama Shani");
  });

  it("shows nothing for a Dhaiya that is not running (on a break or none)", () => {
    const html = renderToStaticMarkup(
      <DoshaCard doshas={{ dhaiya: { ...running, active: false, phase: "none" } }} />,
    );
    expect(html).toBe("");
  });
});
