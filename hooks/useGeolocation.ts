"use client";

import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface GeolocationState {
  status: GeolocationStatus;
  coords: { lat: number; lon: number } | null;
}

/**
 * Thin wrapper over the browser Geolocation API — never auto-prompts (that's
 * a jarring pattern on first load); the caller decides when to call
 * `request()`, e.g. from a button or once on a page the user navigated to
 * intentionally.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle", coords: null });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", coords: null });
      return;
    }
    setState((s) => ({ ...s, status: "requesting" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: "granted",
          coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        });
      },
      () => {
        setState({ status: "denied", coords: null });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }, []);

  return { ...state, request };
}
