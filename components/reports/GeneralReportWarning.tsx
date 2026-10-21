"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Shown over ReportPurchaseDrawer when the reader taps Buy without answering any of the report's
 * questions (see answeredNone in lib/report-questions.ts). A chart cannot know the reader's job,
 * money or family, so without answers the report can only be general; this says so before they
 * pay, and lets them go back and answer or carry on knowingly.
 */
export default function GeneralReportWarning({
  onAnswer,
  onContinue,
}: {
  /** Close this and take the reader back to the questions. */
  onAnswer: () => void;
  /** Carry on to the usual spend confirmation with no answers. */
  onContinue: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onAnswer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        onAnswer();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="general-report-warning-title"
        aria-describedby="general-report-warning-body"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 24, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 26 }}
        className="w-full max-w-sm rounded-3xl border border-gold/30 bg-card p-6 text-center shadow-2xl"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <ClipboardList size={22} aria-hidden="true" />
        </div>
        <h2 id="general-report-warning-title" className="text-lg font-display font-bold text-foreground">
          {t("reports.questions.skipTitle")}
        </h2>
        <p id="general-report-warning-body" className="mt-2 text-sm leading-relaxed text-foreground/80">
          {t("reports.questions.skipBody")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={onAnswer}
            className="w-full rounded-2xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold"
          >
            {t("reports.questions.skipAnswer")}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-2xl border border-gold/20 text-muted px-4 py-3 text-sm font-medium"
          >
            {t("reports.questions.skipContinue")}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
