"use client";

import { useTranslation } from "react-i18next";
import {
  Activity,
  CalendarHeart,
  FileText,
  Flame,
  Globe,
  Home,
  Layers,
  Scale,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Accordion from "@/components/ui/Accordion";
import Checklist from "./blocks/Checklist";
import type { ReportReady } from "@/hooks/useReport";

type ReportSection = ReportReady["sections"][number];

/** Resolves a report's SECTION_ICON lucide icon NAMES to components — the union across
 * every bespoke report screen that uses this accordion. The name->component table lives
 * here rather than in lib/ so those view-model files stay React-free (see their doc
 * comments); an unknown name simply falls back to FileText. */
const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  CalendarHeart,
  UserRound,
  Home,
  Wallet,
  Scale,
  TrendingUp,
  Globe,
  Activity,
  Flame,
  Layers,
};

/** The first section is the summary the reader wants immediately; everything else opens
 * on tap. Anything without a canonical id (a legacy report, or a section-count mismatch —
 * see assignSectionIds on the backend) also opens by default, so content can never end up
 * hidden behind a chevron just because its id was missing. */
function isDefaultOpen(section: ReportSection, index: number): boolean {
  if (!section.id) return true;
  return section.id === "at_a_glance" || index === 0;
}

export interface AnalysisAccordionProps {
  sections: ReportSection[];
  /** Canonical section id -> lucide icon NAME, from the owning report's view-model
   * (e.g. lib/marriage-report-view.ts's SECTION_ICON). */
  sectionIcon: Record<string, string>;
  /** i18n key for the list's heading — each report names its own analysis section. */
  titleKey: string;
}

/**
 * A report's narrative sections as expandable rows, matching the mock's "Detailed
 * Analysis" list. Section ids are canonical and assigned by position on the backend
 * (config/report-sections.ts), so both the icon and the translated heading key off
 * `section.id`, falling back to the section's own stored heading for a report generated
 * before ids shipped.
 *
 * Shared by every bespoke report screen — the per-report parts (which icon per section,
 * what the list is called) are props, so a second report reuses this rather than forking
 * a near-identical copy.
 */
export default function AnalysisAccordion({
  sections,
  sectionIcon,
  titleKey,
}: AnalysisAccordionProps) {
  const { t } = useTranslation();
  if (sections.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-base text-gold mb-2">{t(titleKey)}</h2>
      <div className="flex flex-col gap-2">
        {sections.map((section, i) => {
          const heading = section.id
            ? t(`reports.sectionHeading.${section.id}`, { defaultValue: section.heading })
            : section.heading;
          const Icon = (section.id && ICONS[sectionIcon[section.id] ?? ""]) || FileText;

          return (
            <Accordion
              key={section.id ?? i}
              defaultOpen={isDefaultOpen(section, i)}
              header={
                <span className="flex items-center gap-2.5">
                  <Icon size={17} className="shrink-0 text-gold" aria-hidden />
                  <span className="text-[13px] font-semibold text-foreground">{heading}</span>
                </span>
              }
            >
              <div className="space-y-2.5">
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm text-foreground/85 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <Checklist items={section.bullets} className="mt-2.5" />
              )}
            </Accordion>
          );
        })}
      </div>
    </section>
  );
}
