"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getReportTheme, type ReportHue } from "@/lib/report-theme";
import { deriveOneTimeCardState, purchasedMonthChips } from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";

/**
 * Literal Tailwind gradient class per hue — deliberately kept here (under
 * components/, a Tailwind `content` glob) rather than alongside REPORT_THEME
 * in lib/report-theme.ts, which is NOT scanned by Tailwind's JIT compiler.
 * See lib/report-theme.ts's doc comment for the full reasoning (same trap
 * lib/nav-items.ts documents for its icon list vs. BottomNavigation.tsx's
 * GRID_COLS). Every wash is a `/25 -> /10` translucent fade over the app's
 * existing dark `card`/`surface` background, not a solid saturated block —
 * matching the understated, gold-accented aesthetic used elsewhere (see
 * components/ui/GemstoneCard.tsx / HouseGrid.tsx for the same
 * translucent-wash + gold-bordered-badge idiom).
 */
const HUE_GRADIENT: Record<ReportHue, string> = {
  rose: "from-rose-500/25 to-rose-950/10",
  violet: "from-violet-500/25 to-violet-950/10",
  cyan: "from-cyan-500/25 to-cyan-950/10",
  red: "from-red-500/25 to-red-950/10",
  amber: "from-amber-500/25 to-amber-950/10",
  sky: "from-sky-500/25 to-sky-950/10",
  emerald: "from-emerald-500/25 to-emerald-950/10",
  blue: "from-blue-500/25 to-blue-950/10",
  teal: "from-teal-500/25 to-teal-950/10",
  fuchsia: "from-fuchsia-500/25 to-fuchsia-950/10",
  gold: "from-gold/20 to-gold/5",
};

interface ReportThemeCardProps {
  entry: ReportCatalogueEntry;
  /** Stagger-in delay index, mirroring HoroscopeSlider's entrance animation — purely cosmetic. */
  index?: number;
  /** Opens the purchase drawer for this report — used for the initial Buy AND the Retry CTA, same contract as ReportCard. */
  onBuy: () => void;
  /** Monthly reports only — opens the drawer in month-picker mode. */
  onAddMonths?: () => void;
}

/**
 * The Home-slider presentation of a report catalogue entry. Reuses the exact
 * same 4-state purchase logic as components/reports/ReportCard.tsx
 * (deriveOneTimeCardState / purchasedMonthChips, no reimplementation) — only
 * the chrome differs: an icon badge on a gradient wash instead of a plain
 * text row, sized to match HoroscopeSlider's fixed 160px cards.
 *
 * Monthly reports get a simplified treatment vs. ReportCard's full
 * purchased-months chip list, which doesn't fit a 160px-wide card: if any
 * month is ready, the WHOLE card becomes tappable to open the most recent
 * ready month, alongside a plain Buy/Add Months CTA. The full chip list
 * stays on the /reports page's ReportCard, reachable via "See All".
 */
export default function ReportThemeCard({ entry, index = 0, onBuy, onAddMonths }: ReportThemeCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const label = t(`reports.labels.${entry.key}`, entry.label);
  const theme = getReportTheme(entry.key);
  const Icon = theme.icon;

  let cardOnClick: (() => void) | undefined;
  let priceNode: ReactNode;
  let ctaNode: ReactNode;

  if (entry.isMonthly) {
    const chips = purchasedMonthChips(entry.purchases);
    const readyChips = chips.filter((c) => c.status === "ready");
    // purchasedMonthChips sorts ascending by 'YYYY-MM', so the last ready
    // chip is the most recent ready month.
    const mostRecentReady = readyChips.length > 0 ? readyChips[readyChips.length - 1] : undefined;
    if (mostRecentReady) {
      cardOnClick = () => router.push(`/reports/${mostRecentReady.purchaseId}`);
    }

    priceNode = (
      <p className="text-[10px] text-muted mt-0.5">
        {t("reports.perMonth", { price: formatRupees(entry.pricePaise) })}
      </p>
    );
    ctaNode = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddMonths?.();
        }}
        className="w-full rounded-xl bg-gold text-[#1a0e00] px-2 py-2 text-[11px] font-bold"
      >
        {chips.length > 0 ? t("reports.addMonths") : t("reports.buy")}
      </button>
    );
  } else {
    const cardState = deriveOneTimeCardState(entry.purchases);
    priceNode = <p className="text-[10px] text-muted mt-0.5">{formatRupees(entry.pricePaise)}</p>;

    if (cardState.state === "ready") {
      cardOnClick = () => router.push(`/reports/${cardState.purchaseId}`);
      ctaNode = (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/reports/${cardState.purchaseId}`);
          }}
          className="w-full rounded-xl border border-gold/30 text-gold px-2 py-2 text-[11px] font-bold"
        >
          {t("reports.viewReport")}
        </button>
      );
    } else if (cardState.state === "generating") {
      cardOnClick = () => router.push(`/reports/${cardState.purchaseId}`);
      ctaNode = (
        <span className="block w-full text-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2 py-1.5 text-[10px] font-semibold">
          {t("reports.generating")}
        </span>
      );
    } else if (cardState.state === "failed") {
      ctaNode = (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          className="w-full rounded-xl border border-red-500/30 text-red-400 px-2 py-2 text-[11px] font-bold"
        >
          {t("reports.retry")}
        </button>
      );
    } else {
      ctaNode = (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          className="w-full rounded-xl bg-gold text-[#1a0e00] px-2 py-2 text-[11px] font-bold"
        >
          {t("reports.buy")}
        </button>
      );
    }
  }

  const tappable = !!cardOnClick;

  return (
    <Card
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={cardOnClick}
      className={cn(
        "min-w-[160px] max-w-[160px] p-0 flex-shrink-0 overflow-hidden border-gold/10 hover:border-gold/30 transition-transform",
        tappable && "cursor-pointer active:scale-95",
      )}
    >
      <div className={cn("h-16 w-full flex items-center justify-center bg-gradient-to-br", HUE_GRADIENT[theme.hue])}>
        <div className="w-10 h-10 rounded-full border border-gold/40 bg-background/30 backdrop-blur-sm flex items-center justify-center text-gold drop-shadow-[0_0_5px_rgba(223,181,100,0.3)]">
          <Icon size={20} />
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 min-h-[2rem]">{label}</p>
        {priceNode}
        {ctaNode}
      </div>
    </Card>
  );
}
