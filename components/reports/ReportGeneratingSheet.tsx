"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import GeneratingSpinner from "@/components/ui/GeneratingSpinner";
import VarshikWaiting from "./varshik/VarshikWaiting";

/**
 * "Writing your report…" bottom sheet, shown while any report type is generating —
 * built on the same BottomSheetModal shell as ReportPurchaseDrawer. Falls back to the
 * plain rotating-ring GeneratingSpinner if the illustration at /reports/writing.gif
 * fails to load, same imgError pattern as ReportRowVisual/GemVisual.
 */
export default function ReportGeneratingSheet({
  onClose,
  refreshing,
  reportKey,
  progress,
}: {
  onClose: () => void;
  refreshing?: boolean;
  /** Which report is being written; Varshik Rashifal gets its own wheel and steps. */
  reportKey?: string;
  progress?: { done: number; total: number };
}) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  if (reportKey === "varshik_rashifal_2027" && !refreshing) {
    return (
      <BottomSheetModal onClose={onClose} closeLabel={t("common.close")} header={<div />}>
        <div className="py-2">
          <VarshikWaiting progress={progress} />
        </div>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal onClose={onClose} closeLabel={t("common.close")} header={<div />}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {imgError ? (
          <GeneratingSpinner label="" size={56} className="py-4" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/reports/writing.gif"
            alt=""
            onError={() => setImgError(true)}
            className="w-40 h-40 object-contain"
          />
        )}
        <div className="flex flex-col gap-2">
          <p data-testid={refreshing ? "report-refreshing" : undefined} className="text-base font-semibold text-foreground">{t(refreshing ? "reports.view.refreshingTitle" : "reports.view.generatingTitle")}</p>
          <p className="text-sm text-muted">{t(refreshing ? "reports.view.refreshingBody" : "reports.view.generatingBody")}</p>
        </div>
        <p className="text-xs text-muted/80 leading-relaxed max-w-xs">{t("reports.view.generatingHint")}</p>
      </div>
    </BottomSheetModal>
  );
}
