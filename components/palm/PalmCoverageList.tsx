"use client";

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

/**
 * What the palm reading will actually answer, shown BEFORE it is generated — on the locked
 * teaser (so the price is attached to a known list rather than a promise) and while generation
 * is running (so the wait has content).
 *
 * These ids mirror `REQUIRED_CHAPTERS` in the backend's lib/llm/palm/interpret.ts, which is the
 * list the reading is actually contractually required to cover. Kept as translated strings here
 * rather than piped through the API because the chapters are written in English on the server
 * and this has to render in all seven languages before any generation has happened.
 *
 * If a chapter is added or removed there, update this list and the seven `palm.coverage.items.*`
 * blocks — a list that over-promises is worse than no list.
 */
const COVERAGE_ITEMS = [
  "handShape",
  "majorLines",
  "secondaryLines",
  "mounts",
  "fingers",
  "minorMarks",
  "love",
  "career",
  "health",
  "spiritual",
  "timeline",
  "chartAgreement",
  "guidance",
] as const;

export default function PalmCoverageList({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-gold/20 bg-card p-5 space-y-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
      <ul className="space-y-2">
        {COVERAGE_ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="text-gold shrink-0 mt-0.5" size={14} />
            <span className="text-sm text-foreground/85 leading-relaxed">
              {t(`palm.coverage.items.${item}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
