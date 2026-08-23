"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ZapOff, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { sampleFrameBrightness, isLowLight, captureFrameToJpeg } from "@/lib/palm/capture";
import { computeMountRelief } from "@/lib/palm/computeMountRelief";
import {
  checkFrameForHand,
  HAND_CHECK_INTERVAL_MS,
  type HandFraming,
} from "@/lib/palm/liveHandCheck";
import { palmApi, PALM_CAPTURE_SLOTS, type PalmCaptureSlot } from "@/lib/palm-api";
import { ApiError } from "@/lib/api";

const SLOT_INSTRUCTION_KEY: Record<PalmCaptureSlot, string> = {
  primaryFront: "palm.capture.step.primaryFront",
  primaryPercussion: "palm.capture.step.primaryPercussion",
  primaryDorsal: "palm.capture.step.primaryDorsal",
  primaryFingertips: "palm.capture.step.primaryFingertips",
  secondaryFront: "palm.capture.step.secondaryFront",
  secondaryPercussion: "palm.capture.step.secondaryPercussion",
};

interface CapturedFrame {
  blob: Blob;
  previewUrl: string;
}

export default function PalmCaptureWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const camera = useCamera(videoRef);

  const [readingId, setReadingId] = useState<string | null>(null);
  const [primaryHand, setPrimaryHand] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [captured, setCaptured] = useState<Partial<Record<PalmCaptureSlot, CapturedFrame>>>({});
  const [reviewing, setReviewing] = useState<CapturedFrame | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [framing, setFraming] = useState<HandFraming>("none");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const slot = PALM_CAPTURE_SLOTS[stepIndex]!;
  const isLastStep = stepIndex === PALM_CAPTURE_SLOTS.length - 1;

  useDismissOnBackPress(true, onClose);

  // Start (or resume) a reading, then start the camera.
  useEffect(() => {
    let cancelled = false;
    palmApi
      .create()
      .then((res) => {
        if (cancelled) return;
        setReadingId(res.readingId);
        setPrimaryHand(res.primaryHand);
      })
      .catch(() => {
        if (!cancelled) setInitError(t("palm.capture.initError"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void camera.start();
    return camera.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Low-light sampling loop.
  useEffect(() => {
    if (camera.status !== "granted") return;
    const loop = () => {
      const video = videoRef.current;
      const canvas = brightnessCanvasRef.current;
      if (video && canvas) {
        const b = sampleFrameBrightness(video, canvas);
        if (b !== null) setBrightness(b);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [camera.status]);

  // Live hand-framing check — the replacement for the old fixed hand-silhouette overlay.
  // Paused while reviewing a shot (nothing to guide) and torn down with the camera.
  useEffect(() => {
    if (camera.status !== "granted" || reviewing) {
      setFraming("none");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Self-scheduling rather than setInterval: detection latency varies with the device, and
    // an interval shorter than one inference would queue checks up behind each other.
    const tick = async () => {
      const video = videoRef.current;
      const canvas = handCanvasRef.current;
      if (video && canvas) {
        const result = await checkFrameForHand(video, canvas);
        if (cancelled) return;
        setFraming(result);
      }
      if (!cancelled) timer = setTimeout(() => void tick(), HAND_CHECK_INTERVAL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [camera.status, reviewing]);

  const handleManualCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || camera.status !== "granted") return;
    try {
      const blob = await captureFrameToJpeg(video);
      setReviewing({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setUploadError(t("palm.capture.captureError"));
    }
  }, [camera.status, t]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReviewing({ blob: file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const handleRetake = useCallback(() => {
    if (reviewing) URL.revokeObjectURL(reviewing.previewUrl);
    setReviewing(null);
  }, [reviewing]);

  const advanceOrFinish = useCallback(
    async (allFrames: Partial<Record<PalmCaptureSlot, CapturedFrame>>) => {
      if (!isLastStep) {
        setStepIndex((i) => i + 1);
        return;
      }
      if (!readingId) return;
      setFinishing(true);
      setFinishError(null);
      try {
        await palmApi.analyze(readingId);
        Object.values(allFrames).forEach((f) => f && URL.revokeObjectURL(f.previewUrl));
        router.push(`/palm/${readingId}`);
      } catch (err) {
        // analyze() is the FREE scan trigger (no wallet charge) — a 409 here just means this
        // reading is already being processed, never "insufficient credits" (that only applies
        // to the separate paid unlock() call on the report page).
        if (err instanceof ApiError && err.status === 400) {
          setFinishError(t("palm.capture.missingFrames"));
        } else {
          setFinishError(t("palm.capture.analyzeError"));
        }
        setFinishing(false);
      }
    },
    [isLastStep, readingId, router, t],
  );

  const handleUseThisPhoto = useCallback(async () => {
    if (!reviewing || !readingId) return;
    setUploading(true);
    setUploadError(null);
    try {
      await palmApi.uploadFrame(readingId, slot, reviewing.blob);

      // CV mount-relief pass — front-view frames only (the only angle the region geometry in
      // mountRegions.ts is anchored to). Fire-and-forget: this is a purely additive accuracy
      // signal (see palm-rules.ts's cross-validation), never allowed to block or fail the
      // capture flow. MediaPipe WASM load + inference takes a few seconds, which is fine —
      // it only needs to finish before the user reaches "Unlock" later in the flow.
      if (slot === "primaryFront" || slot === "secondaryFront") {
        const hand = slot === "primaryFront" ? "primary" : "secondary";
        void computeMountRelief(reviewing.blob)
          .then(
            (result) =>
              result && palmApi.saveMountRelief(readingId, hand, result.scores, result.regions),
          )
          .catch(() => {});
      }

      const nextCaptured = { ...captured, [slot]: reviewing };
      setCaptured(nextCaptured);
      setReviewing(null);
      setUploading(false);
      await advanceOrFinish(nextCaptured);
    } catch {
      setUploadError(t("palm.capture.uploadError"));
      setUploading(false);
    }
  }, [reviewing, readingId, slot, captured, advanceOrFinish, t]);

  if (initError) {
    return (
      <CaptureShell onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
          <AlertTriangle className="text-amber-400" size={28} />
          <p className="text-sm text-foreground">{initError}</p>
        </div>
      </CaptureShell>
    );
  }

  return (
    <CaptureShell onClose={onClose}>
      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
        {PALM_CAPTURE_SLOTS.map((s, i) => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === stepIndex ? 20 : 6,
              background: captured[s] || i < stepIndex ? "#D4AF37" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>

      {/* Torch */}
      {camera.torchSupported && (
        <button
          type="button"
          onClick={camera.toggleTorch}
          aria-label={t("palm.capture.torch")}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15"
        >
          {camera.torchOn ? <Zap size={16} className="text-gold" /> : <ZapOff size={16} />}
        </button>
      )}

      {/* Camera preview / review / fallback states.
          <video> stays mounted across every status/reviewing change (visibility only,
          via className) so its ref — and the MediaStream useCamera attaches to it —
          survive those transitions. Conditionally mounting/unmounting the tag meant the
          ref was still null when getUserMedia resolved (status was still "requesting"),
          so the stream never got attached and the preview stayed blank even once
          camera.status flipped to "granted". */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${!reviewing && camera.status === "granted" ? "" : "hidden"}`}
        />
        {reviewing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reviewing.previewUrl} alt="" className="w-full h-full object-contain" />
        ) : camera.status === "requesting" ? (
          <p className="text-sm text-white/70">{t("palm.capture.requestingCamera")}</p>
        ) : camera.status !== "granted" ? (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <p className="text-sm text-white/80">
              {camera.status === "denied" ? t("palm.capture.cameraDenied") : t("palm.capture.cameraUnavailable")}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-2xl bg-gold text-[#1a0e00] px-5 py-3 text-sm font-bold"
            >
              <Upload size={16} /> {t("palm.capture.uploadInstead")}
            </button>
          </div>
        ) : null}
        <canvas ref={brightnessCanvasRef} className="hidden" />
        <canvas ref={handCanvasRef} className="hidden" />
      </div>

      {/* Low-light warning */}
      {!reviewing && camera.status === "granted" && isLowLight(brightness) && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/70 backdrop-blur-md px-4 py-2 text-xs text-amber-300 flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {camera.torchSupported ? t("palm.capture.lowLightTorch") : t("palm.capture.lowLight")}
        </div>
      )}

      {/* Live framing hint — replaces the old fixed hand-silhouette overlay. Sits above the
          low-light pill so both can show at once without overlapping. */}
      {!reviewing && camera.status === "granted" && (
        <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/70 backdrop-blur-md px-4 py-2 text-xs flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: framing === "good" ? "#8FBF9F" : "#D4AF37" }}
          />
          <span className={framing === "good" ? "text-[#8FBF9F]" : "text-white/80"}>
            {t(`palm.framing.${framing}`)}
          </span>
        </div>
      )}

      {/* Instruction + captured thumbnails */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent pt-16 pb-8 px-5">
        {!reviewing && (
          <p className="text-center text-sm text-white font-medium mb-4 px-4 leading-relaxed">
            {t(SLOT_INSTRUCTION_KEY[slot])}
          </p>
        )}

        {uploadError && <p className="text-center text-xs text-red-400 mb-2">{uploadError}</p>}
        {finishError && <p className="text-center text-xs text-red-400 mb-2">{finishError}</p>}

        {reviewing ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              disabled={uploading}
              className="flex items-center gap-2 rounded-2xl border border-white/25 text-white px-5 py-3 text-sm font-medium disabled:opacity-50"
            >
              <RotateCcw size={15} /> {t("palm.capture.retake")}
            </button>
            <button
              type="button"
              onClick={handleUseThisPhoto}
              disabled={uploading || finishing}
              className="flex items-center gap-2 rounded-2xl bg-gold text-[#1a0e00] px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              {uploading || finishing ? t("palm.capture.uploading") : t("palm.capture.usePhoto")}
            </button>
          </div>
        ) : camera.status === "granted" ? (
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("palm.capture.uploadInstead")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white/80"
            >
              <Upload size={16} />
            </button>
            {/* Dimmed, never disabled, while no hand is framed: detection can be unavailable
                entirely (CDN blocked, unsupported browser), and a hint must not be able to lock
                the user out of their own capture. */}
            <button
              type="button"
              onClick={handleManualCapture}
              aria-label={t("palm.capture.shutter")}
              className={`h-16 w-16 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-all ${
                framing === "good" ? "" : "opacity-60"
              }`}
            />
            <div className="h-11 w-11" />
          </div>
        ) : null}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileFallback} className="hidden" />
      <div className="hidden">{primaryHand}</div>
    </CaptureShell>
  );
}

function CaptureShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-4 left-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/15"
        >
          <X size={16} />
        </button>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
