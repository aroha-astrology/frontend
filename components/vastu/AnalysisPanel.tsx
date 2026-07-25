"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Sparkles, Loader2, AlertTriangle, ListChecks, History, ChevronRight,
  Star, Home, Wind, CheckCircle2, Send,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { RATING_META, TONE_CLASSES } from "@/lib/vastu/data";
import type { PlanAnalysis } from "@/lib/vastu/analysis";
import type { VastuPlan } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import WalletBalance from "@/components/ui/WalletBalance";

interface RoomAnalysisEntry {
  room?: string;
  currentPlacement?: string;
  assessment?: string;
  good?: string;
  impact?: string;
  remedy?: string;
  highlights?: string[];
}
export interface VastuAiResult {
  overallAssessment?: string;
  summary?: string[];
  summaryParagraph?: string;
  chartAlignment?: { summary?: string; favorableRooms?: string[]; cautions?: string[] };
  shapeAnalysis?: string;
  elementBalance?: Record<string, { status?: string; suggestion?: string }>;
  roomAnalysis?: RoomAnalysisEntry[];
  criticalDefects?: string[];
  positiveAspects?: string[];
  priorityActions?: string[];
  remedies?: Record<string, string[]>;
  directionGuidance?: Record<string, string>;
  followUp?: { question: string; answer: string };
  [k: string]: unknown;
}

function scoreTone(score: number) {
  if (score >= 75) return { text: "text-emerald-400", ring: "#22c55e", labelKey: "vastu.analysis.good" };
  if (score >= 50) return { text: "text-amber-400", ring: "#f59e0b", labelKey: "vastu.analysis.needsWork" };
  return { text: "text-red-400", ring: "#ef4444", labelKey: "vastu.analysis.majorIssues" };
}

export default function AnalysisPanel(props: {
  analysis: PlanAnalysis;
  signedIn: boolean;
  balancePaise: number;
  costPaise: number;
  aiLoading: boolean;
  aiResult: VastuAiResult | null;
  aiError: string | null;
  onGenerate: () => void;
  history: VastuPlan[];
  historyLoading: boolean;
  profileName: string;
  onViewHistory: (plan: VastuPlan) => void;
  canAsk: boolean;
  onAsk: (question: string) => void;
  asking: boolean;
  askError: string | null;
}) {
  const { t } = useTranslation();
  const { analysis, signedIn, balancePaise, costPaise, aiLoading, aiResult, aiError } = props;
  const hasRooms = analysis.rooms.length > 0;
  const tone = scoreTone(analysis.overallScore);

  return (
    <div className="flex flex-col gap-3">
      {/* Overall score */}
      <Card className="p-4 flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0" style={{ background: `conic-gradient(${tone.ring} ${analysis.overallScore * 3.6}deg, rgba(212,175,55,0.12) 0deg)` }}>
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
                  <span className="text-xs text-foreground font-medium truncate">{t(r.labelKey, r.label)}</span>
                  <span className="text-[10px] font-mono text-muted">{r.zone}</span>
                  <span className={`ml-auto text-[11px] font-semibold whitespace-nowrap ${cls.text}`}>{t(meta.labelKey)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Generate CTA */}
      <GenerateCTA
        hasRooms={hasRooms}
        signedIn={signedIn}
        balancePaise={balancePaise}
        costPaise={costPaise}
        aiLoading={aiLoading}
        aiError={aiError}
        onGenerate={props.onGenerate}
      />

      {/* AI result */}
      {aiResult && <AiResult result={aiResult} canAsk={props.canAsk} onAsk={props.onAsk} asking={props.asking} askError={props.askError} />}

      {/* History — scoped to whichever profile is currently active */}
      {!props.historyLoading && (
        <Card className="p-4">
          <div className="flex items-center gap-1.5 mb-3 text-gold">
            <History size={14} />
            <h3 className="text-sm font-semibold font-display">{t("vastu.analysis.historyTitle")}</h3>
          </div>
          {props.history.length === 0 ? (
            <p className="text-xs text-muted py-2 text-center">
              {t("vastu.analysis.historyEmpty", { name: props.profileName })}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {props.history.map((p) => {
                const done = p.status === "done" && !!p.analysis;
                return (
                  <li key={p.id}>
                    <button onClick={() => done && props.onViewHistory(p)} disabled={!done} className="w-full flex items-center gap-2 rounded-xl border border-gold/15 px-3 py-2 text-left hover:border-gold/40 disabled:opacity-50 transition-colors">
                      <span className="text-xs text-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                      {p.overallScore != null && <span className={`text-xs font-semibold ${scoreTone(p.overallScore).text}`}>{p.overallScore}</span>}
                      <span className="ml-auto text-[10px] text-muted capitalize">{done ? "" : p.status}</span>
                      {done && <ChevronRight size={13} className="text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function GenerateCTA({ hasRooms, signedIn, balancePaise, costPaise, aiLoading, aiError, onGenerate }: {
  hasRooms: boolean; signedIn: boolean; balancePaise: number; costPaise: number; aiLoading: boolean; aiError: string | null; onGenerate: () => void;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const insufficient = balancePaise < costPaise;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-gold" />
        <h3 className="text-sm font-semibold text-gold font-display">{t("vastu.analysis.reportTitle")}</h3>
        <span className="ml-auto text-[11px] text-muted">
          <WalletBalance paise={balancePaise} />
        </span>
      </div>
      <p className="text-[11px] text-muted mb-3">{t("vastu.analysis.reportBlurb")}</p>

      {!signedIn ? (
        <p className="text-xs text-muted text-center py-2">{t("vastu.analysis.signInToAnalyze")}</p>
      ) : aiLoading ? (
        <button disabled className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold/15 border border-gold/30 text-gold px-4 py-3 text-sm font-semibold">
          <Loader2 size={15} className="animate-spin" /> {t("vastu.analysis.analyzing")}
        </button>
      ) : insufficient || aiError === "INSUFFICIENT_CREDITS" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-amber-400 text-center">{t("vastu.analysis.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}</p>
          <Link href="/payment" className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold">
            {t("vastu.analysis.getCredits")}
          </Link>
        </div>
      ) : confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-foreground text-center">{t("vastu.analysis.confirmSpend", { cost: formatRupees(costPaise) })}</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-gold/20 text-muted px-4 py-2.5 text-sm font-medium">{t("common.no")}</button>
            <button onClick={() => { setConfirming(false); onGenerate(); }} className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold">{t("vastu.analysis.confirmYes")}</button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={() => setConfirming(true)} disabled={!hasRooms} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            <Sparkles size={15} /> {t("vastu.analysis.generate", { cost: formatRupees(costPaise) })}
          </button>
          {!hasRooms && <p className="mt-2 text-[11px] text-muted text-center">{t("vastu.analysis.empty")}</p>}
        </>
      )}
      {aiError && aiError !== "INSUFFICIENT_CREDITS" && <p className="mt-2 text-[11px] text-red-400 text-center">{aiError}</p>}
    </Card>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-gold">{icon}<span className="text-xs font-semibold">{title}</span></div>
      {children}
    </div>
  );
}
function Bullets({ items, color = "text-gold" }: { items?: string[]; color?: string }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-xs text-foreground/85"><span className={color}>•</span><span>{s}</span></li>
      ))}
    </ul>
  );
}

function AiResult({ result, canAsk, onAsk, asking, askError }: {
  result: VastuAiResult; canAsk: boolean; onAsk: (q: string) => void; asking: boolean; askError: string | null;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const summary = Array.isArray(result.summary) ? result.summary : [];
  const rooms = Array.isArray(result.roomAnalysis) ? result.roomAnalysis : [];
  const elements = result.elementBalance ?? {};
  const rem = result.remedies ?? {};
  const dg = result.directionGuidance ?? {};
  const followUp = result.followUp;

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gold font-display">{t("vastu.analysis.remediesTitle")}</h3>

      {summary.length >= 3 && (
        <div className="rounded-xl border border-gold/20 bg-gold/5 p-3 flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-foreground">{summary[0]}</p>
          <p className="text-xs text-foreground/80">{summary[1]}</p>
          <p className="text-xs text-emerald-400">→ {summary[2]}</p>
        </div>
      )}
      {result.summaryParagraph && <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{result.summaryParagraph}</p>}

      {/* Kundli personalisation */}
      {result.chartAlignment?.summary && (
        <Section icon={<Star size={14} />} title={t("vastu.analysis.chartAlignment")}>
          <p className="text-xs text-foreground/85 mb-2">{result.chartAlignment.summary}</p>
          <Bullets items={result.chartAlignment.favorableRooms} color="text-emerald-400" />
          <Bullets items={result.chartAlignment.cautions} color="text-amber-400" />
        </Section>
      )}

      {result.shapeAnalysis && <Section icon={<Home size={14} />} title={t("vastu.analysis.shapeAnalysis")}><p className="text-xs text-foreground/85">{result.shapeAnalysis}</p></Section>}

      {Array.isArray(result.priorityActions) && result.priorityActions.length > 0 && (
        <Section icon={<ListChecks size={14} className="text-emerald-400" />} title={t("vastu.analysis.priorityActions")}>
          <ol className="flex flex-col gap-1.5">
            {result.priorityActions.map((a, i) => (<li key={i} className="flex gap-2 text-xs text-foreground/85"><span className="text-gold">{i + 1}.</span><span>{a}</span></li>))}
          </ol>
        </Section>
      )}

      {Array.isArray(result.criticalDefects) && result.criticalDefects.length > 0 && (
        <Section icon={<AlertTriangle size={14} className="text-red-400" />} title={t("vastu.analysis.criticalDefects")}><Bullets items={result.criticalDefects} color="text-red-400" /></Section>
      )}

      {/* Per-room */}
      {rooms.length > 0 && (
        <Section icon={<Home size={14} />} title={t("vastu.analysis.roomByRoom")}>
          <div className="flex flex-col gap-2">
            {rooms.map((rm, i) => (
              <div key={i} className="rounded-xl border border-gold/10 p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground capitalize">{t(`vastu.rooms.${rm.room}`, rm.room ?? "")}</span>
                  {rm.currentPlacement && <span className="text-[10px] font-mono text-muted">{rm.currentPlacement}</span>}
                </div>
                {rm.impact && <p className="text-[11px] text-foreground/80"><b className="text-muted">{t("vastu.analysis.impact")}:</b> {rm.impact}</p>}
                {rm.remedy && <p className="text-[11px] text-emerald-400/90 mt-0.5"><b>{t("vastu.analysis.remedy")}:</b> {rm.remedy}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Elements */}
      {Object.keys(elements).length > 0 && (
        <Section icon={<Wind size={14} />} title={t("vastu.analysis.elementBalance")}>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(elements).map(([k, v]) => (
              <span key={k} className="text-[10px] rounded-full border border-gold/15 px-2 py-1 text-foreground/80 capitalize">{k}: <b className={v.status === "balanced" ? "text-emerald-400" : "text-amber-400"}>{v.status}</b></span>
            ))}
          </div>
        </Section>
      )}

      {/* Remedies */}
      {(rem.nonStructural?.length || rem.plants?.length || rem.mantras?.length || rem.yantras?.length || rem.structural?.length) ? (
        <Section icon={<Sparkles size={14} />} title={t("vastu.analysis.remedies")}>
          <Bullets items={rem.nonStructural} />
          <Bullets items={rem.plants} color="text-emerald-400" />
          <Bullets items={rem.mantras} color="text-gold" />
          <Bullets items={rem.yantras} color="text-gold" />
          <Bullets items={rem.structural} color="text-amber-400" />
        </Section>
      ) : null}

      {/* Direction guidance */}
      {Object.values(dg).some(Boolean) && (
        <Section icon={<CheckCircle2 size={14} />} title={t("vastu.analysis.directionGuidance")}>
          <div className="flex flex-col gap-1">
            {(["sleeping", "working", "cooking", "studying"] as const).map((k) => dg[k] ? (
              <p key={k} className="text-[11px] text-foreground/80"><b className="text-muted capitalize">{t(`vastu.analysis.dir_${k}`)}:</b> {dg[k]}</p>
            ) : null)}
          </div>
        </Section>
      )}

      {Array.isArray(result.positiveAspects) && result.positiveAspects.length > 0 && (
        <Section icon={<CheckCircle2 size={14} className="text-emerald-400" />} title={t("vastu.analysis.positives")}><Bullets items={result.positiveAspects} color="text-emerald-400" /></Section>
      )}

      {/* Follow-up question */}
      <div className="border-t border-gold/10 pt-3">
        {followUp ? (
          <div className="rounded-xl bg-surface/50 p-3">
            <p className="text-xs font-semibold text-gold mb-1">{followUp.question}</p>
            <p className="text-xs text-foreground/85 whitespace-pre-line">{followUp.answer}</p>
          </div>
        ) : canAsk ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted">{t("vastu.analysis.askHint")}</p>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("vastu.analysis.askPlaceholder")} className="flex-1 rounded-xl border border-gold/20 bg-surface px-3 py-2.5 text-xs text-foreground outline-none focus:border-gold/50" maxLength={500} />
              <button onClick={() => q.trim().length > 1 && onAsk(q.trim())} disabled={asking || q.trim().length < 2} className="rounded-xl bg-gold/15 border border-gold/30 text-gold px-3.5 flex items-center justify-center disabled:opacity-40">
                {asking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            {askError && <p className="text-[11px] text-red-400">{askError}</p>}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
