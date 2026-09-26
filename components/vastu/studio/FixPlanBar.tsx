"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, X, Sparkles, SkipForward, Eye, ListOrdered } from "lucide-react";
import type { FixSuggestion } from "@/lib/vastu/fixes";
import { getRoomType } from "@/lib/vastu/data";
import { AnimatedNumber, RatingPill, scoreColor } from "./ui";

export type FixPlanMode = "overview" | "all" | "step";

/**
 * "Fix my plan": improvements for the whole home, found by search and scored
 * by the same rules engine — never by AI. Preview them all at once, or review
 * one by one; nothing changes until Apply, and each Apply is one undo step.
 */
export default function FixPlanBar({ steps, scoreBefore, scoreAfter, mode, stepIndex, onMode, onApplyAll, onApplyStep, onSkipStep, onClose }: {
  steps: FixSuggestion[];
  scoreBefore: number;
  scoreAfter: number;
  mode: FixPlanMode;
  stepIndex: number;
  onMode: (m: FixPlanMode) => void;
  onApplyAll: () => void;
  onApplyStep: () => void;
  onSkipStep: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const label = (type: string) => t(getRoomType(type)?.labelKey ?? type, getRoomType(type)?.label ?? type);
  const step = steps[stepIndex];

  const Score = ({ a, b }: { a: number; b: number }) => (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-surface py-2" data-testid="vastu-fixplan-score">
      <span className="text-[11px] text-muted">{t("vastu.fix.score", "Score")}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor(a) }}>{a}</span>
      <ArrowRight size={16} className="text-gold" />
      <span className="text-lg font-bold" style={{ color: scoreColor(b) }}><AnimatedNumber value={b} /></span>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gold/40 bg-card p-3 flex flex-col gap-3 shadow-[0_10px_40px_-18px_rgba(223,181,100,0.55)]" data-testid="vastu-fixplan">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-gold" />
        <span className="text-sm font-semibold text-foreground">{t("vastu.fixplan.title", "Fix my plan")}</span>
        <button onClick={onClose} aria-label={t("common.close")} className="ml-auto w-8 h-8 rounded-full text-muted hover:text-foreground flex items-center justify-center"><X size={16} /></button>
      </div>

      {steps.length === 0 ? (
        <p className="text-[12.5px] text-muted">{t("vastu.fixplan.none", "No move improves this plan further — every room is either well placed or has no free spot in a better direction.")}</p>
      ) : mode === "step" && step ? (
        <>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{t("vastu.fixplan.stepOf", "Change {{n}} of {{total}}", { n: stepIndex + 1, total: steps.length })}</p>
          <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.05] px-3 py-2.5">
            <span className="text-lg">{getRoomType(step.roomType)?.emoji}</span>
            <span className="text-[13px] font-semibold text-foreground">{label(step.roomType)}</span>
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[13px]">
              <span className="text-muted">{step.fromZone}</span>
              <ArrowRight size={13} className="text-gold" />
              <span className="font-bold text-foreground">{step.toZone}</span>
            </span>
          </div>
          <div className="flex items-center gap-2"><RatingPill ratingKey={step.fromRating} size="xs" /><ArrowRight size={12} className="text-muted" /><RatingPill ratingKey={step.toRating} size="xs" /></div>
          <Score a={step.scoreBefore} b={step.scoreAfter} />
          <div className="flex gap-2">
            <button onClick={onSkipStep} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gold/20 px-3 py-2.5 text-sm font-medium text-muted" data-testid="vastu-fixplan-skip"><SkipForward size={15} /> {t("vastu.fixplan.keep", "Keep as is")}</button>
            <button onClick={onApplyStep} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00]" data-testid="vastu-fixplan-apply-step"><Check size={15} /> {t("vastu.fix.apply", "Apply")}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] text-foreground/85">{t("vastu.fixplan.found", "{{count}} improvements found", { count: steps.length })}</p>
          <ul className="flex flex-col gap-1.5" data-testid="vastu-fixplan-steps">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                <span className="text-base">{getRoomType(s.roomType)?.emoji}</span>
                <span className="text-[13px] text-foreground">{label(s.roomType)}</span>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-[12.5px]">
                  <span className="text-muted">{s.fromZone}</span>
                  <ArrowRight size={12} className="text-gold" />
                  <span className="font-bold text-foreground">{s.toZone}</span>
                </span>
              </li>
            ))}
          </ul>
          <Score a={scoreBefore} b={scoreAfter} />
          {mode === "all" ? (
            <div className="flex gap-2">
              <button onClick={() => onMode("overview")} className="flex-1 rounded-xl border border-gold/20 px-3 py-2.5 text-sm font-medium text-muted">{t("common.back")}</button>
              <button onClick={onApplyAll} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00]" data-testid="vastu-fixplan-apply-all"><Check size={15} /> {t("vastu.fixplan.applyAll", "Apply all")}</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => onMode("all")} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gold/35 px-3 py-2.5 text-sm font-semibold text-gold" data-testid="vastu-fixplan-preview-all"><Eye size={15} /> {t("vastu.fixplan.previewAll", "Preview all")}</button>
              <button onClick={() => onMode("step")} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00]" data-testid="vastu-fixplan-review"><ListOrdered size={15} /> {t("vastu.fixplan.review", "One by one")}</button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
