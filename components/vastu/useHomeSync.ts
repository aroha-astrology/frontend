"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type VastuHome } from "@/lib/api";
import type { Plan } from "@/lib/vastu/types";
import type { PlanAction } from "./planState";
import { normalizePlan, samplePlan } from "./planState";

/**
 * Keeps the planner's plan saved: instantly on the device (per account +
 * profile), and to the account's `vastu_homes` row after a short pause.
 * Dragging never waits on the network — the server copy follows behind.
 *
 * On load the newer copy wins: a device draft with unsynced edits newer than
 * the server's copy is kept and pushed up; otherwise the server copy loads.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

interface LocalDraft {
  plan: Plan;
  homeId: string | null;
  /** Edited on this device since the last confirmed server save. */
  dirty: boolean;
  updatedAt: number;
}

/** Pre-homes builds kept one device-wide plan under this key. */
const LEGACY_KEY = "vastu_plan";
const SAVE_DEBOUNCE_MS = 1200;

const draftKey = (scope: string) => `vastu_plan:${scope}`;

function readDraft(scope: string): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(scope));
    if (raw) {
      const d = JSON.parse(raw) as LocalDraft;
      return { ...d, plan: normalizePlan(d.plan) };
    }
    // One-time migration of the old device-wide plan into the first profile opened.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_KEY);
      return { plan: normalizePlan(JSON.parse(legacy)), homeId: null, dirty: true, updatedAt: Date.now() };
    }
  } catch {
    /* unreadable/blocked storage — start fresh */
  }
  return null;
}

function writeDraft(scope: string, draft: LocalDraft) {
  try {
    localStorage.setItem(draftKey(scope), JSON.stringify(draft));
  } catch {
    /* storage full/blocked — the server copy still saves */
  }
}

function isOffline(e: unknown) {
  return e instanceof ApiError && e.status === 0;
}

export function useHomeSync({
  scope,
  signedIn,
  plan,
  score,
  dispatch,
  defaultName,
}: {
  /** `${userId}:${profileId}` once known; null while the active profile is still loading. */
  scope: string | null;
  signedIn: boolean;
  plan: Plan;
  score: number;
  dispatch: React.Dispatch<PlanAction>;
  /** Name for a profile's first saved home. */
  defaultName: string;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [home, setHome] = useState<Pick<VastuHome, "id" | "name"> | null>(null);
  const [ready, setReady] = useState(false);

  const homeIdRef = useRef<string | null>(null);
  const scopeRef = useRef<string | null>(null);
  /** The next plan change came from loading, not from the user — don't mark it dirty. */
  const skipNextRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ homeId: string; plan: Plan; score: number; scope: string } | null>(null);
  const latest = useRef({ plan, score });
  latest.current = { plan, score };
  // A ref so switching the app language doesn't re-run the load below.
  const defaultNameRef = useRef(defaultName);
  defaultNameRef.current = defaultName;

  const push = useCallback(async () => {
    const job = pendingRef.current;
    pendingRef.current = null;
    if (!job) return;
    if (scopeRef.current === job.scope) setStatus("saving");
    try {
      await api.vastuHomeUpdate(job.homeId, {
        layout: job.plan as unknown as Record<string, unknown>,
        overallScore: job.score,
      });
      // Only clear the dirty flag if nothing newer was drafted meanwhile.
      const d = readDraft(job.scope);
      if (d && JSON.stringify(d.plan) === JSON.stringify(job.plan)) writeDraft(job.scope, { ...d, dirty: false });
      if (scopeRef.current === job.scope && !pendingRef.current) setStatus("saved");
    } catch (e) {
      if (scopeRef.current === job.scope) setStatus(isOffline(e) ? "offline" : "error");
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    void push();
  }, [push]);

  // ── Load when the account/profile becomes known or changes ────────────────
  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    scopeRef.current = scope;
    homeIdRef.current = null;
    setHome(null);
    setReady(false);
    setStatus("idle");

    const local = readDraft(scope);
    skipNextRef.current = true;
    dispatch({ type: "load", plan: local?.plan ?? samplePlan() });
    homeIdRef.current = local?.homeId ?? null;
    setReady(true);

    if (!signedIn) return;

    void (async () => {
      try {
        const { homes } = await api.vastuHomesList();
        if (cancelled) return;
        const server = (local?.homeId && homes.find((h) => h.id === local.homeId)) || homes[0];
        if (server) {
          homeIdRef.current = server.id;
          setHome({ id: server.id, name: server.name });
          const localNewer =
            local?.dirty && local.homeId === server.id && local.updatedAt > Date.parse(server.updatedAt);
          if (localNewer) {
            pendingRef.current = { homeId: server.id, plan: latest.current.plan, score: latest.current.score, scope };
            flush();
          } else {
            const plan = normalizePlan(server.layout);
            skipNextRef.current = true;
            dispatch({ type: "load", plan });
            writeDraft(scope, { plan, homeId: server.id, dirty: false, updatedAt: Date.parse(server.updatedAt) });
            setStatus("saved");
          }
        } else {
          setStatus("saving");
          const created = await api.vastuHomeCreate({
            name: defaultNameRef.current,
            layout: latest.current.plan as unknown as Record<string, unknown>,
            overallScore: latest.current.score,
          });
          if (cancelled) return;
          homeIdRef.current = created.id;
          setHome({ id: created.id, name: created.name });
          writeDraft(scope, { plan: latest.current.plan, homeId: created.id, dirty: false, updatedAt: Date.now() });
          setStatus("saved");
        }
      } catch (e) {
        if (!cancelled) setStatus(isOffline(e) ? "offline" : "error");
      }
    })();

    return () => {
      cancelled = true;
      // Switching profile mid-pause: save what was typed for the old one now.
      flush();
    };
  }, [scope, signedIn, dispatch, flush]);

  // ── Save on every edit ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !scopeRef.current) return;
    const scope = scopeRef.current;
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    writeDraft(scope, { plan, homeId: homeIdRef.current, dirty: true, updatedAt: Date.now() });
    const homeId = homeIdRef.current;
    if (!signedIn || !homeId) return;
    pendingRef.current = { homeId, plan, score, scope };
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void push();
    }, SAVE_DEBOUNCE_MS);
  }, [plan, score, ready, signedIn, push]);

  // Leaving the page (or backgrounding the app) mid-pause: save now.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  // Back online with unsaved edits: retry.
  useEffect(() => {
    const onOnline = () => {
      const scope = scopeRef.current;
      const homeId = homeIdRef.current;
      if (!scope || !homeId) return;
      const d = readDraft(scope);
      if (d?.dirty) {
        pendingRef.current = { homeId, plan: d.plan, score: latest.current.score, scope };
        flush();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  return { status, home, ready };
}
