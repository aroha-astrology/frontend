"use client";

import { useCallback, useRef, useState } from "react";

export type CompassState = "idle" | "reading" | "aligned" | "unsupported" | "denied";

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

/**
 * Capture-and-hold device compass. Instead of streaming a jittery live heading
 * (which fluctuated wildly and could read impossible values), `capture()`
 * samples for ~1.5s, takes a circular average to smooth sensor noise, sets the
 * orientation ONCE, then stops. One tap, one stable result — much easier to use.
 */
export function useCompass() {
  const [state, setState] = useState<CompassState>("idle");
  const busy = useRef(false);

  const supported =
    typeof window !== "undefined" && typeof window.DeviceOrientationEvent !== "undefined";

  const capture = useCallback(
    async (durationMs = 1500): Promise<{ status: CompassState; heading?: number }> => {
      if (busy.current) return { status: state };
      if (!supported) {
        setState("unsupported");
        return { status: "unsupported" };
      }

      const reqPerm = (window.DeviceOrientationEvent as unknown as { requestPermission?: PermFn })
        .requestPermission;
      if (typeof reqPerm === "function") {
        try {
          if ((await reqPerm()) !== "granted") {
            setState("denied");
            return { status: "denied" };
          }
        } catch {
          setState("denied");
          return { status: "denied" };
        }
      }

      busy.current = true;
      setState("reading");

      // Circular average of all readings in the window smooths magnetometer noise.
      let sumSin = 0;
      let sumCos = 0;
      let count = 0;
      const onEvt = (e: DeviceOrientationEvent) => {
        const h = readingFrom(e);
        if (h == null || Number.isNaN(h)) return;
        const rad = (h * Math.PI) / 180;
        sumSin += Math.sin(rad);
        sumCos += Math.cos(rad);
        count++;
      };
      window.addEventListener("deviceorientationabsolute", onEvt as EventListener);
      window.addEventListener("deviceorientation", onEvt as EventListener);

      await new Promise((r) => setTimeout(r, durationMs));

      window.removeEventListener("deviceorientationabsolute", onEvt as EventListener);
      window.removeEventListener("deviceorientation", onEvt as EventListener);
      busy.current = false;

      if (count === 0) {
        setState("unsupported");
        return { status: "unsupported" };
      }
      const heading = (((Math.atan2(sumSin, sumCos) * 180) / Math.PI) % 360 + 360) % 360;
      setState("aligned");
      return { status: "aligned", heading };
    },
    [supported, state],
  );

  const reset = useCallback(() => setState("idle"), []);

  return { supported, state, capture, reset };
}
