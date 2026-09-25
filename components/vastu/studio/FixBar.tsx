"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, X, Wand2 } from "lucide-react";
import type { FixSuggestion } from "@/lib/vastu/fixes";
import { AnimatedNumber, RatingPill, scoreColor } from "./ui";

/**
 * "Fix this": the proposed moves for one room, previewed on the canvas
 * (current room dimmed, proposal in dashed gold). Nothing changes until Apply,
 * and Apply is one undo step.
 */
export default function FixBar({ roomLabel, emoji, suggestions, choice, onChoose, onApply, onCancel }: {
  roomLabel: string;
  emoji: string;
  suggestions: FixSuggestion[];
  choice: number;
  onChoose: (i: number) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const s = suggestions[choice];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gold/40 bg-card p-3 flex flex-col gap-3 shadow-[0_10px_40px_-18px_rgba(223,181,100,0.55)]" data-testid="vastu-fix-bar">
      <div className="flex items-center gap-2">
        <Wand2 size={15} className="text-gold" />
        <span className="text-sm font-semibold text-foreground">{emoji} {roomLabel}</span>
        <span className="text-[11px] text-muted">{t("vastu.fix.preview", "Preview")}</span>
      </div>
      {suggestions.length === 0 ? (
        <p className="text-[12.5px] text-muted">{t("vastu.fix.none", "There's no free spot in a better direction. Try moving or shrinking a neighbouring room first.")}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{t("vastu.fix.current", "Current")}</span>
            <span className="font-mono text-[13px] font-bold text-foreground">{suggestions[0]?.fromZone}</span>
            {suggestions[0] && <RatingPill ratingKey={suggestions[0].fromRating} size="xs" />}
          </div>
          <div className="flex gap-2">
            {suggestions.map((sg, i) => (
              <button
                key={i}
                onClick={() => onChoose(i)}
                data-testid="vastu-fix-option"
                className={`flex-1 rounded-xl border px-2.5 py-2 text-left transition-all ${i === choice ? "border-gold/60 bg-gold/10" : "border-gold/12 bg-surface"}`}
              >
                <span className="block text-[10px] uppercase tracking-[0.14em] text-muted">{i === 0 ? t("vastu.fix.suggested", "Suggested") : t("vastu.fix.alternative", "Alternative")}</span>
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[12px] text-muted">{sg.fromZone}</span>
                  <ArrowRight size={12} className="text-gold" />
                  <span className="font-mono text-[14px] font-bold text-foreground">{sg.toZone}</span>
                </span>
                <span className="mt-1 block"><RatingPill ratingKey={sg.toRating} size="xs" /></span>
              </button>
            ))}
          </div>
          {s && (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-surface py-2" data-testid="vastu-fix-score">
              <span className="text-[11px] text-muted">{t("vastu.fix.score", "Score")}</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor(s.scoreBefore) }}>{s.scoreBefore}</span>
              <ArrowRight size={16} className="text-gold" />
              <span className="text-lg font-bold" style={{ color: scoreColor(s.scoreAfter) }}><AnimatedNumber value={s.scoreAfter} /></span>
            </div>
          )}
        </>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gold/20 px-3 py-2.5 text-sm font-medium text-muted"><X size={15} /> {t("vastu.fix.cancel", "Cancel")}</button>
        <button onClick={onApply} disabled={!s} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gold px-3 py-2.5 text-sm font-bold text-[#1a0e00] disabled:opacity-40" data-testid="vastu-fix-apply"><Check size={15} /> {t("vastu.fix.apply", "Apply")}</button>
      </div>
    </motion.div>
  );
}
