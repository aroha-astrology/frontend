"use client";

import { useCallback, useState } from "react";

export type GeolocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface GeolocationState {
  status: GeolocationStatus;
  coords: { lat: number; lon: number } | null;
  locationName?: string | null;
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
      setState({ status: "unavailable", coords: null, locationName: null });
      return;
    }
    setState((s) => ({ ...s, status: "requesting" }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        let locationName = null;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          locationName = data.address?.city || data.address?.town || data.address?.village || data.address?.state || data.name || null;
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
        setState({
          status: "granted",
          coords: { lat, lon },
          locationName,
        });
      },
      () => {
        setState({ status: "denied", coords: null, locationName: null });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }, []);

  return { ...state, request };
}
