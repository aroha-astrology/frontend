"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen, AppWindow, Copy, Trash2, Maximize2, X, Cloud, CloudOff, Loader2, AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
import { useFeature } from "@/hooks/useFeature";
import { api, type VastuPlan } from "@/lib/api";
import { reportErrorKey } from "@/lib/vastu/errors";
import { getRoomType } from "@/lib/vastu/data";
import { analyzePlan } from "@/lib/vastu/analysis";
import { buildRoomLayout, fixtureFacing, plotSummary, bbox, roomDirection } from "@/lib/vastu/geometry";
import { validatePlan } from "@/lib/vastu/validation";
import type { Plan } from "@/lib/vastu/types";
import { planReducer, initialPlan, samplePlan, normalizePlan } from "./planState";
import PlanCanvas from "./PlanCanvas";
import RoomPalette from "./RoomPalette";
import Toolbar from "./Toolbar";
import AnalysisPanel, { type VastuAiResult } from "./AnalysisPanel";
import { useCompass } from "./useCompass";
import { useHomeSync, type SaveStatus } from "./useHomeSync";

/** The usual wait ("up to 2 min") — past this the panel says the report is still being written. */
const SLOW_AFTER_MS = 150_000;
/** The server reaps (and refunds) a plan stuck processing after 5 minutes — wait a bit past that. */
const WAIT_MS = 6 * 60_000;

function buildPayload(plan: Plan, language: string, homeId?: string) {
  const roomLayout = buildRoomLayout(plan);
  // One entry per room, keyed by the room's own id — two bathrooms stay two bathrooms
  // (a type-keyed map let the second overwrite the first's doors and windows).
  const rooms = plan.rooms.map((room) => ({
    id: room.id,
    type: room.type,
    direction: roomDirection(room, plan),
    doors: room.fixtures.filter((f) => f.kind === "door").map((f) => fixtureFacing(f.wall, plan)),
    windows: room.fixtures.filter((f) => f.kind === "window").map((f) => fixtureFacing(f.wall, plan)),
  }));
  return {
    roomLayout,
    roomDetails: { rooms },
    houseShape: plotSummary(plan),
    layout: plan as unknown as Record<string, unknown>,
    language,
    ...(homeId ? { homeId } : {}),
  };
}

export default function VastuPlanner() {
  const { t, i18n } = useTranslation();
  const { user, profiles, activeProfile, refresh } = useAuth();
  const paidVastu = useFeature("paid.vastu");
  const CREDIT_COST_PAISE = paidVastu.pricePaise ?? 5000;
  const [plan, dispatch] = useReducer(planReducer, undefined, initialPlan);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // ── Compass (live device heading, lock to freeze) ──────────────────────────
  const compass = useCompass();
  const [compassHint, setCompassHint] = useState<string | null>(null);
  const onAlign = useCallback(async () => {
    setCompassHint(null);
    const status = await compass.start();
    if (status === "unsupported") setCompassHint(t("vastu.compass.unavailable"));
    else if (status === "denied") setCompassHint(t("vastu.compass.permissionDenied"));
  }, [compass, t]);
  useEffect(() => {
    if (compass.state === "reading" && compass.heading != null) {
      dispatch({ type: "setNorthOffset", deg: compass.heading });
    }
  }, [compass.state, compass.heading]);
  const onLock = useCallback(() => compass.lock(), [compass]);
  const onRecalibrate = useCallback(() => {
    setCompassHint(null);
    compass.recalibrate();
  }, [compass]);
  const onRotate = useCallback((deg: number) => {
    compass.reset();
    dispatch({ type: "setNorthOffset", deg });
  }, [compass]);

  // ── Live analysis (offline, free) ──────────────────────────────────────────
  const analysis = useMemo(() => analyzePlan(plan), [plan]);
  const validation = useMemo(() => validatePlan(plan), [plan]);

  // ── Saved to the account, per profile (device draft + server copy) ─────────
  // Scope waits for the profile list, so a plan is never saved under the wrong profile.
  const scope = user && profiles !== null ? `${user.id}:${activeProfile?.id ?? "primary"}` : null;
  const { status: saveStatus, home } = useHomeSync({
    scope,
    signedIn: !!user,
    plan,
    score: analysis.overallScore,
    dispatch,
    defaultName: t("vastu.home.defaultName"),
  });
  const ratingById = useMemo(() => Object.fromEntries(analysis.rooms.map((r) => [r.roomId, r])), [analysis]);
  const labelForType = useCallback((type: string) => t(getRoomType(type)?.labelKey ?? type, getRoomType(type)?.label ?? type), [t]);
  const colorForType = useCallback((type: string) => getRoomType(type)?.color ?? "#94a3b8", []);

  // ── AI report (5 credits) + follow-up ──────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<VastuAiResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // Past SLOW_AFTER_MS the report is still being written: say so (it will land in the
  // history list) instead of an error that invites paying again.
  const [aiSlow, setAiSlow] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const mountedRef = useRef(true);
  /** The report whose status this screen is currently waiting on. */
  const trackedPlanRef = useRef<string | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  /** Layout of the history report being viewed, for "Open this plan". */
  const [viewedLayout, setViewedLayout] = useState<Plan | null>(null);
  const [history, setHistory] = useState<VastuPlan[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const { plans } = await api.vastuList(i18n.language);
      setHistory(plans);
    } catch {
      /* best-effort */
    } finally {
      setHistoryLoading(false);
    }
  }, [user, i18n.language]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // A generated report or in-flight AI state belongs to whichever profile was
  // active when it was created — clear it on switch so a stale report from a
  // different resident doesn't linger under the new profile's history list.
  const activeProfileIdRef = useRef<string | null>(activeProfile?.id ?? null);
  useEffect(() => {
    activeProfileIdRef.current = activeProfile?.id ?? null;
    setAiResult(null);
    setActivePlanId(null);
    setViewedLayout(null);
    setAiError(null);
    setAiNotice(null);
    setAskError(null);
    // Stop waiting on the old profile's report (it still lands in that profile's history).
    trackedPlanRef.current = null;
    setAiLoading(false);
    setAiSlow(false);
  }, [activeProfile?.id]);

  // A plan still queued/processing (e.g. one that outlasted the wait below) lands in
  // history on its own — check back while any is unfinished.
  const historyPending = history.some((p) => p.status === "pending" || p.status === "processing");
  useEffect(() => {
    if (!historyPending || aiLoading) return;
    const id = setTimeout(() => void loadHistory(), 15_000);
    return () => clearTimeout(id);
  }, [historyPending, aiLoading, history, loadHistory]);

  /**
   * Wait for one report to finish. Used right after buying and to pick up a report that was
   * still being written when the page was left or reloaded — the charge already happened
   * server-side, so this never implies failure just because the wait ends.
   */
  const waitForPlan = useCallback(async (planId: string, generationProfileId: string | null, startedAt: number) => {
    trackedPlanRef.current = planId;
    setActivePlanId(planId);
    setViewedLayout(null);
    setAiLoading(true);
    setAiSlow(false);
    try {
      const deadline = startedAt + WAIT_MS;
      while (Date.now() < deadline) {
        if (!mountedRef.current || trackedPlanRef.current !== planId) return;
        if (Date.now() - startedAt > SLOW_AFTER_MS) setAiSlow(true);
        let p: VastuPlan | null = null;
        try {
          p = await api.vastuGet(planId, i18n.language);
        } catch {
          // One dropped status check (flaky network, app backgrounded) doesn't end the wait.
        }
        if (p?.status === "done" && p.analysis) {
          // The user may have switched profiles while this was in flight —
          // don't paint a report generated for a different resident.
          if (activeProfileIdRef.current === generationProfileId) {
            setAiResult(p.analysis as VastuAiResult);
          }
          void loadHistory();
          void refresh();
          return;
        }
        if (p?.status === "error") {
          // Charged at the start and refunded by the server on failure.
          setAiError(t("vastu.analysis.failedRefunded"));
          void loadHistory();
          void refresh();
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      // Still working on the server: it will show up in the history list.
      setAiNotice(t("vastu.analysis.stillWorking"));
      void loadHistory();
    } finally {
      if (trackedPlanRef.current === planId) {
        setAiLoading(false);
        setAiSlow(false);
      }
    }
  }, [t, i18n.language, loadHistory, refresh]);

  const onGenerate = useCallback(async () => {
    const generationProfileId = activeProfileIdRef.current;
    setAiError(null);
    setAiNotice(null);
    setAiSlow(false);
    setAiResult(null);
    setActivePlanId(null);
    setViewedLayout(null);
    setAiLoading(true);
    let planId: string;
    try {
      ({ planId } = await api.vastuAnalyze(buildPayload(plan, i18n.language, home?.id)));
    } catch (e) {
      const key = reportErrorKey(e);
      setAiError(key === "INSUFFICIENT_CREDITS" ? key : t(key));
      setAiLoading(false);
      void refresh();
      return;
    }
    void refresh(); // balance dropped
    await waitForPlan(planId, generationProfileId, Date.now());
  }, [plan, t, i18n.language, home?.id, refresh, waitForPlan]);

  // A report still being written when the page was left or reloaded: pick the wait back up
  // instead of leaving the user unsure whether they paid for nothing.
  useEffect(() => {
    if (aiLoading) return;
    const newest = history[0];
    if (!newest || (newest.status !== "pending" && newest.status !== "processing")) return;
    if (trackedPlanRef.current === newest.id) return;
    const startedAt = Date.parse(newest.createdAt);
    if (!(Date.now() - startedAt < WAIT_MS)) return;
    setAiError(null);
    setAiNotice(null);
    setAiResult(null);
    void waitForPlan(newest.id, activeProfileIdRef.current, startedAt);
  }, [history, aiLoading, waitForPlan]);

  const onAsk = useCallback(async (question: string) => {
    if (!activePlanId) return;
    setAskError(null);
    setAsking(true);
    try {
      const updated = await api.vastuAsk(activePlanId, question, i18n.language);
      if (updated.analysis) setAiResult(updated.analysis as VastuAiResult);
    } catch {
      setAskError(t("vastu.analysis.askError"));
    } finally {
      setAsking(false);
    }
  }, [activePlanId, t, i18n.language]);

  const onViewHistory = useCallback(async (p: VastuPlan) => {
    if (!p.analysis) return;
    // Show the list copy at once, then swap in this one report in the current language
    // (the list itself never translates).
    setAiResult(p.analysis as VastuAiResult);
    setActivePlanId(p.id);
    setAiError(null);
    setAiNotice(null);
    setViewedLayout(p.layout ? normalizePlan(p.layout) : null);
    if (p.language && p.language !== i18n.language) {
      try {
        const full = await api.vastuGet(p.id, i18n.language);
        if (full.analysis) setAiResult(full.analysis as VastuAiResult);
      } catch {
        /* keep the untranslated copy */
      }
    }
  }, [i18n.language]);

  const onOpenPlan = useCallback(() => {
    if (!viewedLayout) return;
    dispatch({ type: "load", plan: viewedLayout });
    setSelectedId(null);
    setViewedLayout(null);
  }, [viewedLayout]);

  const onDeleteHistory = useCallback(async (p: VastuPlan) => {
    try {
      await api.vastuDelete(p.id);
      setHistory((h) => h.filter((x) => x.id !== p.id));
      if (activePlanId === p.id) {
        setAiResult(null);
        setActivePlanId(null);
        setViewedLayout(null);
      }
    } catch {
      setAiError(t("vastu.history.deleteError"));
    }
  }, [activePlanId, t]);

  const selectedRoom = plan.rooms.find((r) => r.id === selectedId) ?? null;

  const editor = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-semibold text-foreground truncate">{home?.name ?? t("vastu.home.defaultName")}</span>
        <SaveBadge status={saveStatus} />
      </div>
      <Toolbar
        northOffsetDeg={plan.northOffsetDeg}
        onRotate={onRotate}
        compassState={compass.state}
        onAlign={onAlign}
        onLock={onLock}
        onRecalibrate={onRecalibrate}
        sides={plan.plot.length}
        onSides={(n) => dispatch({ type: "setSides", sides: n })}
        widthU={Math.round(bbox(plan.plot).w)}
        heightU={Math.round(bbox(plan.plot).h)}
        onScale={(w, h) => dispatch({ type: "scalePlot", widthU: w, heightU: h })}
        onReset={() => {
          dispatch({ type: "load", plan: samplePlan() });
          setSelectedId(null);
          setAiResult(null);
          setActivePlanId(null);
          setViewedLayout(null);
        }}
      />

      <div className="relative rounded-2xl bg-surface/40 border border-gold/10 p-2" data-tour="vastu-canvas">
        <button
          onClick={() => setFullscreen((f) => !f)}
          aria-label={t(fullscreen ? "vastu.toolbar.collapse" : "vastu.toolbar.expand")}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-card/80 border border-gold/25 text-gold flex items-center justify-center backdrop-blur"
        >
          {fullscreen ? <X size={16} /> : <Maximize2 size={16} />}
        </button>
        <PlanCanvas
          plan={plan}
          ratingById={ratingById}
          issuesById={validation.roomIssues}
          labelForType={labelForType}
          colorForType={colorForType}
          selectedId={selectedId}
          onSelect={setSelectedId}
          dispatch={dispatch}
          locked={compass.state === "locked"}
        />
      </div>

      <ValidationNotes plotInvalid={validation.plotInvalid} outside={validation.outsideCount} overlap={validation.overlapCount} />

      {selectedRoom ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            {getRoomType(selectedRoom.type)?.emoji} {labelForType(selectedRoom.type)}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <ActionBtn icon={<DoorOpen size={14} />} label={t("vastu.fixture.addDoor")} onClick={() => dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "door" })} />
            <ActionBtn icon={<AppWindow size={14} />} label={t("vastu.fixture.addWindow")} onClick={() => dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "window" })} />
            <ActionBtn icon={<Copy size={14} />} label={t("vastu.block.duplicate")} onClick={() => dispatch({ type: "duplicateRoom", id: selectedRoom.id })} />
            <ActionBtn icon={<Trash2 size={14} />} label={t("vastu.block.delete")} danger onClick={() => { dispatch({ type: "deleteRoom", id: selectedRoom.id }); setSelectedId(null); }} />
          </div>
        </div>
      ) : null}

      {(compassHint || compass.state === "reading") && (
        <p className="text-[11px] text-amber-400">
          {compassHint ?? t("vastu.compass.locking")}
        </p>
      )}

      <div>
        <p className="text-[11px] text-muted mb-1.5">{t("vastu.palette.hint")}</p>
        <div data-tour="vastu-palette">
          <RoomPalette onAdd={(type) => dispatch({ type: "addRoom", roomType: type })} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {fullscreen ? (
        // Sits above the nav bar (z-50), so pb clears the system bar, not the nav.
        <div className="fixed inset-0 z-[80] bg-background overflow-y-auto px-3 pt-3 pb-[calc(6rem+var(--sab))]">{editor}</div>
      ) : (
        <Card className="p-4">{editor}</Card>
      )}

      <div data-tour="vastu-analysis">
      <AnalysisPanel
        analysis={analysis}
        reportEnabled={paidVastu.enabled}
        reportReady={validation.reportReady}
        balancePaise={user?.walletBalancePaise ?? 0}
        costPaise={CREDIT_COST_PAISE}
        aiLoading={aiLoading}
        aiResult={aiResult}
        aiError={aiError}
        aiSlow={aiSlow}
        aiNotice={aiNotice}
        onGenerate={onGenerate}
        history={history}
        historyLoading={historyLoading}
        profileName={activeProfile?.displayName?.trim() || t("profileSwitcher.unnamed")}
        onViewHistory={(p) => void onViewHistory(p)}
        onDeleteHistory={(p) => void onDeleteHistory(p)}
        onOpenPlan={viewedLayout ? onOpenPlan : undefined}
        canAsk={!!activePlanId}
        onAsk={onAsk}
        asking={asking}
        askError={askError}
      />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={"flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors " + (danger ? "border-red-500/25 text-red-400 hover:bg-red-500/10" : "border-gold/20 text-muted hover:text-gold hover:border-gold/40")}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  if (status === "idle") return null;
  const map = {
    saving: { icon: <Loader2 size={11} className="animate-spin" />, cls: "text-muted", key: "vastu.save.saving" },
    saved: { icon: <Cloud size={11} />, cls: "text-emerald-400", key: "vastu.save.saved" },
    offline: { icon: <CloudOff size={11} />, cls: "text-amber-400", key: "vastu.save.offline" },
    error: { icon: <CloudOff size={11} />, cls: "text-red-400", key: "vastu.save.error" },
  } as const;
  const m = map[status];
  return (
    <span className={`ml-auto flex items-center gap-1 ${m.cls}`} role="status" data-testid="vastu-save-status">
      {m.icon} {t(m.key)}
    </span>
  );
}

function ValidationNotes({ plotInvalid, outside, overlap }: { plotInvalid: boolean; outside: number; overlap: number }) {
  const { t } = useTranslation();
  if (!plotInvalid && !outside && !overlap) return null;
  return (
    <div className="flex flex-col gap-1" data-testid="vastu-validation">
      {plotInvalid ? (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400"><X size={12} /> {t("vastu.validation.plotInvalid")}</p>
      ) : outside > 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400"><X size={12} /> {t("vastu.validation.outside", { count: outside })}</p>
      ) : null}
      {overlap > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-400"><AlertTriangle size={12} /> {t("vastu.validation.overlap")}</p>
      )}
    </div>
  );
}
