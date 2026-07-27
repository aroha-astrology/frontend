"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when the user has "reduce motion" enabled at the OS/browser
 * level. Starts `false` so SSR + first paint don't assume a preference they
 * can't know yet, then syncs on mount and stays live if the setting changes
 * mid-session (unlike a one-shot check, `useLowEndDevice` folds this same
 * media query into its own capability probe but only reads it once at mount —
 * this hook is for consumers, like PlanetOrb3D, that want to keep animating
 * the reduced-motion preference itself, e.g. to hold a spin still.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
