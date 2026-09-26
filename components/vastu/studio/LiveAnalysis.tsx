"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Crosshair, HelpCircle, Wand2, Sparkles } from "lucide-react";
import type { PlanAnalysis, RoomRating } from "@/lib/vastu/analysis";
import type { ScoreBreakdown } from "@/lib/vastu/breakdown";
import { AnimatedNumber, Eyebrow, RatingPill, ScoreRing, scoreColor } from "./ui";

/**
 * The issue navigator: score + counts, then what to fix first (Show me / Why? /
 * Fix this), then every room on request. Replaces the long flat list.
 */
export default function LiveAnalysis({ analysis, breakdown, onShowMe, onWhy, onFix, onScore, fixable, onFixPlan }: {
  analysis: PlanAnalysis;
  breakdown: ScoreBreakdown;
  onShowMe: (roomId: string) => void;
  onWhy: (roomId: string) => void;
  onFix?: (roomId: string) => void;
  onScore: () => void;
  /** Rooms a fix can be suggested for. */
  fixable?: (roomId: string) => boolean;
  /** "Fix my plan": improve the whole home. */
  onFixPlan?: () => void;
}) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const has = analysis.rooms.length > 0;
  const b = breakdown;
  const priority = b.issues.filter((r) => r.ratingKey === "harmful" || r.ratingKey === "center" || r.ratingKey === "poor");

  const label = (r: RoomRating) => t(r.labelKey, r.label);

  return (
    <section className="rounded-3xl border border-gold/15 bg-card p-4 flex flex-col gap-4">
      <button onClick={onScore} className="flex items-center gap-4 text-left" data-testid="vastu-score-card">
        <span className="relative">
          <ScoreRing score={analysis.overallScore} size={64} stroke={5} empty={!has} />
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold" style={{ color: has ? scoreColor(analysis.overallScore) : undefined }}>
            {has ? <AnimatedNumber value={analysis.overallScore} /> : "–"}
          </span>
        </span>
        <span className="flex-1 min-w-0">
          <Eyebrow>{t("vastu.studio.scoreTitle", "Aroha Vastu Score")}</Eyebrow>
          {has ? (
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
              <span className="text-emerald-400">{t("vastu.studio.nAligned", "{{n}} aligned", { n: b.aligned })}</span>
              <span className="text-amber-300">{t("vastu.studio.nAcceptable", "{{n}} acceptable", { n: b.acceptable + b.average + b.onCentre })}</span>
              <span className="text-red-400">{t("vastu.studio.nCorrection", "{{n}} to correct", { n: b.correction })}</span>
            </span>
          ) : (
            <span className="block mt-1 text-[12px] text-muted">{t("vastu.analysis.empty")}</span>
          )}
          <span className="block text-[10.5px] text-muted mt-0.5">{t("vastu.studio.tapForDetail", "Tap for what's behind it")}</span>
        </span>
      </button>

      {has && (
        <div data-testid="vastu-issues">
          {onFixPlan && priority.length > 0 && (
            <button onClick={onFixPlan} data-testid="vastu-fixplan-open" className="mb-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[#1a0e00] shadow-[0_8px_24px_-10px_rgba(223,181,100,0.7)]">
              <Sparkles size={15} /> {t("vastu.fixplan.title", "Fix my plan")}
            </button>
          )}
          <Eyebrow className="mb-2">{priority.length ? t("vastu.studio.fixFirst", "Look at these first") : t("vastu.studio.allGood", "Nothing needs correcting")}</Eyebrow>
          {priority.length === 0 ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-3 text-[13px] text-emerald-300">
              <Sparkles size={15} /> {t("vastu.studio.allGoodBody", "Every room sits in a direction this rule set accepts.")}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {priority.map((r) => (
                <li key={r.roomId} className="rounded-2xl border border-gold/12 bg-surface px-3 py-2.5" data-testid="vastu-issue">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-[13px] font-semibold text-foreground truncate">{label(r)}</span>
                    <span className="text-[11px] font-mono text-muted">{r.zone}</span>
                    <span className="ml-auto"><RatingPill ratingKey={r.ratingKey} size="xs" /></span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <IssueBtn icon={<Crosshair size={13} />} label={t("vastu.studio.showMe", "Show me")} onClick={() => onShowMe(r.roomId)} />
                    <IssueBtn icon={<HelpCircle size={13} />} label={t("vastu.studio.why", "Why?")} onClick={() => onWhy(r.roomId)} />
                    {onFix && (!fixable || fixable(r.roomId)) && <IssueBtn icon={<Wand2 size={13} />} label={t("vastu.fix.cta", "Fix this")} onClick={() => onFix(r.roomId)} primary />}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button onClick={() => setAll((a) => !a)} className="mt-3 w-full flex items-center justify-between rounded-xl px-1 py-1.5 text-[12px] text-muted hover:text-foreground" aria-expanded={all}>
            {t("vastu.studio.allRooms", "All rooms ({{n}})", { n: analysis.rooms.length })}
            <ChevronDown size={15} className={`transition-transform ${all ? "rotate-180" : ""}`} />
          </button>
          {all && (
            <ul className="flex flex-col gap-1 mt-1" data-testid="vastu-all-rooms">
              {analysis.rooms.map((r) => (
                <li key={r.roomId}>
                  <button onClick={() => onWhy(r.roomId)} className="w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-gold/[0.05]">
                    <span>{r.emoji}</span>
                    <span className="text-[13px] text-foreground truncate">{label(r)}</span>
                    <span className="text-[11px] font-mono text-muted">{r.zone}</span>
                    <span className="ml-auto"><RatingPill ratingKey={r.ratingKey} size="xs" /></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function IssueBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11.5px] font-semibold transition-colors ${primary ? "bg-gold/15 text-gold border border-gold/40" : "border border-gold/15 text-foreground/85 hover:border-gold/40"}`}
    >
      {icon} {label}
    </button>
  );
}
