"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Lock, Trash2 } from "lucide-react";
import { downscaleImage, fitTraceToPlot, type TraceBBox, type TraceImage } from "@/lib/vastu/trace";
import { Eyebrow, Sheet } from "./ui";

const NUDGE = 0.25;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function Slider({ label, value, display, min, max, step, onChange, testId }: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testId?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-2xl border border-gold/12 bg-surface px-3 py-2">
      <span className="flex items-center justify-between text-sm text-foreground">
        {label}
        <span className="text-xs text-muted tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        data-testid={testId}
        className="w-full accent-[#DFB564]"
      />
    </label>
  );
}

/** Pick a photo of a floor plan and line it up under the plan for tracing. */
export default function TraceSheet({ open, onClose, trace, onChange, onRemove, plotBBox }: {
  open: boolean;
  onClose: () => void;
  trace: TraceImage | null;
  onChange: (t: TraceImage) => void;
  onRemove: () => void;
  plotBBox: TraceBBox;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = () => {
    setError(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const img = await downscaleImage(file);
      const fit = fitTraceToPlot(img.width, img.height, plotBBox);
      onChange({ ...img, ...fit, rotation: 0, opacity: trace?.opacity ?? 0.4 });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(
        code === "TOO_LARGE"
          ? t("vastu.trace.errTooLarge", "That photo is too large. Please pick one under 15 MB.")
          : code === "NOT_IMAGE"
            ? t("vastu.trace.errNotImage", "That file isn't an image we can open. Try a JPG or PNG photo.")
            : t("vastu.trace.errGeneric", "We couldn't open that photo. Please try another."),
      );
    } finally {
      setBusy(false);
    }
  };

  // Size slider is relative to the fit for the current plot, scaled about the image centre.
  const baseScale = trace ? fitTraceToPlot(trace.width, trace.height, plotBBox).scale : 1;
  const sizeFactor = trace ? clamp(trace.scale / baseScale, 0.5, 2) : 1;
  const setSize = (f: number) => {
    if (!trace) return;
    const scale = baseScale * f;
    const cx = trace.x + (trace.width * trace.scale) / 2;
    const cy = trace.y + (trace.height * trace.scale) / 2;
    onChange({ ...trace, scale, x: cx - (trace.width * scale) / 2, y: cy - (trace.height * scale) / 2 });
  };
  const nudge = (dx: number, dy: number) => trace && onChange({ ...trace, x: trace.x + dx, y: trace.y + dy });

  const nudgeBtn = "w-10 h-10 rounded-xl border border-gold/20 text-gold flex items-center justify-center active:scale-95";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={trace ? t("vastu.trace.change", "Change the traced photo") : t("vastu.trace.cta", "Trace over a photo of your plan")}
      subtitle={t("vastu.trace.subtitle", "Your photo shows faintly under the plan so you can line things up by hand.")}
    >
      <div className="flex flex-col gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={onFile}
          data-testid="vastu-trace-file"
          aria-label={t("vastu.trace.pick", "Choose a photo of your floor plan")}
        />

        {!trace ? (
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gold px-3 py-3 text-sm font-semibold text-[#1a0e00] disabled:opacity-50"
          >
            <ImagePlus size={16} />
            {busy ? t("vastu.trace.loading", "Opening photo…") : t("vastu.trace.pick", "Choose a photo of your floor plan")}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trace.dataUrl}
                alt={t("vastu.trace.thumbAlt", "Your floor plan photo")}
                className="h-16 w-16 shrink-0 rounded-xl border border-gold/20 object-cover"
              />
              <p className="text-xs text-muted">{t("vastu.trace.adjustHint", "Adjust the photo until its outer walls sit on the plot.")}</p>
            </div>
            <Slider
              label={t("vastu.trace.opacity", "Photo visibility")}
              value={trace.opacity}
              display={`${Math.round(trace.opacity * 100)}%`}
              min={0.1}
              max={0.8}
              step={0.05}
              onChange={(v) => onChange({ ...trace, opacity: v })}
              testId="vastu-trace-opacity"
            />
            <Slider
              label={t("vastu.trace.size", "Photo size")}
              value={sizeFactor}
              display={`×${sizeFactor.toFixed(2)}`}
              min={0.5}
              max={2}
              step={0.01}
              onChange={setSize}
              testId="vastu-trace-size"
            />
            <Slider
              label={t("vastu.trace.rotation", "Straighten")}
              value={trace.rotation}
              display={`${trace.rotation.toFixed(1)}°`}
              min={-45}
              max={45}
              step={0.5}
              onChange={(v) => onChange({ ...trace, rotation: v })}
              testId="vastu-trace-rotation"
            />
            <div className="flex items-center justify-between rounded-2xl border border-gold/12 bg-surface px-3 py-2">
              <span className="text-sm text-foreground">{t("vastu.trace.nudge", "Nudge")}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => nudge(-NUDGE, 0)} aria-label={t("vastu.trace.nudgeLeft", "Move photo left")} className={nudgeBtn}><ArrowLeft size={15} /></button>
                <button type="button" onClick={() => nudge(0, -NUDGE)} aria-label={t("vastu.trace.nudgeUp", "Move photo up")} className={nudgeBtn}><ArrowUp size={15} /></button>
                <button type="button" onClick={() => nudge(NUDGE, 0)} aria-label={t("vastu.trace.nudgeRight", "Move photo right")} className={nudgeBtn}><ArrowRight size={15} /></button>
                <button type="button" onClick={() => nudge(0, NUDGE)} aria-label={t("vastu.trace.nudgeDown", "Move photo down")} className={nudgeBtn}><ArrowDown size={15} /></button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pick}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gold/20 px-3 py-3 text-sm font-semibold text-gold disabled:opacity-50"
              >
                <ImagePlus size={15} /> {busy ? t("vastu.trace.loading", "Opening photo…") : t("vastu.trace.replace", "Replace photo")}
              </button>
              <button
                type="button"
                onClick={onRemove}
                data-testid="vastu-trace-remove"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gold/12 px-3 py-3 text-sm text-muted hover:text-foreground"
              >
                <Trash2 size={15} /> {t("vastu.trace.remove", "Remove photo")}
              </button>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-[#FF6767]/40 bg-[#FF6767]/10 px-3 py-2 text-xs text-[#FF6767]">
            {error}
          </p>
        )}

        <div>
          <Eyebrow className="mb-1.5">{t("vastu.trace.stepsTitle", "How to trace")}</Eyebrow>
          <ol className="flex flex-col gap-1 text-xs text-foreground/85 list-decimal pl-4">
            <li>{t("vastu.trace.step1", "Drag the plot corners onto the outer walls.")}</li>
            <li>{t("vastu.trace.step2", "Add rooms and drag them over the photo.")}</li>
            <li>{t("vastu.trace.step3", "Point it North.")}</li>
          </ol>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] text-muted">
          <Lock size={12} className="mt-0.5 shrink-0" />
          {t("vastu.trace.privacy", "Your photo stays on this device and isn't uploaded.")}
        </p>
      </div>
    </Sheet>
  );
}
