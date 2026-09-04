"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getReportTheme, type ReportHue } from "@/lib/report-theme";
import { deriveOneTimeCardState, monthlyCardState, currentMonthKey, formatMonthName } from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";
import DiscountPrice from "./DiscountPrice";
import NewBadge from "@/components/ui/NewBadge";

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
export const HUE_GRADIENT: Record<ReportHue, string> = {
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
  indigo: "from-indigo-500/25 to-indigo-950/10",
  lime: "from-lime-500/25 to-lime-950/10",
  orange: "from-orange-500/25 to-orange-950/10",
  gold: "from-gold/20 to-gold/5",
};

/**
 * Card-top visual for a report catalogue entry: the real illustration at
 * /reports/<key>.png when it loads, falling back to the existing themed
 * icon-badge-on-gradient-wash treatment otherwise (unknown key added before
 * an image ships, or the image request failing). Mirrors
 * components/ui/GemstoneCard.tsx's `GemVisual` exactly: a local `imgError`
 * state flips the render from the `<img>` to the hand-drawn fallback on
 * `onError`, rather than compositing the two — same either/or relationship,
 * just swapping "hand-drawn SVG glyph" for "icon badge on gradient wash".
 */
function ReportVisual({ reportKey, hue, Icon }: { reportKey: string; hue: ReportHue; Icon: LucideIcon }) {
  const [imgError, setImgError] = useState(false);
  if (!imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/reports/${reportKey}.png`}
        alt=""
        onError={() => setImgError(true)}
        className="h-16 w-full object-cover"
      />
    );
  }
  return (
    <div className={cn("h-16 w-full flex items-center justify-center bg-gradient-to-br", HUE_GRADIENT[hue])}>
      <div className="w-10 h-10 rounded-full border border-gold/40 bg-background/30 backdrop-blur-sm flex items-center justify-center text-gold drop-shadow-[0_0_5px_rgba(223,181,100,0.3)]">
        <Icon size={20} />
      </div>
    </div>
  );
}

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
 * (deriveOneTimeCardState / monthlyCardState, no reimplementation) — only
 * the chrome differs: an icon badge on a gradient wash instead of a plain
 * text row, sized to match HoroscopeSlider's fixed 160px cards.
 *
 * Monthly reports show the CURRENT month only (see monthlyCardState): View
 * Report once this month's is ready, otherwise "Buy for <Month>", which
 * re-arms on its own when the month rolls over. Same on the /reports page's
 * ReportCard — the two surfaces read identically.
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
    const monthState = monthlyCardState(entry.purchases);
    if (monthState.state === "ready" || monthState.state === "generating") {
      cardOnClick = () => router.push(`/reports/${monthState.purchaseId}`);
    }

    priceNode = (
      <DiscountPrice
        pricePaise={entry.pricePaise}
        originalPricePaise={entry.originalPricePaise}
        priceLabel={formatRupees(entry.pricePaise)}
        size="xs"
      />
    );
    ctaNode =
      monthState.state === "ready" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/reports/${monthState.purchaseId}`);
          }}
          className="w-full rounded-xl border border-gold/30 text-gold px-2 py-2 text-[11px] font-bold"
        >
          {t("reports.viewReport")}
        </button>
      ) : monthState.state === "generating" ? (
        <span className="block w-full text-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2 py-1.5 text-[10px] font-semibold">
          {t("reports.generating")}
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddMonths?.();
          }}
          className="w-full rounded-xl bg-gold text-[#1a0e00] px-2 py-2 text-[11px] font-bold"
        >
          {monthState.state === "failed"
            ? t("reports.retry")
            : t("reports.buyForMonth", { month: formatMonthName(currentMonthKey()) })}
        </button>
      );
  } else {
    const cardState = deriveOneTimeCardState(entry.purchases);
    priceNode = (
      <DiscountPrice
        pricePaise={entry.pricePaise}
        originalPricePaise={entry.originalPricePaise}
        priceLabel={formatRupees(entry.pricePaise)}
        size="xs"
      />
    );

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
        "min-w-[160px] max-w-[160px] p-0 flex-shrink-0 overflow-hidden border-gold/10 hover:border-gold/30 transition-transform relative",
        tappable && "cursor-pointer active:scale-95",
      )}
    >
      {entry.isNew && <NewBadge className="absolute top-2 right-2 z-10" />}
      <ReportVisual reportKey={entry.key} hue={theme.hue} Icon={Icon} />
      <div className="p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 break-words min-h-[2rem]">{label}</p>
        {priceNode}
        {ctaNode}
      </div>
    </Card>
  );
}
