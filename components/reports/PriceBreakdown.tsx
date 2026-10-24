"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Crown } from "lucide-react";
import { usePassStatus } from "@/hooks/usePassStatus";
import { formatRupees } from "@/lib/format";
import { computeDiscount } from "@/lib/reports-logic";
import type { ReportCatalogueEntry } from "@/lib/reports-api";

/**
 * The buy screen's price, one step per line: the marked price, today's offer,
 * the member's Aroha Pass discount (taken off the offer price, on top of it)
 * and the amount that will be charged. Someone without a Pass sees the same
 * steps minus the Pass line, and a line saying what members pay less. Every
 * number comes from the server's catalogue entry; nothing is worked out here
 * except the differences between them.
 */
export default function PriceBreakdown({ entry }: { entry: ReportCatalogueEntry }) {
  const { t } = useTranslation();
  const status = usePassStatus();

  const payPaise = entry.pricePaise;
  const passPct = entry.passDiscountPct ?? 0;
  // A server from before the price steps sends no list price: then the price is the list price.
  const listPaise = passPct > 0 ? (entry.listPricePaise ?? payPaise) : payPaise;
  const mrpPaise =
    entry.originalPricePaise !== null && entry.originalPricePaise > listPaise ? entry.originalPricePaise : null;
  const offer = computeDiscount(listPaise, mrpPaise);
  const savedPaise = (mrpPaise ?? listPaise) - payPaise;

  // Up to how much less a member pays, for someone who has no Pass yet.
  const bestPct =
    passPct === 0 && status && !status.pass ? Math.max(0, ...status.offers.map((o) => o.reportDiscountPct)) : 0;

  // The Platinum free report (money.platinumReport): this period's one is still unused. The server
  // applies it to a report bought on its own (a multi-month bundle is charged as usual).
  const freeReport = Boolean(status?.pass && (status.pass.freeReportsPerPeriod ?? 0) > 0 && status.freeReportAvailable);

  // A plain price with nothing taken off and nothing to offer: the buy button already says it.
  if (mrpPaise === null && passPct === 0 && bestPct === 0 && !freeReport) return null;

  return (
    <div className="mb-3 rounded-2xl border border-gold/15 bg-background/40 p-3.5" data-testid="price-breakdown">
      <dl className="flex flex-col gap-2 text-sm">
        {mrpPaise !== null && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">{t("pass.price.mrp")}</dt>
            <dd className="text-muted line-through">{formatRupees(mrpPaise)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-foreground/85">
            {offer ? t("pass.price.offer", { percent: offer.percentOff }) : t("pass.price.mrp")}
          </dt>
          <dd className="text-foreground">{formatRupees(listPaise)}</dd>
        </div>
        {passPct > 0 && (
          <div className="flex items-center justify-between gap-3 text-gold" data-testid="price-pass-line">
            <dt className="flex items-center gap-1.5">
              <Crown size={13} className="shrink-0" />
              {t("pass.price.pass", { percent: passPct })}
            </dt>
            <dd className="shrink-0">−{formatRupees(listPaise - payPaise)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-gold/15 pt-2">
          <dt className="font-semibold text-foreground">{t("pass.price.total")}</dt>
          <dd className="text-base font-bold text-foreground" data-testid="price-total">
            {formatRupees(payPaise)}
          </dd>
        </div>
      </dl>
      {savedPaise > 0 && (
        <p className="mt-1.5 text-right text-[11px] font-medium text-emerald-400">
          {t("pass.price.saved", { amount: formatRupees(savedPaise) })}
        </p>
      )}
      {freeReport && (
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-gold" data-testid="price-free-report">
          <Crown size={12} className="mr-1 inline -mt-0.5" />
          {t("pass.freeReportReady")}
        </p>
      )}
      {bestPct > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-foreground/75" data-testid="price-pass-teaser">
          <Crown size={12} className="mr-1 inline -mt-0.5 text-gold" />
          {t("pass.price.teaser", { percent: bestPct })}{" "}
          <Link href="/pass" className="font-semibold text-gold underline underline-offset-2">
            {t("pass.price.teaserCta")}
          </Link>
        </p>
      )}
    </div>
  );
}
