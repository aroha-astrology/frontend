"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen, AppWindow, Copy, Trash2, Maximize2, X } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
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
const CREDIT_COST = 5;

function buildPayload(plan: Plan) {
  const roomLayout = buildRoomLayout(plan);
  const roomDetails: Record<string, unknown> = {};
  for (const room of plan.rooms) {
    const doors = room.fixtures.filter((f) => f.kind === "door").map((f) => fixtureFacing(f.wall, plan));
    const windows = room.fixtures.filter((f) => f.kind === "window").map((f) => fixtureFacing(f.wall, plan));
    if (doors.length) roomDetails[`${room.type}_doors`] = doors;
    if (windows.length) roomDetails[`${room.type}_windows`] = windows;
  }
  return { roomLayout, roomDetails, houseShape: plotSummary(plan), layout: plan as unknown as Record<string, unknown> };
}

export default function VastuPlanner() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
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

  // ── Compass (capture-and-hold) ─────────────────────────────────────────────
  const compass = useCompass();
  const [compassHint, setCompassHint] = useState<string | null>(null);
  const onAlign = useCallback(async () => {
    setCompassHint(null);
    const res = await compass.capture();
    if (res.status === "aligned" && res.heading != null) {
      dispatch({ type: "setNorthOffset", deg: res.heading });
    } else if (res.status === "unsupported") {
      setCompassHint(t("vastu.compass.unavailable"));
    } else if (res.status === "denied") {
      setCompassHint(t("vastu.compass.permissionDenied"));
    }
  }, [compass, t]);
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
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { plans } = await api.vastuList();
      setHistory(plans);
    } catch {
      /* best-effort */
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const onGenerate = useCallback(async () => {
    setAiError(null);
    setAiResult(null);
    setActivePlanId(null);
    setAiLoading(true);
    try {
      const { planId } = await api.vastuAnalyze(buildPayload(plan));
      setActivePlanId(planId);
      void refresh(); // balance dropped by 5
      const deadline = Date.now() + 150_000;
      while (Date.now() < deadline) {
        const p = await api.vastuGet(planId);
        if (p.status === "done" && p.analysis) {
          setAiResult(p.analysis as VastuAiResult);
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
  }, [plan, t, loadHistory, refresh]);

  const onAsk = useCallback(async (question: string) => {
    if (!activePlanId) return;
    setAskError(null);
    setAsking(true);
    try {
      const updated = await api.vastuAsk(activePlanId, question);
      if (updated.analysis) setAiResult(updated.analysis as VastuAiResult);
    } catch {
      setAskError(t("vastu.analysis.askError"));
    } finally {
      setAsking(false);
    }
  }, [activePlanId, t]);

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

      <div className="relative rounded-2xl bg-surface/40 border border-gold/10 p-2">
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
          locked={compass.state === "aligned"}
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

      {compassHint && <p className="text-[11px] text-amber-400">{compassHint}</p>}

      <div>
        <p className="text-[11px] text-muted mb-1.5">{t("vastu.palette.hint")}</p>
        <RoomPalette onAdd={(type) => dispatch({ type: "addRoom", roomType: type })} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {fullscreen ? (
        <div className="fixed inset-0 z-[80] bg-background overflow-y-auto px-3 pt-3 pb-24">{editor}</div>
      ) : (
        <Card className="p-4">{editor}</Card>
      )}

      <AnalysisPanel
        analysis={analysis}
        signedIn={!!user}
        credits={user?.credits ?? 0}
        cost={CREDIT_COST}
        aiLoading={aiLoading}
        aiResult={aiResult}
        aiError={aiError}
        onGenerate={onGenerate}
        history={history}
        onViewHistory={onViewHistory}
        canAsk={!!activePlanId}
        onAsk={onAsk}
        asking={asking}
        askError={askError}
      />
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
