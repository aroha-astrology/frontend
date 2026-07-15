"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DoorOpen, AppWindow, Copy, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/providers/auth-provider";
import { api, type VastuPlan } from "@/lib/api";
import { getRoomType } from "@/lib/vastu/data";
import { analyzePlan } from "@/lib/vastu/analysis";
import { buildRoomLayout, fixtureFacing } from "@/lib/vastu/geometry";
import type { Plan } from "@/lib/vastu/types";
import { planReducer, initialPlan, samplePlan } from "./planState";
import PlanCanvas from "./PlanCanvas";
import RoomPalette from "./RoomPalette";
import Toolbar from "./Toolbar";
import AnalysisPanel, { type VastuAiResult } from "./AnalysisPanel";
import { useCompass } from "./useCompass";

const STORAGE_KEY = "vastu_plan";

function buildPayload(plan: Plan) {
  const roomLayout = buildRoomLayout(plan);
  const roomDetails: Record<string, unknown> = {};
  for (const room of plan.rooms) {
    const doors = room.fixtures.filter((f) => f.kind === "door").map((f) => fixtureFacing(f.wall, plan));
    const windows = room.fixtures.filter((f) => f.kind === "window").map((f) => fixtureFacing(f.wall, plan));
    if (doors.length) roomDetails[`${room.type}_doors`] = doors;
    if (windows.length) roomDetails[`${room.type}_windows`] = windows;
  }
  return { roomLayout, roomDetails };
}

export default function VastuPlanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [plan, dispatch] = useReducer(planReducer, undefined, initialPlan);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const loaded = useRef(false);

  // Load persisted plan (or a sample) after mount — keeps SSR deterministic.
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
      /* ignore quota / private-mode errors */
    }
  }, [plan]);

  // ── Compass ──────────────────────────────────────────────────────────────
  const onHeading = useCallback((deg: number) => dispatch({ type: "setNorthOffset", deg }), []);
  const compass = useCompass(onHeading);
  const compassActive = compass.status === "active";
  const [compassHint, setCompassHint] = useState<string | null>(null);

  const onCompassToggle = useCallback(async () => {
    if (compassActive) {
      compass.stop();
      return;
    }
    const res = await compass.start();
    setCompassHint(
      res === "unsupported"
        ? t("vastu.compass.unavailable")
        : res === "denied"
          ? t("vastu.compass.permissionDenied")
          : null,
    );
  }, [compassActive, compass, t]);

  const onRotate = useCallback(
    (deg: number) => {
      if (compassActive) compass.stop();
      dispatch({ type: "setNorthOffset", deg });
    },
    [compassActive, compass],
  );

  // ── Analysis (live, offline) ───────────────────────────────────────────────
  const analysis = useMemo(() => analyzePlan(plan), [plan]);
  const ratingById = useMemo(
    () => Object.fromEntries(analysis.rooms.map((r) => [r.roomId, r])),
    [analysis],
  );
  const labelForType = useCallback(
    (type: string) => t(getRoomType(type)?.labelKey ?? type, getRoomType(type)?.label ?? type),
    [t],
  );
  const colorForType = useCallback((type: string) => getRoomType(type)?.color ?? "#94a3b8", []);

  // ── AI remedies ─────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<VastuAiResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [history, setHistory] = useState<VastuPlan[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { plans } = await api.vastuList();
      setHistory(plans);
    } catch {
      /* history is best-effort */
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const onGetRemedies = useCallback(async () => {
    setAiError(null);
    setAiResult(null);
    setAiLoading(true);
    try {
      const { planId } = await api.vastuAnalyze(buildPayload(plan));
      const deadline = Date.now() + 150_000;
      while (Date.now() < deadline) {
        const p = await api.vastuGet(planId);
        if (p.status === "done" && p.analysis) {
          setAiResult(p.analysis as VastuAiResult);
          void loadHistory();
          return;
        }
        if (p.status === "error") throw new Error("failed");
        await new Promise((r) => setTimeout(r, 2500));
      }
      throw new Error("timeout");
    } catch {
      setAiError(t("vastu.analysis.error"));
    } finally {
      setAiLoading(false);
    }
  }, [plan, t, loadHistory]);

  const selectedRoom = plan.rooms.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-3">
        <Toolbar
          northOffsetDeg={plan.northOffsetDeg}
          onRotate={onRotate}
          compassActive={compassActive}
          onCompassToggle={onCompassToggle}
          widthU={plan.widthU}
          heightU={plan.heightU}
          onHouseSize={(w, h) => dispatch({ type: "setHouseSize", widthU: w, heightU: h })}
          onReset={() => {
            dispatch({ type: "load", plan: samplePlan() });
            setSelectedId(null);
            setAiResult(null);
          }}
        />

        <div className="rounded-2xl bg-surface/40 border border-gold/10 p-2">
          <PlanCanvas
            plan={plan}
            ratingById={ratingById}
            labelForType={labelForType}
            colorForType={colorForType}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dispatch={dispatch}
            locked={compassActive}
          />
        </div>

        {/* Selected-room actions */}
        {selectedRoom ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
              {getRoomType(selectedRoom.type)?.emoji} {labelForType(selectedRoom.type)}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              <ActionBtn
                icon={<DoorOpen size={14} />}
                label={t("vastu.fixture.addDoor")}
                onClick={() => dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "door" })}
              />
              <ActionBtn
                icon={<AppWindow size={14} />}
                label={t("vastu.fixture.addWindow")}
                onClick={() => dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "window" })}
              />
              <ActionBtn
                icon={<Copy size={14} />}
                label={t("vastu.block.duplicate")}
                onClick={() => dispatch({ type: "duplicateRoom", id: selectedRoom.id })}
              />
              <ActionBtn
                icon={<Trash2 size={14} />}
                label={t("vastu.block.delete")}
                danger
                onClick={() => {
                  dispatch({ type: "deleteRoom", id: selectedRoom.id });
                  setSelectedId(null);
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted">{t("vastu.onboarding.step1")}</p>
        )}

        {compassHint && <p className="text-[11px] text-amber-400">{compassHint}</p>}

        <RoomPalette onAdd={(type) => dispatch({ type: "addRoom", roomType: type })} />
      </Card>

      <AnalysisPanel
        analysis={analysis}
        signedIn={!!user}
        aiLoading={aiLoading}
        aiResult={aiResult}
        aiError={aiError}
        onGetRemedies={onGetRemedies}
        history={history}
        onViewHistory={(p) => {
          if (p.analysis) setAiResult(p.analysis as VastuAiResult);
        }}
      />
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors " +
        (danger
          ? "border-red-500/25 text-red-400 hover:bg-red-500/10"
          : "border-gold/20 text-muted hover:text-gold hover:border-gold/40")
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
