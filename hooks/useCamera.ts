"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface CameraState {
  status: CameraStatus;
  torchSupported: boolean;
  torchOn: boolean;
}

/**
 * Thin wrapper over getUserMedia — never auto-prompts (same convention as
 * useGeolocation.ts); the caller decides when to call `start()`, e.g. when
 * the capture wizard mounts for a step the user has already chosen to begin.
 * Attaches the stream directly to the given <video> ref rather than exposing
 * the MediaStream, since every consumer in this app just wants a live
 * preview element.
 */
export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<CameraState>({
    status: "idle",
    torchSupported: false,
    torchOn: false,
  });
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState({ status: "idle", torchSupported: false, torchOn: false });
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState({ status: "unavailable", torchSupported: false, torchOn: false });
      return;
    }
    setState((s) => ({ ...s, status: "requesting" }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setState({ status: "granted", torchSupported: Boolean(caps?.torch), torchOn: false });
    } catch {
      setState({ status: "denied", torchSupported: false, torchOn: false });
    }
  }, [videoRef]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) return;
    const next = !state.torchOn;
    try {
      // @ts-expect-error -- torch is a real, widely-supported constraint the MediaTrackConstraints DOM lib doesn't type yet.
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setState((s) => ({ ...s, torchOn: next }));
    } catch {
      // Some devices report torch support but reject the constraint at runtime — fail silently,
      // the torch button simply has no visible effect rather than crashing the capture flow.
    }
  }, [state.torchOn]);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop, toggleTorch };
}
