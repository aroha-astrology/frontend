"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CompassStatus = "idle" | "active" | "denied" | "unsupported";

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
type PermFn = () => Promise<"granted" | "denied">;

/**
 * Live device-compass heading (degrees, real-world bearing of the phone's top
 * edge). Works inside the Capacitor WebView via the Web DeviceOrientation API;
 * gracefully reports "unsupported" on desktop so the caller can fall back to
 * manual rotation.
 *
 * @param onHeading called on every reading while active.
 */
export function useCompass(onHeading: (deg: number) => void) {
  const [status, setStatus] = useState<CompassStatus>("idle");
  const cbRef = useRef(onHeading);
  cbRef.current = onHeading;

  const supported =
    typeof window !== "undefined" && typeof window.DeviceOrientationEvent !== "undefined";

  const handler = useCallback((e: DeviceOrientationEvent) => {
    const evt = e as DeviceOrientationEventiOS;
    let heading: number | null = null;
    if (typeof evt.webkitCompassHeading === "number") {
      heading = evt.webkitCompassHeading; // iOS: already clockwise from north
    } else if (typeof e.alpha === "number") {
      heading = (360 - e.alpha) % 360; // Android absolute: derive bearing
    }
    if (heading != null && !Number.isNaN(heading)) {
      cbRef.current(((heading % 360) + 360) % 360);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("deviceorientationabsolute", handler as EventListener);
    window.removeEventListener("deviceorientation", handler as EventListener);
    setStatus("idle");
  }, [handler]);

  const start = useCallback(async (): Promise<CompassStatus> => {
    if (!supported) {
      setStatus("unsupported");
      return "unsupported";
    }
    // iOS 13+ requires an explicit permission gesture.
    const reqPerm = (window.DeviceOrientationEvent as unknown as { requestPermission?: PermFn })
      .requestPermission;
    if (typeof reqPerm === "function") {
      try {
        const res = await reqPerm();
        if (res !== "granted") {
          setStatus("denied");
          return "denied";
        }
      } catch {
        setStatus("denied");
        return "denied";
      }
    }
    window.addEventListener("deviceorientationabsolute", handler as EventListener);
    window.addEventListener("deviceorientation", handler as EventListener);
    setStatus("active");
    return "active";
  }, [supported, handler]);

  useEffect(() => stop, [stop]);

  return { supported, status, start, stop };
}
