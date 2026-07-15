"use client";

import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, AlertTriangle, ListChecks, History, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import { RATING_META, TONE_CLASSES } from "@/lib/vastu/data";
import type { PlanAnalysis } from "@/lib/vastu/analysis";
import type { VastuPlan } from "@/lib/api";

export interface VastuAiResult {
  overallAssessment?: string;
  summaryParagraph?: string;
  summary?: string[];
  priorityActions?: string[];
  criticalDefects?: string[];
  positiveAspects?: string[];
  [k: string]: unknown;
}

function scoreTone(score: number): { text: string; ring: string; labelKey: string } {
  if (score >= 75) return { text: "text-emerald-400", ring: "#22c55e", labelKey: "vastu.analysis.good" };
  if (score >= 50) return { text: "text-amber-400", ring: "#f59e0b", labelKey: "vastu.analysis.needsWork" };
  return { text: "text-red-400", ring: "#ef4444", labelKey: "vastu.analysis.majorIssues" };
}

export default function AnalysisPanel({
  analysis,
  signedIn,
  aiLoading,
  aiResult,
  aiError,
  onGetRemedies,
  history,
  onViewHistory,
}: {
  analysis: PlanAnalysis;
  signedIn: boolean;
  aiLoading: boolean;
  aiResult: VastuAiResult | null;
  aiError: string | null;
  onGetRemedies: () => void;
  history: VastuPlan[];
  onViewHistory: (plan: VastuPlan) => void;
}) {
  const { t } = useTranslation();
  const hasRooms = analysis.rooms.length > 0;
  const tone = scoreTone(analysis.overallScore);

  return (
    <div className="flex flex-col gap-3">
      {/* Overall score */}
      <Card className="p-4 flex items-center gap-4">
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `conic-gradient(${tone.ring} ${analysis.overallScore * 3.6}deg, rgba(212,175,55,0.12) 0deg)` }}
        >
          <div className="absolute inset-1.5 rounded-full bg-card flex items-center justify-center">
            <span className={`text-lg font-bold ${tone.text}`}>{hasRooms ? analysis.overallScore : "–"}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted">{t("vastu.analysis.overall")}</p>
          <p className={`text-base font-semibold ${tone.text}`}>{hasRooms ? t(tone.labelKey) : "—"}</p>
        </div>
      </Card>

      {/* Live per-room list */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gold font-display mb-3">{t("vastu.analysis.title")}</h3>
        {!hasRooms ? (
          <p className="text-xs text-muted py-4 text-center">{t("vastu.analysis.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {analysis.rooms.map((r) => {
              const cls = TONE_CLASSES[r.tone];
              const meta = RATING_META[r.ratingKey];
              return (
                <li key={r.roomId} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${cls.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls.dot}`} />
                  <span className="text-sm">{r.emoji}</span>
                  <span className="text-xs text-foreground font-medium truncate">
                    {t(r.labelKey, r.label)}
                  </span>
                  <span className="text-[10px] font-mono text-muted">{r.zone}</span>
                  <span className={`ml-auto text-[11px] font-semibold whitespace-nowrap ${cls.text}`}>
                    {t(meta.labelKey)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* AI remedies trigger */}
        <button
          onClick={onGetRemedies}
          disabled={!hasRooms || aiLoading || !signedIn}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gold/15 border border-gold/30 text-gold px-4 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold/25 transition-colors"
        >
          {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {aiLoading ? t("vastu.analysis.analyzing") : t("vastu.analysis.getRemedies")}
        </button>
        {!signedIn && (
          <p className="mt-2 text-[11px] text-muted text-center">{t("vastu.analysis.signInToAnalyze")}</p>
        )}
        {aiError && <p className="mt-2 text-[11px] text-red-400 text-center">{aiError}</p>}
      </Card>

      {/* AI result */}
      {aiResult && <AiResult result={aiResult} />}

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-3 text-gold">
            <History size={14} />
            <h3 className="text-sm font-semibold font-display">{t("vastu.analysis.historyTitle")}</h3>
          </div>
          <ul className="flex flex-col gap-1.5">
            {history.map((p) => {
              const done = p.status === "done" && !!p.analysis;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => done && onViewHistory(p)}
                    disabled={!done}
                    className="w-full flex items-center gap-2 rounded-xl border border-gold/15 px-3 py-2 text-left hover:border-gold/40 disabled:opacity-50 transition-colors"
                  >
                    <span className="text-xs text-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    {p.overallScore != null && (
                      <span className={`text-xs font-semibold ${scoreTone(p.overallScore).text}`}>
                        {p.overallScore}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted capitalize">
                      {done ? "" : p.status}
                    </span>
                    {done && <ChevronRight size={13} className="text-muted" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function AiResult({ result }: { result: VastuAiResult }) {
  const { t } = useTranslation();
  const priorityActions = Array.isArray(result.priorityActions) ? result.priorityActions : [];
  const criticalDefects = Array.isArray(result.criticalDefects) ? result.criticalDefects : [];

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gold font-display">{t("vastu.analysis.remediesTitle")}</h3>

      {result.summaryParagraph && (
        <p className="text-sm text-foreground/90 leading-relaxed">{result.summaryParagraph}</p>
      )}

      {priorityActions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-emerald-400">
            <ListChecks size={14} />
            <span className="text-xs font-semibold">{t("vastu.analysis.priorityActions")}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {priorityActions.map((a, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground/85">
                <span className="text-gold">{i + 1}.</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {criticalDefects.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-red-400">
            <AlertTriangle size={14} />
            <span className="text-xs font-semibold">{t("vastu.analysis.criticalDefects")}</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {criticalDefects.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs text-foreground/85">
                <span className="text-red-400">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
