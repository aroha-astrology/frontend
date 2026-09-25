"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type VastuHome } from "@/lib/api";
import type { Plan } from "@/lib/vastu/types";
import type { StudioAction } from "@/lib/vastu/history";
import { normalizePlan } from "@/lib/vastu/planState";

/**
 * Keeps the planner's plan saved: instantly on the device (per account +
 * profile), and to the account's `vastu_homes` row after a short pause.
 * Dragging never waits on the network — the server copy follows behind.
 *
 * On load the newer copy wins: a device draft with unsynced edits newer than
 * the server's copy is kept and pushed up; otherwise the server copy loads.
 * A profile with no homes and no draft gets `needsStart` so the page can ask
 * how to begin (draw / template / upload) instead of inventing a plan.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error";

export type HomeSummary = Pick<VastuHome, "id" | "name" | "overallScore" | "updatedAt">;

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

const summary = (h: VastuHome): HomeSummary => ({ id: h.id, name: h.name, overallScore: h.overallScore, updatedAt: h.updatedAt });

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
  dispatch: React.Dispatch<StudioAction>;
  /** Name for a profile's first saved home. */
  defaultName: string;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [homes, setHomes] = useState<HomeSummary[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [needsStart, setNeedsStart] = useState(false);

  const homeIdRef = useRef<string | null>(null);
  const scopeRef = useRef<string | null>(null);
  /** Full server copies from the last list load, for switching homes without a refetch. */
  const layoutsRef = useRef<Map<string, Plan>>(new Map());
  /** The next plan change came from loading, not from the user — don't mark it dirty. */
  const skipNextRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ homeId: string; plan: Plan; score: number; scope: string } | null>(null);
  const latest = useRef({ plan, score });
  latest.current = { plan, score };
  // A ref so switching the app language doesn't re-run the load below.
  const defaultNameRef = useRef(defaultName);
  defaultNameRef.current = defaultName;

  const setCurrent = useCallback((id: string | null) => {
    homeIdRef.current = id;
    setHomeId(id);
  }, []);

  const loadPlan = useCallback(
    (p: Plan) => {
      skipNextRef.current = true;
      dispatch({ type: "load", plan: p });
    },
    [dispatch],
  );

  const push = useCallback(async () => {
    const job = pendingRef.current;
    pendingRef.current = null;
    if (!job) return;
    if (scopeRef.current === job.scope) setStatus("saving");
    try {
      const saved = await api.vastuHomeUpdate(job.homeId, {
        layout: job.plan as unknown as Record<string, unknown>,
        overallScore: job.score,
      });
      layoutsRef.current.set(saved.id, job.plan);
      // Only clear the dirty flag if nothing newer was drafted meanwhile.
      const d = readDraft(job.scope);
      if (d && JSON.stringify(d.plan) === JSON.stringify(job.plan)) writeDraft(job.scope, { ...d, dirty: false });
      if (scopeRef.current === job.scope) {
        setHomes((hs) => hs.map((h) => (h.id === saved.id ? summary(saved) : h)));
        if (!pendingRef.current) setStatus("saved");
      }
    } catch (e) {
      if (scopeRef.current === job.scope) setStatus(isOffline(e) ? "offline" : "error");
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    void push();
  }, [push]);

  const createOnServer = useCallback(
    async (name: string, p: Plan, sc: number): Promise<VastuHome> => {
      const created = await api.vastuHomeCreate({
        name,
        layout: p as unknown as Record<string, unknown>,
        overallScore: sc,
      });
      layoutsRef.current.set(created.id, p);
      setHomes((hs) => [summary(created), ...hs]);
      return created;
    },
    [],
  );

  // ── Load when the account/profile becomes known or changes ────────────────
  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    scopeRef.current = scope;
    setCurrent(null);
    setHomes([]);
    layoutsRef.current = new Map();
    setReady(false);
    setNeedsStart(false);
    setStatus("idle");

    const local = readDraft(scope);
    if (local) loadPlan(local.plan);
    homeIdRef.current = local?.homeId ?? null;
    setReady(true);

    if (!signedIn) {
      if (!local) setNeedsStart(true);
      return;
    }

    void (async () => {
      try {
        const { homes: list } = await api.vastuHomesList();
        if (cancelled) return;
        for (const h of list) layoutsRef.current.set(h.id, normalizePlan(h.layout));
        setHomes(list.map(summary));
        const server = (local?.homeId && list.find((h) => h.id === local.homeId)) || list[0];
        if (server) {
          setCurrent(server.id);
          const localNewer =
            local?.dirty && local.homeId === server.id && local.updatedAt > Date.parse(server.updatedAt);
          if (localNewer) {
            pendingRef.current = { homeId: server.id, plan: latest.current.plan, score: latest.current.score, scope };
            flush();
          } else {
            const p = layoutsRef.current.get(server.id)!;
            loadPlan(p);
            writeDraft(scope, { plan: p, homeId: server.id, dirty: false, updatedAt: Date.parse(server.updatedAt) });
            setStatus("saved");
          }
        } else if (local) {
          // A device draft that never reached the account (e.g. from before homes existed).
          setStatus("saving");
          const created = await createOnServer(defaultNameRef.current, latest.current.plan, latest.current.score);
          if (cancelled) return;
          setCurrent(created.id);
          writeDraft(scope, { plan: latest.current.plan, homeId: created.id, dirty: false, updatedAt: Date.now() });
          setStatus("saved");
        } else {
          setNeedsStart(true);
        }
      } catch (e) {
        if (cancelled) return;
        setStatus(isOffline(e) ? "offline" : "error");
        if (!local) setNeedsStart(true);
      }
    })();

    return () => {
      cancelled = true;
      // Switching profile mid-pause: save what was typed for the old one now.
      flush();
    };
  }, [scope, signedIn, loadPlan, setCurrent, createOnServer, flush]);

  // ── Save on every edit ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !scopeRef.current) return;
    const scope = scopeRef.current;
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    writeDraft(scope, { plan, homeId: homeIdRef.current, dirty: true, updatedAt: Date.now() });
    const id = homeIdRef.current;
    if (!signedIn || !id) return;
    pendingRef.current = { homeId: id, plan, score, scope };
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
      const id = homeIdRef.current;
      if (!scope || !id) return;
      const d = readDraft(scope);
      if (d?.dirty) {
        pendingRef.current = { homeId: id, plan: d.plan, score: latest.current.score, scope };
        flush();
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  // ── Home management ────────────────────────────────────────────────────────

  /** Open another saved home (saves the current one first). */
  const selectHome = useCallback(
    (id: string) => {
      const scope = scopeRef.current;
      const p = layoutsRef.current.get(id);
      if (!scope || !p || id === homeIdRef.current) return;
      flush();
      setCurrent(id);
      loadPlan(p);
      writeDraft(scope, { plan: p, homeId: id, dirty: false, updatedAt: Date.now() });
      setStatus("saved");
    },
    [flush, loadPlan, setCurrent],
  );

  /** Start a new home from `p` and switch to it. */
  const createHome = useCallback(
    async (name: string, p: Plan, sc: number) => {
      const scope = scopeRef.current;
      if (!scope) return;
      flush();
      setNeedsStart(false);
      setCurrent(null);
      loadPlan(p);
      writeDraft(scope, { plan: p, homeId: null, dirty: true, updatedAt: Date.now() });
      if (!signedIn) return;
      setStatus("saving");
      try {
        const created = await createOnServer(name, p, sc);
        if (scopeRef.current !== scope) return;
        setCurrent(created.id);
        writeDraft(scope, { plan: latest.current.plan, homeId: created.id, dirty: false, updatedAt: Date.now() });
        // Edits made while the create was in flight follow it up.
        if (JSON.stringify(latest.current.plan) !== JSON.stringify(p)) {
          pendingRef.current = { homeId: created.id, plan: latest.current.plan, score: latest.current.score, scope };
          flush();
        } else {
          setStatus("saved");
        }
      } catch (e) {
        setStatus(isOffline(e) ? "offline" : "error");
      }
    },
    [signedIn, flush, loadPlan, setCurrent, createOnServer],
  );

  const renameHome = useCallback(async (id: string, name: string) => {
    setHomes((hs) => hs.map((h) => (h.id === id ? { ...h, name } : h)));
    try {
      await api.vastuHomeUpdate(id, { name });
    } catch (e) {
      setStatus(isOffline(e) ? "offline" : "error");
    }
  }, []);

  /** Delete a home; the current one falls back to the next, or to the start choice. */
  const deleteHome = useCallback(
    async (id: string) => {
      try {
        await api.vastuHomeDelete(id);
      } catch (e) {
        setStatus(isOffline(e) ? "offline" : "error");
        return false;
      }
      layoutsRef.current.delete(id);
      const rest = homes.filter((h) => h.id !== id);
      setHomes(rest);
      if (id === homeIdRef.current) {
        pendingRef.current = null;
        const next = rest[0];
        const scope = scopeRef.current;
        if (next && scope) {
          const p = layoutsRef.current.get(next.id);
          if (p) {
            setCurrent(next.id);
            loadPlan(p);
            writeDraft(scope, { plan: p, homeId: next.id, dirty: false, updatedAt: Date.now() });
          }
        } else {
          setCurrent(null);
          if (scope) {
            try {
              localStorage.removeItem(draftKey(scope));
            } catch {
              /* ignore */
            }
          }
          setNeedsStart(true);
        }
      }
      return true;
    },
    [homes, loadPlan, setCurrent],
  );

  /** Push any pending edit now and wait for it (e.g. before snapshotting a version). */
  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    await push();
  }, [push]);

  const home = homes.find((h) => h.id === homeId) ?? null;
  return { status, home, homes, ready, needsStart, selectHome, createHome, renameHome, deleteHome, saveNow };
}
