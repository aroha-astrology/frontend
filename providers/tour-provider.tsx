"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { LEGACY_TOUR_DONE_KEY, TOURS_MIRROR_KEY } from "@/components/tour/tour-registry";

interface TourContextValue {
  /**
   * True while a tour overlay is on screen. THE gate every launch-time modal
   * reads — before this existed, UpdatePrompt / FestivalGiftModal /
   * DailyRewardModal / ShareAppPrompt / FeedbackPrompt each decided on their
   * own and could render live underneath the tour's opaque scrim.
   */
  tourActive: boolean;
  setTourActive: (active: boolean) => void;
  /**
   * True from the moment TourHost finds an undone tour for this route/user
   * until it either opens (tourActive takes over) or gives up waiting for its
   * target. A brand-new user hits this window on their very first render —
   * TourHost polls for up to 4s (TARGET_WAIT_MS) for the tour's target to
   * mount before it can flip tourActive true, and every launch-time modal
   * must stay hidden through that gap too, or it flashes on screen and gets
   * yanked away the instant the tour actually opens.
   */
  tourPending: boolean;
  setTourPending: (pending: boolean) => void;
  /** Whether this user has already finished `tourId`. */
  isDone: (tourId: string) => boolean;
  /** Records completion locally (instant) and on the server (best effort). */
  markDone: (tourId: string) => void;
  /** Clears every completion so all tours run again — Settings' replay row. */
  resetAll: () => Promise<void>;
  /**
   * Bumped by `resetAll`. TourHost keeps a per-mount "already shown" set that
   * outlives a route change, so without a signal to clear it the replay row
   * would do nothing until the app was reloaded.
   */
  resetNonce: number;
  /** Id of the tour whose page has declared itself rendered, or null. */
  readyTourId: string | null;
  setReadyTourId: (tourId: string | null) => void;
}

// Fail open: with no provider mounted, nothing is "active" and nothing is
// "done", so a missing provider means tours still work and modals aren't stuck.
const TourContext = createContext<TourContextValue>({
  tourActive: false,
  setTourActive: () => {},
  tourPending: false,
  setTourPending: () => {},
  isDone: () => false,
  markDone: () => {},
  resetAll: async () => {},
  resetNonce: 0,
  readyTourId: null,
  setReadyTourId: () => {},
});

function readMirror(): string[] {
  try {
    const raw = window.localStorage.getItem(TOURS_MIRROR_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeMirror(ids: string[]) {
  try {
    window.localStorage.setItem(TOURS_MIRROR_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private mode) — the server copy still holds.
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tourActive, setTourActive] = useState(false);
  const [tourPending, setTourPending] = useState(false);
  const [readyTourId, setReadyTourId] = useState<string | null>(null);
  /** Local completions, seeded from the mirror and merged with the server's list. */
  const [localDone, setLocalDone] = useState<string[]>([]);
  const [resetNonce, setResetNonce] = useState(0);
  const backfilled = useRef(false);

  useEffect(() => setLocalDone(readMirror()), []);

  // Union, never intersection: the server is truth across devices, the mirror
  // covers the window before /v1/me resolves and a PATCH that failed to land.
  const done = useMemo(() => {
    const set = new Set(localDone);
    for (const id of user?.toursCompleted ?? []) set.add(id);
    return set;
  }, [localDone, user?.toursCompleted]);

  // One-time backfill of the pre-registry single-tour localStorage flag.
  // Without it, every user who already took the home tour is shown it again the
  // first time this build reaches them.
  useEffect(() => {
    if (backfilled.current || !user) return;
    backfilled.current = true;
    let legacy = false;
    try {
      legacy = window.localStorage.getItem(LEGACY_TOUR_DONE_KEY) === "1";
      if (legacy) window.localStorage.removeItem(LEGACY_TOUR_DONE_KEY);
    } catch {
      return;
    }
    if (!legacy || (user.toursCompleted ?? []).includes("home")) return;
    setLocalDone((prev) => {
      const next = prev.includes("home") ? prev : [...prev, "home"];
      writeMirror(next);
      return next;
    });
    void api.updateMe({ tourCompleted: "home" }).catch(() => {
      // Mirror already has it; the next completion re-attempts the sync anyway.
    });
  }, [user]);

  const isDone = useCallback((tourId: string) => done.has(tourId), [done]);

  const markDone = useCallback((tourId: string) => {
    setLocalDone((prev) => {
      if (prev.includes(tourId)) return prev;
      const next = [...prev, tourId];
      writeMirror(next);
      return next;
    });
    // Append-one, not replace-the-array — see the backend's updateMe.
    void api.updateMe({ tourCompleted: tourId }).catch(() => {
      // Offline or signed out. The mirror keeps the tour from replaying on this
      // device; a second device re-runs it once, which is the acceptable failure.
    });
  }, []);

  const resetAll = useCallback(async () => {
    setLocalDone([]);
    writeMirror([]);
    setResetNonce((n) => n + 1);
    await api.updateMe({ resetTours: true }).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      tourActive,
      setTourActive,
      tourPending,
      setTourPending,
      isDone,
      markDone,
      resetAll,
      resetNonce,
      readyTourId,
      setReadyTourId,
    }),
    [tourActive, tourPending, isDone, markDone, resetAll, resetNonce, readyTourId],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export const useTour = () => useContext(TourContext);

/**
 * Lets a page say "my content is on screen now, the tour may open".
 * Only needed where the tour's targets exist in the DOM while something else
 * still covers them — the splash + welcome modal on home, ReportGeneratingSheet
 * on a report (which can hold the screen for up to 200s).
 */
export function useTourReady(tourId: string, ready: boolean) {
  const { setReadyTourId } = useTour();
  useEffect(() => {
    if (!ready) return;
    setReadyTourId(tourId);
    return () => setReadyTourId(null);
  }, [tourId, ready, setReadyTourId]);
}
