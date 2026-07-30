"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/**
 * Explains what the HIGH/MEDIUM/LOW/NONE confidence badges shown on
 * TimingWindowsCard/AgeBandTable actually mean — those badges previously
 * rendered with zero explanation anywhere in the UI. Shared so any report
 * screen adding this badge style gets the legend for free instead of
 * duplicating the copy.
 */
export default function ConfidenceLegend() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-muted hover:text-foreground transition-colors"
      >
        <Info size={12} className="shrink-0" />
        <span>{t("reports.facts.confidenceLegend.caption")}</span>
      </button>

      {open && (
        <BottomSheetModal
          onClose={() => setOpen(false)}
          closeLabel={t("common.close")}
          header={
            <p className="text-sm font-display text-foreground">
              {t("reports.facts.confidenceLegend.title")}
            </p>
          }
        >
          <div className="flex flex-col gap-3 text-sm text-muted">
            <p>{t("reports.facts.confidenceLegend.intro")}</p>
            <ul className="flex flex-col gap-2">
              <li>{t("reports.facts.confidenceLegend.high")}</li>
              <li>{t("reports.facts.confidenceLegend.medium")}</li>
              <li>{t("reports.facts.confidenceLegend.low")}</li>
              <li>{t("reports.facts.confidenceLegend.none")}</li>
            </ul>
          </div>
        </BottomSheetModal>
      )}
    </>
  );
}
