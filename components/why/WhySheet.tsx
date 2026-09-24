"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Lightbulb, TrendingDown, TrendingUp, Minus } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { ApiError } from "@/lib/api";
import { insightsApi, type LifeArea, type WhyResponse } from "@/lib/insights-api";
import { effectKey, whyFactorText } from "@/lib/why-format";

/**
 * "Why Aroha is saying this": the chart facts behind a reading for one area —
 * the running dasha, the slow planets moving through the area's houses, the
 * area's house lord — plus how the chart was calculated. Everything here is
 * computed from the chart, not written by AI.
 */
export default function WhySheet({ area, date, onClose }: { area: LifeArea; date?: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<WhyResponse | null>(null);
  const [error, setError] = useState<"notReady" | "error" | null>(null);

  useEffect(() => {
    let cancelled = false;
    insightsApi
      .why(area, date)
      .then((res) => !cancelled && setData(res))
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError && err.message === "CHART_NOT_READY" ? "notReady" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [area, date]);

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb size={18} className="text-gold shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold font-display text-foreground truncate">{t("why.title")}</h2>
            <p className="text-[11px] text-muted">{t(`why.areas.${area}`)}</p>
          </div>
        </div>
      }
    >
      {!data && !error && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <Loader2 size={16} className="animate-spin text-gold" />
          {t("why.loading")}
        </div>
      )}
      {error && <p className="py-8 text-center text-sm text-muted">{t(error === "notReady" ? "why.notReady" : "why.error")}</p>}

      {data && (
        <div className="space-y-2.5">
          <p className="text-xs text-muted">{t("why.intro")}</p>
          {data.factors.length === 0 && <p className="text-sm text-foreground/80">{t("why.empty")}</p>}
          {data.factors.map((factor, i) => {
            const Icon = factor.effect > 0 ? TrendingUp : factor.effect < 0 ? TrendingDown : Minus;
            const tone =
              factor.effect > 0 ? "text-emerald-400" : factor.effect < 0 ? "text-amber-400" : "text-muted";
            return (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-gold/10 bg-surface/50">
                <Icon size={16} className={`${tone} shrink-0 mt-0.5`} />
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{t(effectKey(factor.effect))}</p>
                  <p className="text-sm text-foreground leading-snug">{whyFactorText(t, factor, i18n.language)}</p>
                </div>
              </div>
            );
          })}

          <div className="pt-2 border-t border-gold/10 space-y-1">
            <p className="text-[11px] font-semibold text-foreground/80">{t("why.howCalculated")}</p>
            <p className="text-[11px] text-muted">
              {t("why.calcLine", {
                ayanamsa: data.calculation.ayanamsa ?? "lahiri",
                houseSystem: data.calculation.houseSystem ?? "W",
                version: data.calculation.calculationVersion ?? "—",
              })}
            </p>
            {data.birth.placeName && (
              <p className="text-[11px] text-muted">
                {t("why.bornIn", { place: data.birth.placeName, timezone: data.birth.timezone ?? "—" })}
              </p>
            )}
            <p className="text-[11px] text-muted">{t("why.birthTimeTrust", { pct: data.birthTime.pct })}</p>
            <p className="text-[10px] text-muted/80 pt-1">{t("why.guidance")}</p>
          </div>
        </div>
      )}
    </BottomSheetModal>
  );
}
