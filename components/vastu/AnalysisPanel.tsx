"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Sparkles, Loader2, AlertTriangle, ListChecks, History, ChevronRight, ChevronDown,
  Star, Home, Wind, CheckCircle2, Send, Trash2, PencilRuler, Crosshair, Circle, Check, Leaf, Wallet,
} from "lucide-react";
import type { VastuPlan } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { track } from "@/lib/analytics";
import { Eyebrow, scoreColor } from "./studio/ui";

interface RoomAnalysisEntry {
  room?: string;
  roomId?: string;
  currentPlacement?: string;
  assessment?: string;
  good?: string;
  impact?: string;
  remedy?: string;
  highlights?: string[];
}
export interface VastuAiResult {
  overallAssessment?: string;
  overallScore?: number;
  overallVastuScore?: number;
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

/**
 * The paid AI report: what it adds, buying it, waiting for it, reading it, and
 * past reports. The free live analysis lives above it (studio/LiveAnalysis).
 */
export default function AnalysisPanel(props: {
  /** Admin switch for the paid report (paid.vastu) — off hides the report card. */
  reportEnabled: boolean;
  /** The plan passes the geometry checks a paid report needs (validatePlan().reportReady). */
  reportReady: boolean;
  hasRooms: boolean;
  balancePaise: number;
  costPaise: number;
  aiLoading: boolean;
  aiStartedAt: number | null;
  aiResult: VastuAiResult | null;
  aiError: string | null;
  /** Still waiting past the usual time — shown under the progress. */
  aiSlow: boolean;
  /** Neutral outcome message (e.g. stopped waiting, report will appear in history). */
  aiNotice: string | null;
  onGenerate: () => void;
  history: VastuPlan[];
  historyLoading: boolean;
  profileName: string;
  onViewHistory: (plan: VastuPlan) => void;
  onDeleteHistory: (plan: VastuPlan) => void;
  /** Load the viewed report's saved plan into the editor (absent when there's nothing to load). */
  onOpenPlan?: () => void;
  /** Focus a report room on the plan (by room id or type). */
  onShowRoom?: (key: string) => void;
  canAsk: boolean;
  onAsk: (question: string) => void;
  asking: boolean;
  askError: string | null;
}) {
  const { t } = useTranslation();
  const { aiResult } = props;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {props.reportEnabled && (
        <GenerateCTA
          hasRooms={props.hasRooms}
          reportReady={props.reportReady}
          balancePaise={props.balancePaise}
          costPaise={props.costPaise}
          aiLoading={props.aiLoading}
          aiStartedAt={props.aiStartedAt}
          aiError={props.aiError}
          aiSlow={props.aiSlow}
          aiNotice={props.aiNotice}
          onGenerate={props.onGenerate}
          profileName={props.profileName}
        />
      )}

      {aiResult && (
        <AiResult
          result={aiResult}
          profileName={props.profileName}
          canAsk={props.canAsk}
          onAsk={props.onAsk}
          asking={props.asking}
          askError={props.askError}
          onOpenPlan={props.onOpenPlan}
          onShowRoom={props.onShowRoom}
        />
      )}

      {/* History — scoped to whichever profile is currently active */}
      {!props.historyLoading && (
        <section className="rounded-3xl border border-gold/15 bg-card p-4">
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
                const inFlight = p.status === "pending" || p.status === "processing";
                return (
                  <li key={p.id} className="flex items-center gap-1.5">
                    <button onClick={() => done && props.onViewHistory(p)} disabled={!done} className="flex-1 min-w-0 flex items-center gap-2.5 rounded-2xl border border-gold/12 bg-surface px-3 py-2.5 text-left hover:border-gold/40 disabled:opacity-60 transition-colors">
                      {p.overallScore != null ? (
                        <span className="w-9 text-center text-sm font-bold tabular-nums" style={{ color: scoreColor(p.overallScore) }}>{p.overallScore}</span>
                      ) : (
                        <span className="w-9 flex justify-center text-muted"><Circle size={12} /></span>
                      )}
                      <span className="text-xs text-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                      <span className="ml-auto text-[10px] text-muted">{done ? "" : t(`vastu.analysis.status.${p.status}`, p.status)}</span>
                      {done && <ChevronRight size={13} className="text-muted" />}
                    </button>
                    {!inFlight && (confirmDelete === p.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-gold/20 px-2 py-2 text-[10px] text-muted">{t("common.no")}</button>
                        <button onClick={() => { setConfirmDelete(null); props.onDeleteHistory(p); }} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-[10px] font-semibold text-red-400">{t("vastu.history.deleteConfirm")}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(p.id)} aria-label={t("vastu.history.deleteReport")} title={t("vastu.history.deleteReport")} className="rounded-xl border border-gold/12 p-2.5 text-muted hover:text-red-400 hover:border-red-500/30 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

const STAGES = [
  { key: "reading", after: 0, label: "Reading your floor plan" },
  { key: "directions", after: 3_000, label: "Checking room directions" },
  { key: "entrance", after: 7_000, label: "Checking the entrance and centre" },
  { key: "chart", after: 14_000, label: "Personalising with the birth chart" },
  { key: "remedies", after: 35_000, label: "Preparing remedies" },
] as const;

function Progress({ startedAt, slow }: { startedAt: number | null; slow: boolean }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = startedAt ? now - startedAt : 0;
  const current = STAGES.reduce((acc, s, i) => (elapsed >= s.after ? i : acc), 0);
  return (
    <div className="flex flex-col gap-3" data-testid="vastu-progress">
      <p className="flex items-center gap-2 text-sm font-semibold text-gold"><Sparkles size={15} /> {t("vastu.report.preparing", "Preparing your Vastu report")}</p>
      <ol className="flex flex-col gap-1.5">
        {STAGES.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-2 text-[12.5px] ${i < current ? "text-foreground/85" : i === current ? "text-foreground" : "text-muted/70"}`}>
            {i < current ? <Check size={14} className="text-emerald-400" /> : i === current ? <Loader2 size={14} className="animate-spin text-gold" /> : <Circle size={12} className="mx-[1px]" />}
            {t(`vastu.report.stage.${s.key}`, s.label)}
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted">{t("vastu.report.canLeave", "You can leave this page — the report is saved to your history when it's ready.")}</p>
      {slow && (
        <p className="text-[11px] text-amber-400" role="status" data-testid="vastu-still-working">{t("vastu.analysis.stillWorking")}</p>
      )}
    </div>
  );
}

function GenerateCTA({ hasRooms, reportReady, balancePaise, costPaise, aiLoading, aiStartedAt, aiError, aiSlow, aiNotice, onGenerate, profileName }: {
  hasRooms: boolean; reportReady: boolean; balancePaise: number; costPaise: number; aiLoading: boolean; aiStartedAt: number | null; aiError: string | null; aiSlow: boolean; aiNotice: string | null; onGenerate: () => void; profileName: string;
}) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const insufficient = balancePaise < costPaise;
  const includes = [
    t("vastu.report.inc.chart", "How this home suits {{name}}'s birth chart", { name: profileName }),
    t("vastu.report.inc.rooms", "Room-by-room interpretation"),
    t("vastu.report.inc.remedies", "Practical remedies, no rebuilding"),
    t("vastu.report.inc.priority", "Priority actions and element balance"),
  ];

  return (
    <section className="rounded-3xl border border-gold/25 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(223,181,100,0.12),transparent_55%)] bg-card p-4" data-testid="vastu-report-card">
      {aiLoading ? (
        <Progress startedAt={aiStartedAt} slow={aiSlow} />
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <Eyebrow>{t("vastu.analysis.reportTitle")}</Eyebrow>
              <p className="mt-1 text-[15px] font-display text-foreground leading-snug">{t("vastu.report.pitch", "Personalised to this floor plan and {{name}}", { name: profileName })}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-2xl text-gold leading-none" data-testid="vastu-report-price">{formatRupees(costPaise)}</p>
              <p className="text-[10px] text-muted mt-1">{t("vastu.report.perReport", "one report")}</p>
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-1">
            {includes.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[12px] text-foreground/85"><Check size={13} className="text-gold" /> {s}</li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <Wallet size={12} /> {t("vastu.report.balance", "Wallet balance {{amount}}", { amount: formatRupees(balancePaise) })}
          </div>

          <div className="mt-3">
            {insufficient || aiError === "INSUFFICIENT_CREDITS" ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-amber-400 text-center">{t("vastu.analysis.notEnough", { cost: formatRupees(costPaise), amount: formatRupees(balancePaise) })}</p>
                <Link href="/payment" className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold">
                  {t("vastu.analysis.getCredits")}
                </Link>
              </div>
            ) : confirming ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-gold/20 bg-surface p-3">
                <p className="text-sm text-foreground text-center">{t("vastu.analysis.confirmSpend", { cost: formatRupees(costPaise) })}</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border border-gold/20 text-muted px-4 py-2.5 text-sm font-medium">{t("common.no")}</button>
                  <button onClick={() => { setConfirming(false); onGenerate(); }} className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-4 py-2.5 text-sm font-bold">{t("vastu.analysis.confirmYes")}</button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => { track("vastu_report_cta"); setConfirming(true); }} disabled={!reportReady} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold text-[#1a0e00] px-4 py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-10px_rgba(223,181,100,0.7)]">
                  <Sparkles size={15} /> {t("vastu.report.generate", "Generate report")}
                </button>
                {!hasRooms ? (
                  <p className="mt-2 text-[11px] text-muted text-center">{t("vastu.analysis.empty")}</p>
                ) : !reportReady ? (
                  <p className="mt-2 text-[11px] text-amber-400 text-center">{t("vastu.reportErrors.invalidPlan")}</p>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
      {aiError && aiError !== "INSUFFICIENT_CREDITS" && !aiLoading && <p className="mt-2 text-[11px] text-red-400 text-center" role="alert">{aiError}</p>}
      {!aiLoading && aiNotice && (
        <p className="mt-2 text-[11px] text-amber-400 text-center" role="status" data-testid="vastu-still-working">{aiNotice}</p>
      )}
    </section>
  );
}

function Section({ icon, title, source, children, testId }: { icon: React.ReactNode; title: string; source?: string; children: React.ReactNode; testId?: string }) {
  return (
    <div data-testid={testId}>
      <div className="flex items-center gap-1.5 mb-2 text-gold">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{title}</span>
        {source && <span className="ml-auto text-[9.5px] rounded-full border border-gold/20 px-1.5 py-0.5 text-muted normal-case tracking-normal">{source}</span>}
      </div>
      {children}
    </div>
  );
}
function Bullets({ items, color = "text-gold" }: { items?: string[]; color?: string }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-foreground/85 leading-relaxed"><span className={color}>•</span><span>{s}</span></li>
      ))}
    </ul>
  );
}

function RoomCard({ rm, onShowRoom }: { rm: RoomAnalysisEntry; onShowRoom?: (key: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const key = rm.roomId ?? rm.room ?? "";
  return (
    <div className="rounded-2xl border border-gold/12 bg-surface">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left" aria-expanded={open}>
        <span className="text-[13px] font-semibold text-foreground capitalize">{t(`vastu.rooms.${rm.room}`, rm.room ?? "")}</span>
        {rm.currentPlacement && <span className="text-[11px] font-mono text-muted">{rm.currentPlacement}</span>}
        {rm.assessment && <span className={`text-[10.5px] font-semibold ${rm.assessment === "ideal" ? "text-emerald-400" : rm.assessment === "acceptable" ? "text-lime-400" : rm.assessment === "harmful" ? "text-red-400" : "text-amber-400"}`}>{t(`vastu.rating.${rm.assessment}`, rm.assessment)}</span>}
        <ChevronDown size={14} className={`ml-auto text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-col gap-1.5">
          {rm.impact && <p className="text-[12.5px] text-foreground/85"><b className="text-muted">{t("vastu.analysis.impact")}:</b> {rm.impact}</p>}
          {rm.remedy && <p className="text-[12.5px] text-emerald-400/90"><b>{t("vastu.analysis.remedy")}:</b> {rm.remedy}</p>}
          <Bullets items={rm.highlights} />
          {onShowRoom && key && (
            <button onClick={() => onShowRoom(key)} className="self-start mt-1 flex items-center gap-1.5 rounded-xl border border-gold/30 px-2.5 py-1.5 text-[11.5px] font-semibold text-gold">
              <Crosshair size={12} /> {t("vastu.report.showOnPlan", "Show on plan")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type ReportTab = "overview" | "rooms" | "remedies" | "astro";

/** Overview | Rooms | Remedies | Astro — the report in four short pages instead of one long one. */
function ReportTabs({ tabs, tab, onTab }: { tabs: { id: ReportTab; label: string }[]; tab: ReportTab; onTab: (t: ReportTab) => void }) {
  return (
    <div className="flex gap-1 rounded-full border border-gold/15 bg-background/60 p-1" role="tablist" data-testid="vastu-report-tabs">
      {tabs.map((x) => (
        <button
          key={x.id}
          role="tab"
          aria-selected={tab === x.id}
          onClick={() => onTab(x.id)}
          className={`relative flex-1 rounded-full px-2 py-1.5 text-[11.5px] font-bold transition-colors ${tab === x.id ? "text-[#1a0e00]" : "text-muted"}`}
        >
          {tab === x.id && <motion.span layoutId="vastu-report-tab" className="absolute inset-0 -z-0 rounded-full bg-gold" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{x.label}</span>
        </button>
      ))}
    </div>
  );
}

function AiResult({ result, profileName, canAsk, onAsk, asking, askError, onOpenPlan, onShowRoom }: {
  result: VastuAiResult; profileName: string; canAsk: boolean; onAsk: (q: string) => void; asking: boolean; askError: string | null; onOpenPlan?: () => void; onShowRoom?: (key: string) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState<ReportTab>("overview");
  const summary = Array.isArray(result.summary) ? result.summary : [];
  const rooms = Array.isArray(result.roomAnalysis) ? result.roomAnalysis : [];
  const elements = result.elementBalance ?? {};
  const rem = result.remedies ?? {};
  const dg = result.directionGuidance ?? {};
  const followUp = result.followUp;
  const score = typeof result.overallVastuScore === "number" ? result.overallVastuScore : typeof result.overallScore === "number" ? result.overallScore : null;
  const fromPlan = t("vastu.report.fromPlan", "floor-plan rules");
  const fromChart = t("vastu.report.fromChart", "{{name}}'s chart", { name: profileName });

  return (
    <section className="rounded-3xl border border-gold/20 bg-card p-4 flex flex-col gap-5" data-testid="vastu-report">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Eyebrow>{t("vastu.report.yourHome", "Your home")}</Eyebrow>
          <h3 className="font-display text-lg text-foreground">{t("vastu.analysis.remediesTitle")}</h3>
        </div>
        {score != null && <span className="font-display text-3xl tabular-nums" style={{ color: scoreColor(score) }}>{score}<span className="text-sm text-muted">/100</span></span>}
      </div>

      {onOpenPlan && (
        confirmOpen ? (
          <div className="rounded-2xl border border-gold/20 p-3 flex flex-col gap-2">
            <p className="text-xs text-foreground">{t("vastu.history.openPlanConfirm")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-xl border border-gold/20 text-muted px-3 py-2 text-xs font-medium">{t("common.no")}</button>
              <button onClick={() => { setConfirmOpen(false); onOpenPlan(); }} className="flex-1 rounded-xl bg-gold text-[#1a0e00] px-3 py-2 text-xs font-bold">{t("vastu.history.openPlan")}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmOpen(true)} className="self-start flex items-center gap-1.5 rounded-xl border border-gold/25 px-3 py-2 text-xs font-medium text-gold hover:border-gold/50">
            <PencilRuler size={13} /> {t("vastu.history.openPlan")}
          </button>
        )
      )}

      <ReportTabs
        tabs={[
          { id: "overview", label: t("vastu.report.tab.overview", "Overview") },
          ...(rooms.length ? [{ id: "rooms" as const, label: t("vastu.report.tab.rooms", "Rooms") }] : []),
          { id: "remedies", label: t("vastu.report.tab.remedies", "Remedies") },
          ...(!!result.chartAlignment?.summary ? [{ id: "astro" as const, label: t("vastu.report.tab.astro", "Astro") }] : []),
        ]}
        tab={tab}
        onTab={setTab}
      />

      {tab === "overview" && (
        <div className="flex flex-col gap-5" data-testid="vastu-report-overview">
      {summary.length >= 3 ? (
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3.5 flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-foreground leading-snug">{summary[0]}</p>
          <p className="text-[13px] text-foreground/80">{summary[1]}</p>
          <p className="text-[13px] text-emerald-400">→ {summary[2]}</p>
        </div>
      ) : result.summaryParagraph ? (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{result.summaryParagraph}</p>
      ) : null}

      {Array.isArray(result.criticalDefects) && result.criticalDefects.length > 0 && (
        <Section icon={<AlertTriangle size={14} className="text-red-400" />} title={t("vastu.report.mattersMost", "What matters most")} source={fromPlan}>
          <Bullets items={result.criticalDefects} color="text-red-400" />
        </Section>
      )}

      {Array.isArray(result.priorityActions) && result.priorityActions.length > 0 && (
        <Section icon={<ListChecks size={14} className="text-emerald-400" />} title={t("vastu.analysis.priorityActions")}>
          <ol className="flex flex-col gap-2">
            {result.priorityActions.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] text-foreground/85 leading-relaxed">
                <span className="w-5 h-5 shrink-0 rounded-full bg-gold/15 text-gold text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {result.shapeAnalysis && <Section icon={<Home size={14} />} title={t("vastu.analysis.shapeAnalysis")} source={fromPlan}><p className="text-[13px] text-foreground/85">{result.shapeAnalysis}</p></Section>}

      {Array.isArray(result.positiveAspects) && result.positiveAspects.length > 0 && (
        <Section icon={<CheckCircle2 size={14} className="text-emerald-400" />} title={t("vastu.analysis.positives")}><Bullets items={result.positiveAspects} color="text-emerald-400" /></Section>
      )}

        </div>
      )}
      {tab === "rooms" && (
        <div className="flex flex-col gap-5">
      {rooms.length > 0 && (
        <Section icon={<Home size={14} />} title={t("vastu.analysis.roomByRoom")} source={fromPlan}>
          <div className="flex flex-col gap-2">
            {rooms.map((rm, i) => <RoomCard key={i} rm={rm} onShowRoom={onShowRoom} />)}
          </div>
        </Section>
      )}

        </div>
      )}
      {tab === "remedies" && (
        <div className="flex flex-col gap-5">
      {(rem.nonStructural?.length || rem.plants?.length || rem.mantras?.length || rem.yantras?.length || rem.structural?.length) ? (
        <Section icon={<Sparkles size={14} />} title={t("vastu.analysis.remedies")}>
          <div className="flex flex-col gap-3">
            {([
              ["nonStructural", "Simple changes", "text-gold"],
              ["plants", "Plants", "text-emerald-400"],
              ["mantras", "Mantras", "text-gold"],
              ["yantras", "Yantras", "text-gold"],
              ["structural", "If you renovate", "text-amber-400"],
            ] as const).map(([k, label, color]) => rem[k]?.length ? (
              <div key={k}>
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-muted mb-1 flex items-center gap-1">{k === "plants" && <Leaf size={11} />}{t(`vastu.report.remedy.${k}`, label)}</p>
                <Bullets items={rem[k]} color={color} />
              </div>
            ) : null)}
          </div>
        </Section>
      ) : null}

      {Object.keys(elements).length > 0 && (
        <Section icon={<Wind size={14} />} title={t("vastu.analysis.elementBalance")}>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(elements).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                <span className="text-[12px] font-semibold capitalize text-foreground w-14 shrink-0">{t(`vastu.report.element.${k}`, k)}</span>
                <span className={`text-[11px] font-semibold ${v.status === "balanced" ? "text-emerald-400" : "text-amber-400"}`}>{t(`vastu.report.elementStatus.${v.status}`, v.status ?? "")}</span>
                {v.suggestion && <span className="text-[11.5px] text-muted flex-1">{v.suggestion}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {Object.values(dg).some(Boolean) && (
        <Section icon={<CheckCircle2 size={14} />} title={t("vastu.analysis.directionGuidance")}>
          <div className="grid grid-cols-2 gap-1.5">
            {(["sleeping", "working", "cooking", "studying"] as const).map((k) => dg[k] ? (
              <div key={k} className="rounded-xl bg-surface px-3 py-2">
                <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted">{t(`vastu.analysis.dir_${k}`)}</p>
                <p className="text-[12.5px] text-foreground/85">{dg[k]}</p>
              </div>
            ) : null)}
          </div>
        </Section>
      )}

        </div>
      )}
      {tab === "astro" && (
        <div className="flex flex-col gap-5">
      {/* Astro-Vastu — clearly separated from the plan rules */}
      {result.chartAlignment?.summary && (
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-3.5">
          <Section icon={<Star size={14} />} title={t("vastu.analysis.chartAlignment")} source={fromChart}>
            <p className="text-[13px] text-foreground/85 mb-2 leading-relaxed">{result.chartAlignment.summary}</p>
            <Bullets items={result.chartAlignment.favorableRooms} color="text-emerald-400" />
            <Bullets items={result.chartAlignment.cautions} color="text-amber-400" />
          </Section>
        </div>
      )}

        </div>
      )}

      <p className="text-[10.5px] text-muted">{t("vastu.report.trust", "Guidance in the Vastu tradition, written by AI from your plan's rule-based ratings — not a guarantee of outcomes.")}</p>

      {/* Follow-up question */}
      <div className="border-t border-gold/10 pt-3">
        {followUp ? (
          <div className="rounded-2xl bg-surface p-3">
            <p className="text-xs font-semibold text-gold mb-1">{followUp.question}</p>
            <p className="text-[13px] text-foreground/85 whitespace-pre-line">{followUp.answer}</p>
          </div>
        ) : canAsk ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted">{t("vastu.analysis.askHint")}</p>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("vastu.analysis.askPlaceholder")} className="flex-1 rounded-xl border border-gold/20 bg-surface px-3 py-2.5 text-base text-foreground outline-none focus:border-gold/50" maxLength={500} />
              <button onClick={() => q.trim().length > 1 && onAsk(q.trim())} disabled={asking || q.trim().length < 2} aria-label={t("vastu.report.send", "Send")} className="rounded-xl bg-gold/15 border border-gold/30 text-gold px-3.5 flex items-center justify-center disabled:opacity-40">
                {asking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            {askError && <p className="text-[11px] text-red-400">{askError}</p>}
          </div>
        ) : null}
      </div>
    </section>
  );
}
