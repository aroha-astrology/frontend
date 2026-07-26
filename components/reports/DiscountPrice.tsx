"use client";

import { useTranslation } from "react-i18next";
import { formatRupees } from "@/lib/format";
import { computeDiscount } from "@/lib/reports-logic";

interface DiscountPriceProps {
  pricePaise: number;
  /** Null (or not strictly greater than `pricePaise`) means no discount is
   * configured — render `priceLabel` plainly, exactly like before this
   * feature existed. */
  originalPricePaise: number | null;
  /**
   * Already-formatted display string for the current price — plain
   * `formatRupees(pricePaise)` for a one-time report, or the interpolated
   * "{{price}} / month" string for a monthly one. Taken as a prop (rather
   * than recomputed here) so callers keep full control of the "/ month"
   * suffix and its own translation.
   */
  priceLabel: string;
  /** Matches the containing surface's type scale — ReportCard's list row
   * uses "sm" (text-[11px]), ReportThemeCard's 160px slider card uses "xs"
   * (text-[10px]). */
  size?: "sm" | "xs";
  className?: string;
}

/**
 * Renders a report's price, adding the "₹149 ~~₹499~~ 30% off" marketing
 * treatment ONLY when `originalPricePaise` is set and genuinely higher than
 * `pricePaise` — otherwise renders `priceLabel` exactly as it always has (no
 * strikethrough, no badge), so the many reports without a configured
 * discount are visually unchanged. Shared by ReportCard (catalogue list),
 * ReportThemeCard (Home slider), and ReportPurchaseDrawer (purchase header)
 * so the discount math/markup isn't duplicated per surface.
 */
export default function DiscountPrice({
  pricePaise,
  originalPricePaise,
  priceLabel,
  size = "sm",
  className,
}: DiscountPriceProps) {
  const { t } = useTranslation();
  const textSizeClass = size === "sm" ? "text-[11px]" : "text-[10px]";
  const discount = computeDiscount(pricePaise, originalPricePaise);

  if (!discount) {
    return <p className={`${textSizeClass} text-muted mt-0.5 ${className ?? ""}`}>{priceLabel}</p>;
  }

  return (
    <div className={`flex items-center flex-wrap gap-1.5 mt-0.5 ${className ?? ""}`}>
      <span className={`${textSizeClass} font-semibold text-gold`}>{priceLabel}</span>
      <span className={`${textSizeClass} text-muted line-through`}>{formatRupees(originalPricePaise)}</span>
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 text-[9px] font-semibold">
        {t("reports.discountOff", { percent: discount.percentOff })}
      </span>
    </div>
  );
}
