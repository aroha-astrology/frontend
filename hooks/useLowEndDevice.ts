"use client";

import { useEffect, useState } from "react";

/**
 * Returns true when we should NOT render WebGL — low-end hardware, no GPU,
 * or the user prefers reduced motion. Consumers fall back to a CSS visual.
 *
 * Starts `true` (assume low-end) so SSR + first paint render the cheap fallback,
 * then upgrades to 3D after the capability check on the client.
 */
export function useLowEndDevice(): boolean {
  const [lowEnd, setLowEnd] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Hardware hints
    const cores = navigator.hardwareConcurrency ?? 2;
    // @ts-expect-error - deviceMemory is non-standard but widely supported on Android Chrome
    const memory = navigator.deviceMemory ?? 4;

    // WebGL availability
    let hasWebGL = false;
    try {
      const c = document.createElement("canvas");
      hasWebGL = !!(
        c.getContext("webgl2") || c.getContext("webgl")
      );
    } catch {
      hasWebGL = false;
    }

    const weak = reducedMotion || !hasWebGL || cores <= 2 || memory <= 2;
    setLowEnd(weak);
  }, []);

  return lowEnd;
}
