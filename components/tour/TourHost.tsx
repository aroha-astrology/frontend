"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";
import AppTour from "./AppTour";
import { findTour } from "./tour-registry";

/** How long to keep waiting for a tour's first target to appear before giving up. */
const TARGET_WAIT_MS = 4000;
const TARGET_POLL_MS = 200;

/**
 * The single mount point for every tour. Picks the tour for the current route,
 * checks it hasn't been seen, waits for the page to actually be showing its
 * content, then opens it.
 *
 * One host rather than an <AppTour> per page: a page only needs `data-tour`
 * attributes plus (where something covers the screen first) a `useTourReady`
 * call, and nothing else. It also means `tourActive` has exactly one writer,
 * which is what lets every launch-time modal defer to it.
 */
export default function TourHost() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { isDone, markDone, setTourActive, readyTourId, resetNonce } = useTour();

  const tour = findTour(pathname ?? "");
  const [openTourId, setOpenTourId] = useState<string | null>(null);
  /**
   * Tours already shown during this mount. Load-bearing for the `?tour=1`
   * force-run: that param stays in the URL after the tour finishes, so without
   * this the effect below sees `forced` still true and immediately reopens the
   * tour it just closed, forever. Also covers the ordinary case where markDone's
   * state hasn't propagated by the time the effect re-runs.
   */
  const shownRef = useRef<Set<string>>(new Set());

  // A route change always closes whatever was open — a spotlight measured
  // against the previous page's layout is worse than no tour.
  useEffect(() => {
    setOpenTourId(null);
  }, [pathname]);

  // Settings' replay row cleared every completion; forget what this mount has
  // already shown so the tours can actually run again without a reload.
  useEffect(() => {
    shownRef.current.clear();
  }, [resetNonce]);

  useEffect(() => {
    if (!tour || openTourId === tour.id || shownRef.current.has(tour.id)) return;
    if (loading || !permissionsResolved) return;
    // Tours describe the signed-in app; there is nothing to point at before onboarding.
    if (!user?.profileCompletedAt) return;
    // Pages whose targets are covered by something else on arrival (the splash
    // and welcome modal on home, ReportGeneratingSheet on a report) opt in
    // explicitly via useTourReady rather than being raced.
    if (tour.readyGate && readyTourId !== tour.id) return;

    const forced =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tour") === "1";
    if (!forced && isDone(tour.id)) return;

    // Even past the gates, a data-driven page may not have painted its targets
    // yet. Poll briefly rather than opening onto a screen with nothing to
    // spotlight — every step would filter out and the tour would render nothing.
    let elapsed = 0;
    const hasAnyTarget = () =>
      tour.steps.some((s) => s.target === null || document.querySelector(`[data-tour="${s.target}"]`));

    const open = () => {
      shownRef.current.add(tour.id);
      setOpenTourId(tour.id);
    };

    if (hasAnyTarget()) {
      open();
      return;
    }
    const poll = setInterval(() => {
      elapsed += TARGET_POLL_MS;
      if (hasAnyTarget()) {
        clearInterval(poll);
        open();
      } else if (elapsed >= TARGET_WAIT_MS) {
        clearInterval(poll);
      }
    }, TARGET_POLL_MS);
    return () => clearInterval(poll);
  }, [tour, openTourId, loading, permissionsResolved, user?.profileCompletedAt, readyTourId, resetNonce, isDone]);

  // Publish the flag the launch-time modals gate on. Kept in an effect (not set
  // inside the open/close handlers) so it can never be left stuck true after an
  // unmount or a route change.
  useEffect(() => {
    setTourActive(openTourId !== null);
    return () => setTourActive(false);
  }, [openTourId, setTourActive]);

  if (!tour || openTourId !== tour.id) return null;

  return (
    <AppTour
      key={tour.id}
      steps={tour.steps}
      onFinish={() => {
        markDone(tour.id);
        setOpenTourId(null);
      }}
    />
  );
}
