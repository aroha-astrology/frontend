"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CompassState = "idle" | "reading" | "locked" | "unsupported" | "denied";

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
type PermFn = () => Promise<"granted" | "denied">;

function readingFrom(e: DeviceOrientationEvent): number | null {
  const evt = e as DeviceOrientationEventiOS;
  if (typeof evt.webkitCompassHeading === "number") return evt.webkitCompassHeading;
  if (typeof e.alpha === "number") return (360 - e.alpha) % 360;
  return null;
}

// Shortest-path circular lerp so the needle doesn't spin the long way round
// when a reading crosses the 0°/360° seam.
function smooth(prev: number | null, next: number, factor = 0.35): number {
  if (prev == null) return next;
  const delta = (((next - prev + 180) % 360) + 360) % 360 - 180;
  return (prev + delta * factor + 360) % 360;
}

/**
 * Live device compass. `start()` streams device-orientation readings
 * continuously (lightly smoothed to tame magnetometer jitter) so the ring
 * tracks the phone in real time. `lock()` freezes the current heading and
 * stops listening; `recalibrate()` resumes live streaming from a fresh read.
 */
export function useCompass() {
  const [state, setState] = useState<CompassState>("idle");
  const [heading, setHeading] = useState<number | null>(null);
  const headingRef = useRef<number | null>(null);
  const listenerRef = useRef<((e: Event) => void) | null>(null);

  const supported =
    typeof window !== "undefined" && typeof window.DeviceOrientationEvent !== "undefined";

  const stopListening = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener("deviceorientationabsolute", listenerRef.current);
      window.removeEventListener("deviceorientation", listenerRef.current);
      listenerRef.current = null;
    }
  }, []);

  const start = useCallback(async (): Promise<CompassState> => {
    if (!supported) {
      setState("unsupported");
      return "unsupported";
    }

    const reqPerm = (window.DeviceOrientationEvent as unknown as { requestPermission?: PermFn })
      .requestPermission;
    if (typeof reqPerm === "function") {
      try {
        if ((await reqPerm()) !== "granted") {
          setState("denied");
          return "denied";
        }
      } catch {
        setState("denied");
        return "denied";
      }
    }

    stopListening();
    headingRef.current = null;

    const onEvt = (e: Event) => {
      const h = readingFrom(e as DeviceOrientationEvent);
      if (h == null || Number.isNaN(h)) return;
      const next = smooth(headingRef.current, h);
      headingRef.current = next;
      setHeading(next);
    };
    listenerRef.current = onEvt;
    window.addEventListener("deviceorientationabsolute", onEvt);
    window.addEventListener("deviceorientation", onEvt);
    setState("reading");
    return "reading";
  }, [supported, stopListening]);

  const lock = useCallback(() => {
    stopListening();
    setState((s) => (s === "reading" ? "locked" : s));
  }, [stopListening]);

  const recalibrate = useCallback(() => {
    void start();
  }, [start]);

  const reset = useCallback(() => {
    stopListening();
    headingRef.current = null;
    setHeading(null);
    setState("idle");
  }, [stopListening]);

  useEffect(() => stopListening, [stopListening]);

  return { supported, state, heading, start, lock, recalibrate, reset };
}
