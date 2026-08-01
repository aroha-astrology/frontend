"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { diffNameParts } from "@/lib/name-diff";
import Checklist from "@/components/reports/blocks/Checklist";
import { ScoreRing } from "@/components/reports/ReportScoreFacts";
import type { ReportSectionItem } from "@/lib/reports-api";

/**
 * One ranked/scored suggested name, or one before->after spelling variant — see
 * ReportSectionItem. Distinguished by `note`: variants carry the exact edit description, plain
 * suggested names don't. Reuses this app's existing Checklist (✓-prefixed bullets) and ScoreRing
 * (the same conic-gradient meter ReportScoreFacts already renders) rather than inventing new
 * primitives — see components/reports/blocks/index.ts's "presentation-only, reuse" convention.
 */
export default function NameSuggestionCard({
  item,
  rank,
  currentName,
}: {
  item: ReportSectionItem;
  /** 1-indexed position — only shown for ranked suggested-name cards, not variants. */
  rank?: number;
  /** Only needed for variant cards (`item.note` present), to compute the before/after diff. */
  currentName?: string;
}) {
  const { t } = useTranslation();
  const isVariant = Boolean(item.note);

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5",
        item.highlight ? "border-gold/50 bg-gold/5" : "border-gold/15",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {item.highlight && (
            <span className="inline-flex w-fit items-center rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
              {t("reports.nameChange.bestMatch")}
            </span>
          )}
          {isVariant && currentName ? (
            <VariantTitle current={currentName} variant={item.title} />
          ) : (
            <span className="font-display text-xl text-gold tracking-wide">{item.title}</span>
          )}
        </div>
        {typeof rank === "number" && !isVariant && (
          <span className="text-xs font-semibold text-muted">{t("reports.nameChange.rank", { n: rank })}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item.badge && (
          <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
            {item.badge}
          </span>
        )}
        {typeof item.score === "number" && !isVariant && (
          <ScoreRing value={item.score} max={100} pct={item.score} />
        )}
      </div>

      {isVariant && item.note && <p className="text-xs italic text-foreground/70">{item.note}</p>}

      <Checklist items={item.bullets} />
    </div>
  );
}

function VariantTitle({ current, variant }: { current: string; variant: string }) {
  const [before, changed, after] = diffNameParts(current, variant);
  return (
    <span className="font-display text-xl tracking-wide text-foreground">
      {before}
      <span className="rounded bg-gold/25 px-0.5 text-gold">{changed}</span>
      {after}
    </span>
  );
}
