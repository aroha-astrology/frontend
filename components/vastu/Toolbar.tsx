"use client";

import { useTranslation } from "react-i18next";
import { Compass, Check, Loader2, RotateCcw, Minus, Plus } from "lucide-react";
import { PLAN_DEFAULTS } from "@/lib/vastu/types";
import type { CompassState } from "./useCompass";

function Stepper({ label, value, onDec, onInc, min, max }: { label: string; value: number; onDec: () => void; onInc: () => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted">{label}</span>
      <button onClick={onDec} disabled={min != null && value <= min} className="w-7 h-7 rounded-md border border-gold/20 text-muted hover:text-gold flex items-center justify-center disabled:opacity-30" aria-label={`${label} -`}>
        <Minus size={12} />
      </button>
      <span className="text-xs text-foreground w-6 text-center tabular-nums">{value}</span>
      <button onClick={onInc} disabled={max != null && value >= max} className="w-7 h-7 rounded-md border border-gold/20 text-muted hover:text-gold flex items-center justify-center disabled:opacity-30" aria-label={`${label} +`}>
        <Plus size={12} />
      </button>
    </div>
  );
}

export default function Toolbar({
  northOffsetDeg,
  onRotate,
  compassState,
  onAlign,
  sides,
  onSides,
  widthU,
  heightU,
  onScale,
  onReset,
}: {
  northOffsetDeg: number;
  onRotate: (deg: number) => void;
  compassState: CompassState;
  onAlign: () => void;
  sides: number;
  onSides: (n: number) => void;
  widthU: number;
  heightU: number;
  onScale: (w: number, h: number) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const reading = compassState === "reading";
  const aligned = compassState === "aligned";
  const sizeStep = PLAN_DEFAULTS.gridU * 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onAlign}
          disabled={reading}
          className={"flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-70 " + (aligned ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-gold/10 text-gold border border-gold/30")}
        >
          {reading ? <Loader2 size={13} className="animate-spin" /> : aligned ? <Check size={13} /> : <Compass size={13} />}
          {reading ? t("vastu.compass.reading") : aligned ? t("vastu.compass.aligned") : t("vastu.toolbar.useCompass")}
        </button>
        <button onClick={onReset} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted border border-gold/15 hover:text-gold transition-colors ml-auto">
          <RotateCcw size={13} />
          {t("vastu.toolbar.reset")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <RotateCcw size={13} className="text-muted shrink-0" />
        <input type="range" min={0} max={359} value={Math.round(northOffsetDeg) % 360} onChange={(e) => onRotate(Number(e.target.value))} className="flex-1 accent-[#D4AF37] h-6" aria-label={t("vastu.toolbar.rotate")} />
        <span className="text-[11px] text-muted w-9 text-right tabular-nums">{Math.round(northOffsetDeg) % 360}°</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Stepper label={t("vastu.toolbar.sides")} value={sides} onDec={() => onSides(sides - 1)} onInc={() => onSides(sides + 1)} min={PLAN_DEFAULTS.minSides} max={PLAN_DEFAULTS.maxSides} />
        <Stepper label="W" value={widthU} onDec={() => onScale(widthU - sizeStep, heightU)} onInc={() => onScale(widthU + sizeStep, heightU)} min={6} max={40} />
        <Stepper label="H" value={heightU} onDec={() => onScale(widthU, heightU - sizeStep)} onInc={() => onScale(widthU, heightU + sizeStep)} min={6} max={40} />
      </div>
    </div>
  );
}
