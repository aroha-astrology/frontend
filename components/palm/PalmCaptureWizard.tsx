"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ZapOff, Upload, RotateCcw, AlertTriangle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { sampleFrameBrightness, isLowLight, captureFrameToJpeg, looksBlurry, FINGERTIP_BOX } from "@/lib/palm/capture";
import { computeMountRelief } from "@/lib/palm/computeMountRelief";
import {
  checkFrameForHandDetailed,
  computeLandmarkMovement,
  HAND_CHECK_INTERVAL_MS,
  type HandFraming,
} from "@/lib/palm/liveHandCheck";
import type { NormalizedLandmark } from "@/lib/palm/mountRegions";
import { palmApi, PALM_CAPTURE_SLOTS, type PalmCaptureSlot } from "@/lib/palm-api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useNewFeature } from "@/hooks/useFeature";
import PalmStepGuide, { SLOT_GUIDE_IMAGE } from "./PalmStepGuide";

interface CapturedFrame {
  blob: Blob;
  previewUrl: string;
  /** The photo looks out of focus: the reader is nudged to retake it (never blocked). */
  blurry?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Which PHYSICAL hand to hold up for this step.
 *
 * V2 captures only the primary hand (3 photos). The hand is resolved from gender by the
 * classical rule (male -> right, female -> left) or chosen explicitly when gender is
 * unset/other.
 */
function handForSlot(primaryHand: string | null, _slot: PalmCaptureSlot): "left" | "right" | null {
  if (primaryHand !== "left" && primaryHand !== "right") return null;
  return primaryHand;
}

export default function PalmCaptureWizard({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const brightnessCanvasRef = useRef<HTMLCanvasElement>(null);
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const camera = useCamera(videoRef);
  const { user, activeProfile } = useAuth();
  // The classical rule picks the main hand by gender (male right, female left). For any other
  // profile there is no rule, so the reader chooses instead of being given the right hand.
  const profileGender = activeProfile?.gender ?? user?.gender;
  const needsHandChoice = profileGender !== "male" && profileGender !== "female";
  const [chosenHand, setChosenHand] = useState<"left" | "right" | null>(null);
  const ready = !needsHandChoice || chosenHand !== null;

  const [readingId, setReadingId] = useState<string | null>(null);
  const [primaryHand, setPrimaryHand] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [captured, setCaptured] = useState<Partial<Record<PalmCaptureSlot, CapturedFrame>>>({});
  const [reviewing, setReviewing] = useState<CapturedFrame | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [framing, setFraming] = useState<HandFraming>("none");
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  // The demo photo for the current step, shown before every shot until "Got it".
  const [guideOpen, setGuideOpen] = useState(true);
  // The live picture's real size. The preview shows the WHOLE frame (object-contain) in a box of
  // exactly this shape, so what the reader sees is what the saved photo holds (it used to be
  // cropped to fill the screen, and the saved photo looked "zoomed out" next to it).
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  /**
   * In-flight frame uploads.
   *
   * Capture used to AWAIT the upload of each frame before moving to the next step, so all three
   * steps are serialized behind a JPEG-sized network round trip on a phone connection — which
   * is what made capture feel slow. Uploads now start immediately and the wizard advances at
   * once; the only place that actually needs them finished is the final analyze() call, which
   * awaits this list. A failed upload surfaces there (the backend also rejects analyze() with a
   * 400 if any slot is missing), so nothing is silently dropped.
   */
  const uploadsRef = useRef<Array<Promise<unknown>>>([]);
  /** The mount-relief POST is fire-and-forget, but analyze() should ideally wait for it so the
   * backend has the landmarks before the scan starts. We race this against a 3s cap. */
  const pendingReliefRef = useRef<Promise<unknown> | null>(null);

  const { enabled: autoCaptureOn } = useNewFeature("palm.autoCapture");
  const prevLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const steadySinceRef = useRef<number | null>(null);
  const autoCapturingRef = useRef(false);

  const slot = PALM_CAPTURE_SLOTS[stepIndex]!;
  const isLastStep = stepIndex === PALM_CAPTURE_SLOTS.length - 1;
  const stepHand = handForSlot(primaryHand, slot);

  useDismissOnBackPress(true, onClose);

  // Start (or resume) a reading, then start the camera.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    palmApi
      .create(chosenHand ?? undefined)
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
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    void camera.start();
    return camera.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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

  const handleManualCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || camera.status !== "granted") return;
    try {
      // The fingertips shot is cut to the box drawn on the preview: only the four fingertips go.
      const blob = await captureFrameToJpeg(
        video,
        0.92,
        2560,
        slot === "primaryFingertips" ? FINGERTIP_BOX : undefined,
      );
      const blurry = (await looksBlurry(blob)) === true;
      setReviewing({ blob, previewUrl: URL.createObjectURL(blob), blurry });
    } catch {
      setUploadError(t("palm.capture.captureError"));
    }
  }, [camera.status, slot, t]);

  // Live hand-framing check — the replacement for the old fixed hand-silhouette overlay.
  // Paused while reviewing a shot (nothing to guide), while the demo photo is up, and torn down
  // with the camera.
  useEffect(() => {
    if (camera.status !== "granted" || reviewing || guideOpen) {
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
        const result = await checkFrameForHandDetailed(video, canvas, autoCaptureOn);
        if (cancelled) return;
        setFraming(result.framing);

        if (autoCaptureOn && !reviewing && result.framing === "good" && result.landmarks) {
          const movement = computeLandmarkMovement(prevLandmarksRef.current, result.landmarks);
          prevLandmarksRef.current = result.landmarks;
          const now = Date.now();
          if (movement < 0.005) {
            if (!steadySinceRef.current) {
              steadySinceRef.current = now;
            } else if (now - steadySinceRef.current >= 800) {
              if (result.sharpness > 40 && !autoCapturingRef.current) {
                autoCapturingRef.current = true;
                steadySinceRef.current = null;
                void handleManualCapture().finally(() => {
                  autoCapturingRef.current = false;
                });
              }
            }
          } else {
            steadySinceRef.current = null;
          }
        } else {
          prevLandmarksRef.current = null;
          steadySinceRef.current = null;
        }
      }
      if (!cancelled) timer = setTimeout(() => void tick(), HAND_CHECK_INTERVAL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [camera.status, reviewing, guideOpen, autoCaptureOn, handleManualCapture]);

  const handleFileFallback = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReviewing({ blob: file, previewUrl: URL.createObjectURL(file) });
  }, []);

  const handleRetake = useCallback(() => {
    if (reviewing) URL.revokeObjectURL(reviewing.previewUrl);
    setReviewing(null);
    prevLandmarksRef.current = null;
    steadySinceRef.current = null;
    autoCapturingRef.current = false;
  }, [reviewing]);

  const advanceOrFinish = useCallback(
    async (allFrames: Partial<Record<PalmCaptureSlot, CapturedFrame>>) => {
      if (!isLastStep) {
        setStepIndex((i) => i + 1);
        setGuideOpen(true);
        return;
      }
      if (!readingId) return;
      setFinishing(true);
      setFinishError(null);
      try {
        // Every frame must have landed before the backend will accept the scan.
        await Promise.all(uploadsRef.current);
        // Best-effort: wait up to 3s for the mount-relief/landmarks POST to land.
        if (pendingReliefRef.current) {
          await Promise.race([pendingReliefRef.current, sleep(3000)]).catch(() => {});
        }
        await palmApi.analyze(readingId, question.trim() || undefined);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLastStep, readingId, router, t, question],
  );

  const handleUseThisPhoto = useCallback(async () => {
    if (!reviewing || !readingId) return;
    setUploadError(null);

    // Fire the upload, do NOT wait for it — see uploadsRef. Errors are captured on the promise
    // so an early failure is reported rather than becoming an unhandled rejection, and the
    // awaited Promise.all in advanceOrFinish still rejects on it.
    const upload = palmApi.uploadFrame(readingId, slot, reviewing.blob);
    upload.catch(() => setUploadError(t("palm.capture.uploadError")));
    uploadsRef.current.push(upload);

    // CV mount-relief pass — front-view frames only (the only angle the region geometry in
    // mountRegions.ts is anchored to). Fire-and-forget: this is a purely additive accuracy
    // signal (see palm-rules.ts's cross-validation), never allowed to block or fail the
    // capture flow, and deliberately NOT added to uploadsRef for the same reason.
    if (slot === "primaryFront") {
      const reliefPromise = computeMountRelief(reviewing.blob)
        .then((result) => {
          if (!result) return;
          const lm = result.landmarks
            ? {
                points: result.landmarks,
                handedness: result.handedness!,
                handednessScore: result.handednessScore!,
                imageWidth: result.imageWidth!,
                imageHeight: result.imageHeight!,
              }
            : undefined;
          return palmApi.saveMountRelief(
            readingId,
            "primary",
            result.scores,
            result.regions,
            lm,
          );
        })
        .catch(() => {});
      pendingReliefRef.current = reliefPromise;
    }

    const nextCaptured = { ...captured, [slot]: reviewing };
    setCaptured(nextCaptured);
    setReviewing(null);
    await advanceOrFinish(nextCaptured);
  }, [reviewing, readingId, slot, captured, advanceOrFinish, t]);

  if (!ready) {
    return (
      <CaptureShell onClose={onClose}>
        <div data-testid="palm-hand-choice" className="flex flex-col items-center gap-4 py-16 px-6 text-center">
          <p className="text-sm text-foreground">{t("palm.capture.chooseHand")}</p>
          <div className="flex gap-3">
            {(["right", "left"] as const).map((hand) => (
              <button
                key={hand}
                onClick={() => setChosenHand(hand)}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-gold border border-gold/40"
              >
                {t(`palm.hand.${hand}`, hand)}
              </button>
            ))}
          </div>
        </div>
      </CaptureShell>
    );
  }

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
      {/* The demo photo for this step, until "Got it". Also covers the camera-denied state, so the
          reader always sees what to shoot before anything else. */}
      <AnimatePresence>
        {guideOpen && !reviewing && (
          <PalmStepGuide
            key={slot}
            slot={slot}
            step={stepIndex + 1}
            total={PALM_CAPTURE_SLOTS.length}
            hand={stepHand}
            onReady={() => setGuideOpen(false)}
          />
        )}
      </AnimatePresence>

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

      {/* The example, always one tap away while shooting. */}
      {!reviewing && !guideOpen && (
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          aria-label={t("palm.guide.show")}
          data-testid="palm-guide-thumb"
          className="absolute left-4 top-16 z-20 overflow-hidden rounded-xl border border-gold/50 shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SLOT_GUIDE_IMAGE[slot]} alt="" className="h-20 w-14 object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[9px] font-semibold text-white">
            {t("palm.guide.example")}
          </span>
        </button>
      )}

      {/* Flashlight: a labelled button, and it pulses when the room is dark. */}
      {camera.torchSupported && !reviewing && (
        <button
          type="button"
          onClick={camera.toggleTorch}
          aria-label={t("palm.capture.torch")}
          aria-pressed={camera.torchOn}
          data-testid="palm-torch"
          className={`absolute top-4 right-4 z-20 flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold backdrop-blur-md ${
            camera.torchOn
              ? "border-gold bg-gold/25 text-gold"
              : `border-white/15 bg-black/60 text-white ${isLowLight(brightness) ? "animate-pulse border-amber-300" : ""}`
          }`}
        >
          {camera.torchOn ? <Zap size={15} /> : <ZapOff size={15} />}
          {camera.torchOn ? t("palm.capture.flashOn") : t("palm.capture.flash")}
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
        <div
          className={!reviewing && camera.status === "granted" ? "relative overflow-hidden" : "hidden"}
          style={previewBoxStyle(videoDims)}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            void camera.focusAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            onLoadedMetadata={(e) => setVideoDims({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
            onResize={(e) => setVideoDims({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
            className="h-full w-full object-contain"
          />
          {slot === "primaryFingertips" && !guideOpen && (
            <div
              data-testid="palm-fingertip-box"
              className="pointer-events-none absolute rounded-2xl border-2 border-gold"
              style={{
                left: `${FINGERTIP_BOX.x * 100}%`,
                top: `${FINGERTIP_BOX.y * 100}%`,
                width: `${FINGERTIP_BOX.w * 100}%`,
                height: `${FINGERTIP_BOX.h * 100}%`,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            >
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-gold">
                {t("palm.capture.fingertipsBox")}
              </span>
            </div>
          )}
        </div>
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
          <div className="mb-4 px-4 space-y-1.5">
            {stepHand && (
              <p className="text-center text-base font-display text-gold">
                {t(stepHand === "right" ? "palm.capture.useRightHand" : "palm.capture.useLeftHand")}
              </p>
            )}
            <p className="text-center text-sm text-white font-medium leading-relaxed">
              {t(`palm.guide.step.${slot}.tip`)}
            </p>
          </div>
        )}

        {uploadError && <p className="text-center text-xs text-red-400 mb-2">{uploadError}</p>}
        {finishError && <p className="text-center text-xs text-red-400 mb-2">{finishError}</p>}

        {reviewing && isLastStep && (
          <input
            type="text"
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("palm.capture.questionPlaceholder", "Ask a question about your palm (optional)")}
            className="mb-3 w-full rounded-2xl border border-white/25 bg-black/50 px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-gold"
          />
        )}

        {reviewing?.blurry && (
          <p data-testid="palm-blurry" className="mb-2 text-center text-xs text-amber-300">
            {t("palm.capture.blurry")}
          </p>
        )}

        {!reviewing && camera.status === "granted" && camera.zoom && camera.zoom.max > camera.zoom.min && (
          <label className="mx-auto mb-3 flex max-w-xs items-center gap-3 text-[11px] text-white/80">
            {t("palm.capture.zoom")}
            <input
              type="range"
              data-testid="palm-zoom"
              min={camera.zoom.min}
              max={camera.zoom.max}
              step={camera.zoom.step || 0.1}
              value={camera.zoom.value}
              onChange={(e) => void camera.setZoom(Number(e.target.value))}
              className="h-1 flex-1 accent-[#D4AF37]"
            />
          </label>
        )}

        {reviewing ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              disabled={finishing}
              className="flex items-center gap-2 rounded-2xl border border-white/25 text-white px-5 py-3 text-sm font-medium disabled:opacity-50"
            >
              <RotateCcw size={15} /> {t("palm.capture.retake")}
            </button>
            <button
              type="button"
              onClick={handleUseThisPhoto}
              disabled={finishing}
              className="flex items-center gap-2 rounded-2xl bg-gold text-[#1a0e00] px-6 py-3 text-sm font-bold disabled:opacity-60"
            >
              {finishing ? t("palm.capture.uploading") : t("palm.capture.usePhoto")}
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
            {/* Never gated on hand detection. The framing text above is a hint; the same
                landmark pass has already proven unreliable on real captures, and making the
                shutter look unavailable on its say-so just slows people down. */}
            <button
              type="button"
              onClick={handleManualCapture}
              aria-label={t("palm.capture.shutter")}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-transform"
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

/** The box the live picture is shown in: the video's own shape, as large as fits the screen. */
function previewBoxStyle(dims: { w: number; h: number } | null): React.CSSProperties {
  if (!dims || dims.w === 0 || dims.h === 0 || typeof window === "undefined") return { width: "100%", height: "100%" };
  const wide = dims.w / dims.h >= window.innerWidth / window.innerHeight;
  return { aspectRatio: `${dims.w} / ${dims.h}`, ...(wide ? { width: "100%" } : { height: "100%" }) };
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
