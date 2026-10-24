"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface ZoomRange {
  min: number;
  max: number;
  step: number;
  value: number;
}

interface CameraState {
  status: CameraStatus;
  torchSupported: boolean;
  torchOn: boolean;
  /** Present only when the camera reports a zoom range. */
  zoom: ZoomRange | null;
  /** Pixel size of the stream the phone actually gave us. */
  size: { width: number; height: number } | null;
}

type AdvancedCaps = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
};

const IDLE: CameraState = { status: "idle", torchSupported: false, torchOn: false, zoom: null, size: null };

/**
 * Thin wrapper over getUserMedia — never auto-prompts (same convention as
 * useGeolocation.ts); the caller decides when to call `start()`, e.g. when
 * the capture wizard mounts for a step the user has already chosen to begin.
 * Attaches the stream directly to the given <video> ref rather than exposing
 * the MediaStream, since every consumer in this app just wants a live
 * preview element.
 *
 * 2026-10-24 ("quality is not good"): asks for the best stream the phone has (up to 4K, was
 * 1920x1920), turns on continuous autofocus, and exposes zoom and tap-to-focus where the phone
 * supports them. Every one of those is optional and silently skipped when unsupported.
 */
export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>(IDLE);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState(IDLE);
  }, []);

  const track = () => streamRef.current?.getVideoTracks?.()[0];

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({ ...IDLE, status: "unavailable" });
      return;
    }
    setState((s) => ({ ...s, status: "requesting" }));
    try {
      const stream = await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        })
        .catch(() =>
          // Some phones refuse an oversized ideal on the first try; fall back to the old request.
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1920 } },
            audio: false,
          }),
        );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const t = stream.getVideoTracks()[0];
      const caps = t?.getCapabilities?.() as AdvancedCaps | undefined;
      // Keep refocusing as the hand moves instead of locking on the first frame.
      if (caps?.focusMode?.includes("continuous")) {
        // @ts-expect-error -- focusMode is a real constraint the DOM lib doesn't type yet.
        await t?.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }
      const settings = t?.getSettings?.();
      setState({
        status: "granted",
        torchSupported: Boolean(caps?.torch),
        torchOn: false,
        zoom: caps?.zoom
          ? { ...caps.zoom, value: (settings as { zoom?: number } | undefined)?.zoom ?? caps.zoom.min }
          : null,
        size: settings?.width && settings?.height ? { width: settings.width, height: settings.height } : null,
      });
    } catch {
      setState({ ...IDLE, status: "denied" });
    }
  }, [videoRef]);

  const toggleTorch = useCallback(async () => {
    const t = track();
    if (!t) return;
    const next = !state.torchOn;
    try {
      // @ts-expect-error -- torch is a real, widely-supported constraint the MediaTrackConstraints DOM lib doesn't type yet.
      await t.applyConstraints({ advanced: [{ torch: next }] });
      setState((s) => ({ ...s, torchOn: next }));
    } catch {
      // Some devices report torch support but reject the constraint at runtime — fail silently,
      // the torch button simply has no visible effect rather than crashing the capture flow.
    }
  }, [state.torchOn]);

  const setZoom = useCallback(async (value: number) => {
    const t = track();
    if (!t) return;
    try {
      // @ts-expect-error -- zoom is a real constraint the DOM lib doesn't type yet.
      await t.applyConstraints({ advanced: [{ zoom: value }] });
      setState((s) => (s.zoom ? { ...s, zoom: { ...s.zoom, value } } : s));
    } catch {
      // Unsupported on this phone after all: the slider just doesn't move the picture.
    }
  }, []);

  /** Tap-to-focus at a point of the frame (0-1). Where the phone cannot do a one-shot focus the
   * tap does nothing (continuous autofocus is already running). */
  const focusAt = useCallback(async (x: number, y: number) => {
    const t = track();
    if (!t) return;
    try {
      // @ts-expect-error -- pointsOfInterest/focusMode are real constraints the DOM lib doesn't type yet.
      await t.applyConstraints({ advanced: [{ focusMode: "single-shot", pointsOfInterest: [{ x, y }] }] });
      setTimeout(() => {
        // @ts-expect-error -- see above.
        void t.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }, 1500);
    } catch {
      // Not supported here.
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop, toggleTorch, setZoom, focusAt };
}
