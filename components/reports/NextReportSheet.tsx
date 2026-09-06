"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useAuth } from "@/providers/auth-provider";
import { reportsApi } from "@/lib/reports-api";
import { getReportTheme } from "@/lib/report-theme";
import { HUE_GRADIENT } from "./ReportThemeCard";

/**
 * One-time "which report should we prepare next" prompt, offered on exit
 * from a report the user just read — see app/reports/[id]/page.tsx's
 * `offerNextReportVote`. Tap = select AND submit in one motion (a low-stakes
 * preference pick doesn't need a confirm step). Same bottom-sheet shell as
 * ReportRatingSheet, and the same fire-and-forget-on-error idiom: losing one
 * vote isn't worth an error state.
 */
export default function NextReportSheet({
  reportKeys,
  onClose,
}: {
  reportKeys: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useDismissOnBackPress(true, onClose);

  const pick = async (key: string) => {
    if (selected) return;
    setSelected(key);
    try {
      await reportsApi.voteNextReport(key);
      void refresh();
    } catch {
      // Losing one vote isn't worth an error state — same idiom as ReportRatingSheet.
    }
    setSubmitted(true);
    setTimeout(onClose, 900);
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={<h2 className="text-base font-display text-foreground">{t("nextReportVote.title")}</h2>}
    >
      {submitted ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <Check size={22} className="text-black" />
          </div>
          <p className="text-sm text-foreground">{t("nextReportVote.success")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">{t("nextReportVote.prompt")}</p>
          <div className="grid grid-cols-2 gap-3">
            {reportKeys.map((key) => {
              const theme = getReportTheme(key);
              const Icon = theme.icon;
              const isSelected = selected === key;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pick(key)}
                  disabled={!!selected}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors ${
                    isSelected ? "border-gold bg-gold/10" : "border-gold/15 bg-card"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br ${HUE_GRADIENT[theme.hue]}`}
                  >
                    <div className="w-8 h-8 rounded-full border border-gold/40 bg-background/30 backdrop-blur-sm flex items-center justify-center text-gold">
                      <Icon size={16} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                    {t(`reports.labels.${key}`, key)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </BottomSheetModal>
  );
}
