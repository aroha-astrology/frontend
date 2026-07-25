import { describe, it, expect } from "vitest";
import {
  HeartHandshake,
  Infinity,
  Users,
  Heart,
  Coins,
  Baby,
  Activity,
  Briefcase,
  Wallet,
  HeartPulse,
} from "lucide-react";
import { REPORT_THEME, getReportTheme } from "./report-theme";

const EXPECTED_ICONS: Record<string, unknown> = {
  marriage: HeartHandshake,
  past_life: Infinity,
  kundli_milan: Users,
  true_love: Heart,
  wealth: Coins,
  baby_name: Baby,
  health_monthly: Activity,
  career_monthly: Briefcase,
  finance_monthly: Wallet,
  relationship_monthly: HeartPulse,
};

describe("REPORT_THEME", () => {
  it("has exactly the 10 catalogue report keys, no more, no fewer", () => {
    expect(Object.keys(REPORT_THEME).sort()).toEqual(Object.keys(EXPECTED_ICONS).sort());
  });

  it("maps every key to its intended lucide icon", () => {
    for (const [key, icon] of Object.entries(EXPECTED_ICONS)) {
      expect(REPORT_THEME[key]?.icon).toBe(icon);
    }
  });

  it("gives every theme a non-empty semantic hue key (not a raw Tailwind class string)", () => {
    for (const theme of Object.values(REPORT_THEME)) {
      expect(typeof theme.hue).toBe("string");
      expect(theme.hue.length).toBeGreaterThan(0);
      // The literal gradient class table lives in components/reports/ReportThemeCard.tsx
      // (a Tailwind `content` glob) precisely so this data file never needs to
      // carry a literal "from-..." string that Tailwind's JIT would fail to
      // scan from lib/. See the doc comment on ReportTheme.
      expect(theme.hue).not.toContain("from-");
      expect(theme.hue).not.toContain("/");
    }
  });

  it("assigns a distinct hue to every report (no two cards look identical in the scroll row)", () => {
    const hues = Object.values(REPORT_THEME).map((t) => t.hue);
    expect(new Set(hues).size).toBe(hues.length);
  });
});

describe("getReportTheme", () => {
  it("returns the matching theme for a known key", () => {
    expect(getReportTheme("marriage").icon).toBe(HeartHandshake);
    expect(getReportTheme("wealth").icon).toBe(Coins);
  });

  it("falls back to a defined default theme for an unknown key, rather than throwing or returning undefined", () => {
    const theme = getReportTheme("some_future_report_key");
    expect(theme).toBeDefined();
    expect(theme.icon).toBeDefined();
    expect(typeof theme.hue).toBe("string");
    expect(theme.hue.length).toBeGreaterThan(0);
  });

  it("fallback theme is not accidentally identical to any real report's theme object, and uses a hue none of the 10 reports use", () => {
    const fallback = getReportTheme("some_future_report_key");
    expect(Object.values(REPORT_THEME)).not.toContain(fallback);
    const realHues = new Set(Object.values(REPORT_THEME).map((t) => t.hue));
    expect(realHues.has(fallback.hue)).toBe(false);
  });
});
