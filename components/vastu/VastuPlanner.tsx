"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen, AppWindow, Copy, Trash2, Maximize2, X } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
import { useFeature } from "@/hooks/useFeature";
import { api, type VastuPlan } from "@/lib/api";
import { getRoomType } from "@/lib/vastu/data";
import { analyzePlan } from "@/lib/vastu/analysis";
import { buildRoomLayout, fixtureFacing, plotSummary, bbox } from "@/lib/vastu/geometry";
import type { Plan } from "@/lib/vastu/types";
import { planReducer, initialPlan, samplePlan } from "./planState";
import PlanCanvas from "./PlanCanvas";
import RoomPalette from "./RoomPalette";
import Toolbar from "./Toolbar";
import AnalysisPanel, { type VastuAiResult } from "./AnalysisPanel";
import { useCompass } from "./useCompass";

const STORAGE_KEY = "vastu_plan";

function buildPayload(plan: Plan, language: string) {
  const roomLayout = buildRoomLayout(plan);
  const roomDetails: Record<string, unknown> = {};
  for (const room of plan.rooms) {
    const doors = room.fixtures.filter((f) => f.kind === "door").map((f) => fixtureFacing(f.wall, plan));
    const windows = room.fixtures.filter((f) => f.kind === "window").map((f) => fixtureFacing(f.wall, plan));
    if (doors.length) roomDetails[`${room.type}_doors`] = doors;
    if (windows.length) roomDetails[`${room.type}_windows`] = windows;
  }
  return { roomLayout, roomDetails, houseShape: plotSummary(plan), layout: plan as unknown as Record<string, unknown>, language };
}

export default function VastuPlanner() {
  const { t, i18n } = useTranslation();
  const { user, activeProfile, refresh } = useAuth();
  const CREDIT_COST_PAISE = useFeature("paid.vastu").pricePaise ?? 5000;
  const [plan, dispatch] = useReducer(planReducer, undefined, initialPlan);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      dispatch({ type: "load", plan: raw ? (JSON.parse(raw) as Plan) : samplePlan() });
    } catch {
      dispatch({ type: "load", plan: samplePlan() });
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      /* ignore */
    }
  }, [plan]);

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
  const ratingById = useMemo(() => Object.fromEntries(analysis.rooms.map((r) => [r.roomId, r])), [analysis]);
  const labelForType = useCallback((type: string) => t(getRoomType(type)?.labelKey ?? type, getRoomType(type)?.label ?? type), [t]);
  const colorForType = useCallback((type: string) => getRoomType(type)?.color ?? "#94a3b8", []);

  // ── AI report (5 credits) + follow-up ──────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<VastuAiResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
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
    setAiError(null);
    setAskError(null);
  }, [activeProfile?.id]);

  const onGenerate = useCallback(async () => {
    const generationProfileId = activeProfileIdRef.current;
    setAiError(null);
    setAiResult(null);
    setActivePlanId(null);
    setAiLoading(true);
    try {
      const { planId } = await api.vastuAnalyze(buildPayload(plan, i18n.language));
      setActivePlanId(planId);
      void refresh(); // balance dropped by 5
      const deadline = Date.now() + 150_000;
      while (Date.now() < deadline) {
        const p = await api.vastuGet(planId, i18n.language);
        if (p.status === "done" && p.analysis) {
          // The user may have switched profiles while this was in flight —
          // don't paint a report generated for a different resident.
          if (activeProfileIdRef.current === generationProfileId) {
            setAiResult(p.analysis as VastuAiResult);
          }
          void loadHistory();
          void refresh();
          return;
        }
        if (p.status === "error") throw new Error("failed");
        await new Promise((r) => setTimeout(r, 2500));
      }
      throw new Error("timeout");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setAiError(msg === "INSUFFICIENT_CREDITS" ? "INSUFFICIENT_CREDITS" : t("vastu.analysis.error"));
      void refresh();
    } finally {
      setAiLoading(false);
    }
  }, [plan, t, i18n.language, loadHistory, refresh]);

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

  const onViewHistory = useCallback((p: VastuPlan) => {
    if (p.analysis) {
      setAiResult(p.analysis as VastuAiResult);
      setActivePlanId(p.id);
      setAiError(null);
    }
  }, []);

  const selectedRoom = plan.rooms.find((r) => r.id === selectedId) ?? null;

  const editor = (
    <div className="flex flex-col gap-3">
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
          labelForType={labelForType}
          colorForType={colorForType}
          selectedId={selectedId}
          onSelect={setSelectedId}
          dispatch={dispatch}
          locked={compass.state === "locked"}
        />
      </div>

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
      ) : (
        <p className="text-[11px] text-muted">{t("vastu.onboarding.step1")}</p>
      )}

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
        signedIn={!!user}
        balancePaise={user?.walletBalancePaise ?? 0}
        costPaise={CREDIT_COST_PAISE}
        aiLoading={aiLoading}
        aiResult={aiResult}
        aiError={aiError}
        onGenerate={onGenerate}
        history={history}
        historyLoading={historyLoading}
        profileName={activeProfile?.displayName?.trim() || t("profileSwitcher.unnamed")}
        onViewHistory={onViewHistory}
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
