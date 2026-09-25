"use client";

import { useTranslation } from "react-i18next";
import { Minus, Plus, RotateCcw, ImagePlus } from "lucide-react";
import { PLAN_DEFAULTS } from "@/lib/vastu/types";
import { Sheet } from "./ui";

function Stepper({ label, value, onDec, onInc, min, max }: { label: string; value: number; onDec: () => void; onInc: () => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gold/12 bg-surface px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={onDec} disabled={value <= min} aria-label={`${label} -`} className="w-9 h-9 rounded-xl border border-gold/20 text-gold flex items-center justify-center disabled:opacity-30">
          <Minus size={15} />
        </button>
        <span className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
        <button onClick={onInc} disabled={value >= max} aria-label={`${label} +`} className="w-9 h-9 rounded-xl border border-gold/20 text-gold flex items-center justify-center disabled:opacity-30">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

/** Plot shape and size, plus "start over" and tracing a photo of a plan. */
export default function PlotSheet({ open, onClose, sides, onSides, widthU, heightU, onScale, onStartOver, onTrace, tracing }: {
  open: boolean;
  onClose: () => void;
  sides: number;
  onSides: (n: number) => void;
  widthU: number;
  heightU: number;
  onScale: (w: number, h: number) => void;
  onStartOver: () => void;
  onTrace?: () => void;
  tracing?: boolean;
}) {
  const { t } = useTranslation();
  const step = PLAN_DEFAULTS.gridU * 2;
  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.studio.plotTitle", "Home shape")} subtitle={t("vastu.studio.plotHint", "Drag a corner to reshape. Drag a wall's + to add a corner.")}>
      <div className="flex flex-col gap-2">
        <Stepper label={t("vastu.toolbar.sides")} value={sides} onDec={() => onSides(sides - 1)} onInc={() => onSides(sides + 1)} min={PLAN_DEFAULTS.minSides} max={PLAN_DEFAULTS.maxSides} />
        <Stepper label={t("vastu.studio.width", "Width")} value={widthU} onDec={() => onScale(widthU - step, heightU)} onInc={() => onScale(widthU + step, heightU)} min={6} max={40} />
        <Stepper label={t("vastu.studio.length", "Length")} value={heightU} onDec={() => onScale(widthU, heightU - step)} onInc={() => onScale(widthU, heightU + step)} min={6} max={40} />
        {onTrace && (
          <button onClick={onTrace} className="mt-1 flex items-center gap-2 rounded-2xl border border-gold/20 px-3 py-3 text-sm font-semibold text-gold">
            <ImagePlus size={16} /> {tracing ? t("vastu.trace.change", "Change the traced photo") : t("vastu.trace.cta", "Trace over a photo of your plan")}
          </button>
        )}
        <button onClick={onStartOver} className="flex items-center gap-2 rounded-2xl border border-gold/12 px-3 py-3 text-sm text-muted hover:text-foreground">
          <RotateCcw size={15} /> {t("vastu.studio.startOver", "Start over with a new layout")}
        </button>
      </div>
    </Sheet>
  );
}
