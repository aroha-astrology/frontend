"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { Maximize2, X, AlertTriangle, Loader2, RotateCcw, Box, Square, Sparkles, Grid3x3 } from "lucide-react";
import { clearTrace, loadTrace, saveTrace, traceStorageKey, type TraceImage } from "@/lib/vastu/trace";
import AdvancedSheet from "./studio/AdvancedSheet";
import TraceSheet from "./studio/TraceSheet";
import VersionsSheet from "./studio/VersionsSheet";
import type { CameraMode } from "./three/VastuScene3D";
import { useAuth } from "@/providers/auth-provider";
import { useFeature, useNewFeature } from "@/hooks/useFeature";
import { api, type VastuPlan } from "@/lib/api";
import { reportErrorKey } from "@/lib/vastu/errors";
import { track } from "@/lib/analytics";
import { getRoomType } from "@/lib/vastu/data";
import { analyzePlan } from "@/lib/vastu/analysis";
import { buildRoomLayout, fixtureFacing, plotSummary, bbox, roomDirection } from "@/lib/vastu/geometry";
import { validatePlan } from "@/lib/vastu/validation";
import { scoreBreakdown } from "@/lib/vastu/breakdown";
import { explainRoom } from "@/lib/vastu/explain";
import { applyChange, planFixes, suggestFixes, type FixSuggestion, type PlanFix } from "@/lib/vastu/fixes";
import { historyReducer, initialHistory } from "@/lib/vastu/history";
import { templatePlan, type TemplateId } from "@/lib/vastu/templates";
import type { Plan } from "@/lib/vastu/types";
import { initialPlan, normalizePlan, samplePlan, uid } from "@/lib/vastu/planState";
import PlanCanvas from "./PlanCanvas";
import AnalysisPanel, { type VastuAiResult } from "./AnalysisPanel";
import { useCompass } from "./useCompass";
import { useHomeSync } from "./useHomeSync";
import { StudioHeader, ViewSwitcher, Dock, RoomBar, type StudioView } from "./studio/StudioChrome";
import { RATING_SYMBOL } from "./studio/ui";
import LiveAnalysis from "./studio/LiveAnalysis";
import RoomSheet from "./studio/RoomSheet";
import NorthSheet from "./studio/NorthSheet";
import PlotSheet from "./studio/PlotSheet";
import WhySheet from "./studio/WhySheet";
import ScoreSheet from "./studio/ScoreSheet";
import StartSheet from "./studio/StartSheet";
import HomeSheet from "./studio/HomeSheet";
import FixBar from "./studio/FixBar";
import FixPlanBar, { type FixPlanMode } from "./studio/FixPlanBar";
import ProfileSwitchTrigger from "@/components/ui/ProfileSwitchTrigger";

// Three.js only loads when someone opens 3D — the 2D editor never pays for it.
const VastuScene3D = dynamic(() => import("./three/VastuScene3D"), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full flex items-center justify-center text-gold">
      <Loader2 className="animate-spin" size={22} />
    </div>
  ),
});

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

type SheetId = "room" | "north" | "plot" | "score" | "homes" | "start" | "guides" | "trace" | "versions" | null;
type Guides = "off" | "zones16" | "grid81";
const GUIDES_KEY = "vastu_guides";

export default function VastuPlanner() {
  const { t, i18n } = useTranslation();
  const { user, profiles, activeProfile, refresh } = useAuth();
  const paidVastu = useFeature("paid.vastu");
  // Admin switch for the 3D view (fails closed: hidden until the backend says on).
  const has3d = useNewFeature("nav.vastuThreeD").enabled;
  const CREDIT_COST_PAISE = paidVastu.pricePaise ?? 5000;
  const [history, dispatch] = useReducer(historyReducer, undefined, () => initialHistory(initialPlan()));
  const plan = history.present;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState<StudioView>("2d");
  const [sheet, setSheet] = useState<SheetId>(null);
  const [whyId, setWhyId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ roomId: string; nonce: number } | null>(null);
  const [cam, setCam] = useState<CameraMode>("iso");
  const [vastu3d, setVastu3d] = useState(false);
  const [camReset, setCamReset] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => track("vastu_open"), []);
  // 3D switched off (or not yet confirmed on) while it was open: fall back to the 2D editor.
  useEffect(() => {
    if (!has3d && view === "3d") setView("2d");
  }, [has3d, view]);

  // ── Compass (live device heading, lock to freeze) ──────────────────────────
  const compass = useCompass();
  const [compassHint, setCompassHint] = useState<string | null>(null);
  const onAlign = useCallback(async () => {
    setCompassHint(null);
    dispatch({ type: "beginGesture" });
    const status = await compass.start();
    if (status === "unsupported") setCompassHint(t("vastu.compass.unavailable"));
    else if (status === "denied") setCompassHint(t("vastu.compass.permissionDenied"));
  }, [compass, t]);
  useEffect(() => {
    if (compass.state === "reading" && compass.heading != null) {
      dispatch({ type: "setNorthOffset", deg: compass.heading });
    }
  }, [compass.state, compass.heading]);
  const onLock = useCallback(() => {
    track("vastu_north_aligned", { via: "compass" });
    compass.lock();
    dispatch({ type: "endGesture" });
  }, [compass]);
  const onRecalibrate = useCallback(() => {
    setCompassHint(null);
    dispatch({ type: "beginGesture" });
    compass.recalibrate();
  }, [compass]);
  const onRotate = useCallback((deg: number) => {
    compass.reset();
    dispatch({ type: "setNorthOffset", deg });
  }, [compass]);

  // ── Live analysis (offline, free) ──────────────────────────────────────────
  const analysis = useMemo(() => analyzePlan(plan), [plan]);
  const validation = useMemo(() => validatePlan(plan), [plan]);
  const breakdown = useMemo(() => scoreBreakdown(plan, analysis), [plan, analysis]);
  const ratingById = useMemo(() => Object.fromEntries(analysis.rooms.map((r) => [r.roomId, r])), [analysis]);
  const labelForType = useCallback((type: string) => t(getRoomType(type)?.labelKey ?? type, getRoomType(type)?.label ?? type), [t]);
  const colorForType = useCallback((type: string) => getRoomType(type)?.color ?? "#94a3b8", []);

  // ── Saved to the account, per profile (device draft + server copy) ─────────
  // Scope waits for the profile list, so a plan is never saved under the wrong profile.
  const scope = user && profiles !== null ? `${user.id}:${activeProfile?.id ?? "primary"}` : null;
  const homesSync = useHomeSync({
    scope,
    signedIn: !!user,
    plan,
    score: analysis.overallScore,
    dispatch,
    defaultName: t("vastu.home.defaultName"),
  });
  const { status: saveStatus, home } = homesSync;

  // ── Advanced guides (16 zones / 9×9 grid) — a per-device viewing preference ──
  const [guides, setGuidesState] = useState<Guides>("off");
  useEffect(() => {
    try {
      const g = localStorage.getItem(GUIDES_KEY);
      if (g === "zones16" || g === "grid81") setGuidesState(g);
    } catch {
      /* default off */
    }
  }, []);
  const setGuides = useCallback((g: Guides) => {
    setGuidesState(g);
    try {
      localStorage.setItem(GUIDES_KEY, g);
    } catch {
      /* not persisted */
    }
  }, []);

  // ── Tracing photo (stays on this device, per home) ─────────────────────────
  const traceKey = scope ? traceStorageKey(scope, home?.id ?? null) : null;
  const [trace, setTraceState] = useState<TraceImage | null>(null);
  const traceRef = useRef<{ key: string | null; trace: TraceImage | null }>({ key: null, trace: null });
  useEffect(() => {
    let live = true;
    const prev = traceRef.current;
    // A photo picked before a brand-new home got its id moves with it.
    if (traceKey && prev.trace && prev.key?.endsWith(":draft") && !traceKey.endsWith(":draft")) {
      void saveTrace(traceKey, prev.trace);
      void clearTrace(prev.key);
      traceRef.current = { key: traceKey, trace: prev.trace };
      return;
    }
    setTraceState(null);
    traceRef.current = { key: traceKey, trace: null };
    if (!traceKey) return;
    void loadTrace(traceKey).then((t) => {
      if (!live) return;
      setTraceState(t);
      traceRef.current = { key: traceKey, trace: t };
    });
    return () => {
      live = false;
    };
  }, [traceKey]);
  const traceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setTrace = useCallback((t: TraceImage | null) => {
    setTraceState(t);
    traceRef.current = { key: traceKey, trace: t };
    if (!traceKey) return;
    if (traceSaveTimer.current) clearTimeout(traceSaveTimer.current);
    traceSaveTimer.current = setTimeout(() => {
      void (t ? saveTrace(traceKey, t) : clearTrace(traceKey));
    }, 400);
  }, [traceKey]);
  useEffect(() => {
    if (homesSync.needsStart) setSheet("start");
  }, [homesSync.needsStart]);

  const startWith = useCallback((tpl: TemplateId | "demo") => {
    const p = tpl === "demo" ? samplePlan() : templatePlan(tpl, uid);
    const name = homesSync.homes.length === 0 ? t("vastu.home.defaultName") : t("vastu.homes.newName", "Home {{n}}", { n: homesSync.homes.length + 1 });
    void homesSync.createHome(name, p, analyzePlan(p).overallScore);
    track("vastu_plan_created", { start: tpl });
    setSelectedId(null);
    setSheet(null);
    setView("2d");
  }, [homesSync, t]);

  // ── Undo / redo (buttons + Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y) ───────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A deleted/undone room can't stay selected.
  useEffect(() => {
    if (selectedId && !plan.rooms.some((r) => r.id === selectedId)) setSelectedId(null);
  }, [plan.rooms, selectedId]);

  // ── Show me / Why? / Fix this ──────────────────────────────────────────────
  const [fix, setFix] = useState<{ roomId: string; suggestions: FixSuggestion[]; choice: number } | null>(null);
  const scrollToCanvas = useCallback(() => {
    canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const showMe = useCallback((roomId: string) => {
    track("vastu_show_me");
    setWhyId(null);
    setSelectedId(roomId);
    setView("vastu");
    setFocus({ roomId, nonce: Date.now() });
    scrollToCanvas();
  }, [scrollToCanvas]);
  const startFix = useCallback((roomId: string) => {
    track("vastu_fix_preview");
    setWhyId(null);
    setSelectedId(roomId);
    setView("vastu");
    setFix({ roomId, suggestions: suggestFixes(plan, roomId), choice: 0 });
    setFocus(null);
    scrollToCanvas();
  }, [plan, scrollToCanvas]);
  const applyFix = useCallback(() => {
    if (!fix) return;
    const s = fix.suggestions[fix.choice];
    if (s) {
      dispatch({ type: "replace", plan: applyChange(plan, s.change) });
      track("vastu_fix_applied", { gain: s.scoreAfter - s.scoreBefore });
    }
    setFix(null);
  }, [fix, plan]);
  // Any edit while previewing makes the preview stale.
  const fixPlanRef = useRef(plan);
  useEffect(() => {
    if (fix && fixPlanRef.current !== plan) setFix(null);
    fixPlanRef.current = plan;
  }, [plan, fix]);
  const fixChange = fix?.suggestions[fix.choice]?.change;
  const fixRoom = fix ? plan.rooms.find((r) => r.id === fix.roomId) : undefined;

  // ── Fix my plan (whole home) ───────────────────────────────────────────────
  const [fixPlan, setFixPlan] = useState<(PlanFix & { mode: FixPlanMode; kept: string[]; base: string }) | null>(null);
  const planJson = useMemo(() => JSON.stringify(plan), [plan]);
  const openFixPlan = useCallback(() => {
    setFix(null);
    setSelectedId(null);
    setView("vastu");
    const r = planFixes(plan);
    track("vastu_fixplan_opened", { steps: r.steps.length });
    setFixPlan({ ...r, mode: "overview", kept: [], base: JSON.stringify(plan) });
    scrollToCanvas();
  }, [plan, scrollToCanvas]);
  // Any other edit makes the proposal stale.
  useEffect(() => {
    if (fixPlan && fixPlan.base !== planJson) setFixPlan(null);
  }, [planJson, fixPlan]);
  const continueFixPlan = useCallback((next: Plan, kept: string[]) => {
    const r = planFixes(next, 6, kept);
    setFixPlan(r.steps.length ? { ...r, mode: "step", kept, base: JSON.stringify(normalizePlan(next)) } : null);
  }, []);
  const fixPlanGhosts = useMemo(() => {
    if (!fixPlan || fixPlan.mode === "overview") return [];
    const moves = fixPlan.mode === "step" ? fixPlan.steps.slice(0, 1) : fixPlan.steps;
    const final = new Map<string, { x: number; y: number }>();
    for (const s of moves) if (s.change.kind === "move") final.set(s.roomId, { x: s.change.x, y: s.change.y });
    return [...final].flatMap(([roomId, p]) => {
      const r = plan.rooms.find((x) => x.id === roomId);
      return r ? [{ roomId, x: p.x, y: p.y, w: r.w, h: r.h }] : [];
    });
  }, [fixPlan, plan.rooms]);
  const ghosts = fixChange?.kind === "move" && fixRoom ? [{ roomId: fixRoom.id, x: fixChange.x, y: fixChange.y, w: fixRoom.w, h: fixRoom.h }] : fixPlanGhosts;
  const fixable = useCallback((roomId: string) => ratingById[roomId]?.ratingKey !== "ideal", [ratingById]);

  const whyRoom = whyId ? plan.rooms.find((r) => r.id === whyId) : undefined;
  const explanation = useMemo(() => (whyRoom ? explainRoom(whyRoom, plan) : null), [whyRoom, plan]);

  // ── AI report (paid) + follow-up ──────────────────────────────────────────
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
  /** The report currently on screen — a late translation of any other one is dropped. */
  const viewedPlanRef = useRef<string | null>(null);
  /** Layout of the history report being viewed, for "Open this plan". */
  const [viewedLayout, setViewedLayout] = useState<Plan | null>(null);
  const [reports, setReports] = useState<VastuPlan[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user) {
      setReportsLoading(false);
      return;
    }
    setReportsLoading(true);
    try {
      const { plans } = await api.vastuList(i18n.language);
      setReports(plans);
    } catch {
      /* best-effort */
    } finally {
      setReportsLoading(false);
    }
  }, [user, i18n.language]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

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
    setSelectedId(null);
    setFix(null);
    // Stop waiting on the old profile's report (it still lands in that profile's history).
    trackedPlanRef.current = null;
    setAiLoading(false);
    setAiSlow(false);
  }, [activeProfile?.id]);

  // A plan still queued/processing (e.g. one that outlasted the wait below) lands in
  // history on its own — check back while any is unfinished.
  const reportsPending = reports.some((p) => p.status === "pending" || p.status === "processing");
  useEffect(() => {
    if (!reportsPending || aiLoading) return;
    const id = setTimeout(() => void loadReports(), 15_000);
    return () => clearTimeout(id);
  }, [reportsPending, aiLoading, reports, loadReports]);

  /**
   * Wait for one report to finish. Used right after buying and to pick up a report that was
   * still being written when the page was left or reloaded — the charge already happened
   * server-side, so this never implies failure just because the wait ends.
   */
  const [aiStartedAt, setAiStartedAt] = useState<number | null>(null);
  const waitForPlan = useCallback(async (planId: string, generationProfileId: string | null, startedAt: number) => {
    trackedPlanRef.current = planId;
    viewedPlanRef.current = planId;
    setActivePlanId(planId);
    setViewedLayout(null);
    setAiLoading(true);
    setAiStartedAt(startedAt);
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
          track("vastu_report_done");
          void loadReports();
          void refresh();
          return;
        }
        if (p?.status === "error") {
          // Charged at the start and refunded by the server on failure.
          setAiError(t("vastu.analysis.failedRefunded"));
          void loadReports();
          void refresh();
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      // Still working on the server: it will show up in the history list.
      setAiNotice(t("vastu.analysis.stillWorking"));
      void loadReports();
    } finally {
      if (trackedPlanRef.current === planId) {
        setAiLoading(false);
        setAiSlow(false);
      }
    }
  }, [t, i18n.language, loadReports, refresh]);

  const onGenerate = useCallback(async () => {
    const generationProfileId = activeProfileIdRef.current;
    setAiError(null);
    setAiNotice(null);
    setAiSlow(false);
    setAiResult(null);
    setActivePlanId(null);
    setViewedLayout(null);
    setAiLoading(true);
    setAiStartedAt(Date.now());
    let planId: string;
    track("vastu_report_started");
    try {
      ({ planId } = await api.vastuAnalyze(buildPayload(plan, i18n.language, home?.id)));
    } catch (e) {
      const key = reportErrorKey(e);
      track("vastu_report_error", { reason: key });
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
    const newest = reports[0];
    if (!newest || (newest.status !== "pending" && newest.status !== "processing")) return;
    if (trackedPlanRef.current === newest.id) return;
    const startedAt = Date.parse(newest.createdAt);
    if (!(Date.now() - startedAt < WAIT_MS)) return;
    setAiError(null);
    setAiNotice(null);
    setAiResult(null);
    void waitForPlan(newest.id, activeProfileIdRef.current, startedAt);
  }, [reports, aiLoading, waitForPlan]);

  const onAsk = useCallback(async (question: string) => {
    if (!activePlanId) return;
    setAskError(null);
    setAsking(true);
    track("vastu_followup_asked");
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
    track("vastu_history_opened");
    viewedPlanRef.current = p.id;
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
        // Another report (or a new one) may have been opened while this translated.
        if (full.analysis && viewedPlanRef.current === p.id) setAiResult(full.analysis as VastuAiResult);
      } catch {
        /* keep the untranslated copy */
      }
    }
  }, [i18n.language]);

  const onOpenPlan = useCallback(() => {
    if (!viewedLayout) return;
    dispatch({ type: "replace", plan: viewedLayout });
    setSelectedId(null);
    setViewedLayout(null);
    scrollToCanvas();
  }, [viewedLayout, scrollToCanvas]);

  const onDeleteHistory = useCallback(async (p: VastuPlan) => {
    try {
      await api.vastuDelete(p.id);
      setReports((h) => h.filter((x) => x.id !== p.id));
      if (activePlanId === p.id) {
        setAiResult(null);
        setActivePlanId(null);
        setViewedLayout(null);
      }
    } catch {
      setAiError(t("vastu.history.deleteError"));
    }
  }, [activePlanId, t]);

  /** "Show on plan" from a report room card: find that room by id or type. */
  const onShowReportRoom = useCallback((key: string) => {
    const room = plan.rooms.find((r) => r.id === key) ?? plan.rooms.find((r) => r.type === key);
    if (room) showMe(room.id);
  }, [plan.rooms, showMe]);

  const selectedRoom = plan.rooms.find((r) => r.id === selectedId) ?? null;
  const selectedRating = selectedRoom ? ratingById[selectedRoom.id] : undefined;
  const badgeLabel = selectedRating ? `${selectedRating.zone} · ${RATING_SYMBOL[selectedRating.ratingKey]} ${t(`vastu.rating.${selectedRating.ratingKey}`)}` : null;
  const bb = bbox(plan.plot);
  const lensOn = view === "vastu";

  const bar = fixPlan ? (
    <FixPlanBar
      steps={fixPlan.steps}
      scoreBefore={fixPlan.scoreBefore}
      scoreAfter={fixPlan.scoreAfter}
      mode={fixPlan.mode}
      stepIndex={0}
      onMode={(m) => setFixPlan((f) => (f ? { ...f, mode: m } : f))}
      onApplyAll={() => {
        track("vastu_fixplan_applied", { steps: fixPlan.steps.length, gain: fixPlan.scoreAfter - fixPlan.scoreBefore });
        dispatch({ type: "replace", plan: fixPlan.plan });
        setFixPlan(null);
      }}
      onApplyStep={() => {
        const s = fixPlan.steps[0];
        if (!s) return;
        const next = applyChange(plan, s.change);
        dispatch({ type: "replace", plan: next });
        continueFixPlan(next, fixPlan.kept);
      }}
      onSkipStep={() => {
        const s = fixPlan.steps[0];
        if (!s) return;
        continueFixPlan(plan, [...fixPlan.kept, s.roomId]);
      }}
      onClose={() => setFixPlan(null)}
    />
  ) : fix && fixRoom ? (
    <FixBar
      roomLabel={labelForType(fixRoom.type)}
      emoji={getRoomType(fixRoom.type)?.emoji ?? ""}
      suggestions={fix.suggestions}
      choice={fix.choice}
      onChoose={(i) => setFix((f) => (f ? { ...f, choice: i } : f))}
      onApply={applyFix}
      onCancel={() => setFix(null)}
    />
  ) : selectedRoom ? (
    <RoomBar
      emoji={getRoomType(selectedRoom.type)?.emoji ?? ""}
      label={labelForType(selectedRoom.type)}
      rating={selectedRating}
      onDoor={() => {
        dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "door" });
        track("vastu_fixture_added", { kind: "door" });
      }}
      onWindow={() => {
        dispatch({ type: "addFixture", roomId: selectedRoom.id, kind: "window" });
        track("vastu_fixture_added", { kind: "window" });
      }}
      onWhy={() => setWhyId(selectedRoom.id)}
      onFix={selectedRating && selectedRating.ratingKey !== "ideal" ? () => startFix(selectedRoom.id) : undefined}
      onDuplicate={() => dispatch({ type: "duplicateRoom", id: selectedRoom.id })}
      onDelete={() => {
        dispatch({ type: "deleteRoom", id: selectedRoom.id });
        setSelectedId(null);
      }}
      onClose={() => setSelectedId(null)}
    />
  ) : (
    <Dock
      onAdd={() => setSheet("room")}
      onNorth={() => setSheet("north")}
      onPlot={() => setSheet("plot")}
      onUndo={() => dispatch({ type: "undo" })}
      onRedo={() => dispatch({ type: "redo" })}
      canUndo={history.past.length > 0}
      canRedo={history.future.length > 0}
    />
  );

  const canvas = (
    <div ref={canvasRef} className="relative rounded-[28px] border border-gold/15 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(223,181,100,0.07),transparent_60%)] bg-card overflow-hidden" data-tour="vastu-canvas">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <ViewSwitcher
            view={view}
            onChange={(v) => {
              if (v === "3d") {
                setVastu3d(view === "vastu");
                track("vastu_3d_opened");
              }
              if (v === "vastu") track("vastu_lens_opened");
              setView(v);
              setFocus(null);
              setFix(null);
            }}
            has3d={has3d}
          />
        </div>
        <button
          onClick={() => setFullscreen((f) => !f)}
          aria-label={t(fullscreen ? "vastu.toolbar.collapse" : "vastu.toolbar.expand")}
          className="pointer-events-auto w-9 h-9 rounded-full bg-background/70 border border-gold/20 text-gold flex items-center justify-center backdrop-blur"
        >
          {fullscreen ? <X size={16} /> : <Maximize2 size={15} />}
        </button>
      </div>
      {view === "3d" && has3d ? (
        <div className="relative pt-12">
          <div className="aspect-square w-full" data-testid="vastu-3d">
            <VastuScene3D
              plan={plan}
              ratingById={ratingById}
              labelForType={labelForType}
              colorForType={colorForType}
              selectedId={selectedId}
              onSelect={setSelectedId}
              vastu={vastu3d}
              cameraMode={cam}
              resetNonce={camReset}
            />
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5">
            <Chip3D active={cam === "iso"} onClick={() => setCam("iso")} icon={<Box size={13} />} label={t("vastu.three.iso", "3D")} />
            <Chip3D active={cam === "top"} onClick={() => setCam("top")} icon={<Square size={13} />} label={t("vastu.three.top", "Top")} />
            <Chip3D active={vastu3d} onClick={() => setVastu3d((v) => !v)} icon={<Sparkles size={13} />} label={t("vastu.three.vastu", "Vastu")} testId="vastu-3d-toggle" />
            <button
              onClick={() => {
                setSelectedId(null);
                setCamReset((n) => n + 1);
              }}
              aria-label={t("vastu.three.reset", "Reset view")}
              className="ml-auto w-9 h-9 rounded-full bg-background/75 border border-gold/20 text-gold flex items-center justify-center backdrop-blur"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      ) : (
      <div className="pt-10 px-1 pb-1">
        <PlanCanvas
          plan={plan}
          ratingById={ratingById}
          issuesById={validation.roomIssues}
          labelForType={labelForType}
          colorForType={colorForType}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (fix && id !== fix.roomId) setFix(null);
          }}
          dispatch={dispatch}
          locked={compass.state === "locked"}
          lens={lensOn}
          focus={focus}
          badgeLabel={badgeLabel}
          ghosts={ghosts}
          advanced={guides}
          trace={trace}
        />
      </div>
      )}
      {view !== "3d" && (
        <button
          onClick={() => setSheet("guides")}
          aria-pressed={guides !== "off"}
          data-testid="vastu-guides-open"
          className={`absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur transition-colors ${guides !== "off" ? "bg-gold text-[#1a0e00]" : "bg-background/75 border border-gold/20 text-foreground/85"}`}
          style={lensOn ? { bottom: "2.6rem" } : undefined}
        >
          <Grid3x3 size={13} /> {t("vastu.grid.chip", "Guides")}
        </button>
      )}
      {lensOn && (
        <p className="px-4 pb-3 -mt-1 text-[11px] text-muted" data-testid="vastu-lens-caption">
          {selectedRoom
            ? t("vastu.studio.lensForRoom", "Green is where a {{room}} belongs; red is where to avoid.", { room: labelForType(selectedRoom.type) })
            : t("vastu.studio.lensHint", "Tap a room to see where it belongs.")}
        </p>
      )}
    </div>
  );

  const notes = (
    <>
      <ValidationNotes plotInvalid={validation.plotInvalid} outside={validation.outsideCount} overlap={validation.overlapCount} />
      {(compassHint || compass.state === "reading") && !sheet && (
        <p className="text-[11px] text-amber-400">{compassHint ?? t("vastu.compass.locking")}</p>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <StudioHeader homeName={home?.name ?? t("vastu.home.defaultName")} status={saveStatus} onHomes={() => setSheet("homes")} right={<ProfileSwitchTrigger className="mb-5" />} />

      {fullscreen ? (
        // Sits above the nav bar (z-50), so pb clears the system bar, not the nav.
        <div className="fixed inset-0 z-[80] bg-background overflow-y-auto px-3 pt-[calc(0.75rem+var(--sat))] pb-[calc(1.5rem+var(--sab))] flex flex-col gap-3">
          {canvas}
          {bar}
          {notes}
        </div>
      ) : (
        <>
          {canvas}
          {bar}
          {notes}
        </>
      )}

      <div data-tour="vastu-analysis">
        <LiveAnalysis
          analysis={analysis}
          breakdown={breakdown}
          onShowMe={showMe}
          onWhy={(id) => {
            track("vastu_issue_opened");
            setWhyId(id);
          }}
          onFix={startFix}
          fixable={fixable}
          onFixPlan={openFixPlan}
          onScore={() => {
            track("vastu_score_viewed");
            setSheet("score");
          }}
        />
      </div>

      <AnalysisPanel
        reportEnabled={paidVastu.enabled}
        reportReady={validation.reportReady}
        hasRooms={plan.rooms.length > 0}
        balancePaise={user?.walletBalancePaise ?? 0}
        costPaise={CREDIT_COST_PAISE}
        aiLoading={aiLoading}
        aiStartedAt={aiStartedAt}
        aiResult={aiResult}
        aiError={aiError}
        aiSlow={aiSlow}
        aiNotice={aiNotice}
        onGenerate={onGenerate}
        history={reports}
        historyLoading={reportsLoading}
        profileName={activeProfile?.displayName?.trim() || t("profileSwitcher.unnamed")}
        onViewHistory={(p) => void onViewHistory(p)}
        onDeleteHistory={(p) => void onDeleteHistory(p)}
        onOpenPlan={viewedLayout ? onOpenPlan : undefined}
        onShowRoom={viewedLayout ? undefined : onShowReportRoom}
        canAsk={!!activePlanId}
        onAsk={onAsk}
        asking={asking}
        askError={askError}
      />

      <RoomSheet
        open={sheet === "room"}
        onClose={() => setSheet(null)}
        onAdd={(type) => {
          dispatch({ type: "addRoom", roomType: type });
          track("vastu_room_added", { type });
        }}
      />
      <NorthSheet
        open={sheet === "north"}
        onClose={() => setSheet(null)}
        deg={plan.northOffsetDeg}
        onRotate={onRotate}
        onRotateStart={() => dispatch({ type: "beginGesture" })}
        compassState={compass.state}
        onAlign={() => void onAlign()}
        onLock={onLock}
        onRecalibrate={onRecalibrate}
        hint={compassHint}
      />
      <PlotSheet
        open={sheet === "plot"}
        onClose={() => setSheet(null)}
        sides={plan.plot.length}
        onSides={(n) => dispatch({ type: "setSides", sides: n })}
        widthU={Math.round(bb.w)}
        heightU={Math.round(bb.h)}
        onScale={(w, h) => dispatch({ type: "scalePlot", widthU: w, heightU: h })}
        onStartOver={() => setSheet("start")}
        onTrace={() => setSheet("trace")}
        tracing={!!trace}
      />
      <AdvancedSheet open={sheet === "guides"} onClose={() => setSheet(null)} mode={guides} onMode={setGuides} />
      <TraceSheet
        open={sheet === "trace"}
        onClose={() => setSheet(null)}
        trace={trace}
        onChange={(tr) => {
          setTrace(tr);
          if (!trace) track("vastu_upload_started");
        }}
        onRemove={() => setTrace(null)}
        plotBBox={bb}
      />
      <VersionsSheet
        open={sheet === "versions"}
        onClose={() => setSheet(null)}
        homeId={home?.id ?? null}
        homeName={home?.name ?? t("vastu.home.defaultName")}
        beforeSave={homesSync.saveNow}
        onRestored={(layout) => {
          dispatch({ type: "replace", plan: normalizePlan(layout) });
          setSelectedId(null);
          track("vastu_version_restored");
        }}
      />
      <ScoreSheet open={sheet === "score"} onClose={() => setSheet(null)} score={analysis.overallScore} hasRooms={analysis.rooms.length > 0} breakdown={breakdown} />
      <StartSheet
        open={sheet === "start"}
        onClose={() => setSheet(null)}
        onPick={startWith}
        onTrace={() => {
          startWith("blank");
          setSheet("trace");
        }}
        canClose={!homesSync.needsStart}
      />
      <HomeSheet
        open={sheet === "homes"}
        onClose={() => setSheet(null)}
        homes={homesSync.homes}
        currentId={home?.id ?? null}
        onSelect={(id) => {
          setSelectedId(null);
          setFix(null);
          homesSync.selectHome(id);
        }}
        onNew={() => setSheet("start")}
        onVersions={() => setSheet("versions")}
        onDuplicate={() => {
          const name = t("vastu.homes.copyName", "{{name}} (copy)", { name: home?.name ?? t("vastu.home.defaultName") });
          void homesSync.createHome(name, { ...plan, rooms: plan.rooms.map((r) => ({ ...r, id: uid(), fixtures: r.fixtures.map((f) => ({ ...f, id: uid() })) })) }, analysis.overallScore);
        }}
        onRename={(id, name) => void homesSync.renameHome(id, name)}
        onDelete={(id) => void homesSync.deleteHome(id)}
      />
      <WhySheet
        explanation={explanation}
        onClose={() => setWhyId(null)}
        onShowMe={whyId ? () => showMe(whyId) : undefined}
        onFix={whyId && explanation && explanation.ratingKey !== "ideal" ? () => startFix(whyId) : undefined}
      />
    </div>
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

function Chip3D({ active, onClick, icon, label, testId }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; testId?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold backdrop-blur transition-colors ${active ? "bg-gold text-[#1a0e00]" : "bg-background/75 border border-gold/20 text-foreground/85"}`}
    >
      {icon} {label}
    </button>
  );
}
