"use client";

import { useTranslation } from "react-i18next";
import { Compass, Lock, RotateCcw, Minus, Plus } from "lucide-react";
import { PLAN_DEFAULTS } from "@/lib/vastu/types";

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const step = PLAN_DEFAULTS.gridU * 2;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted w-4">{label}</span>
      <button
        onClick={() => onChange(value - step)}
        className="w-6 h-6 rounded-md border border-gold/20 text-muted hover:text-gold flex items-center justify-center"
        aria-label={`${label} -`}
      >
        <Minus size={12} />
      </button>
      <span className="text-xs text-foreground w-6 text-center tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + step)}
        className="w-6 h-6 rounded-md border border-gold/20 text-muted hover:text-gold flex items-center justify-center"
        aria-label={`${label} +`}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

export default function Toolbar({
  northOffsetDeg,
  onRotate,
  compassActive,
  onCompassToggle,
  widthU,
  heightU,
  onHouseSize,
  onReset,
}: {
  northOffsetDeg: number;
  onRotate: (deg: number) => void;
  compassActive: boolean;
  onCompassToggle: () => void;
  widthU: number;
  heightU: number;
  onHouseSize: (w: number, h: number) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onCompassToggle}
          className={
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
            (compassActive
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-gold/10 text-gold border border-gold/30")
          }
        >
          {compassActive ? <Lock size={13} /> : <Compass size={13} />}
          {compassActive ? t("vastu.toolbar.lock") : t("vastu.toolbar.useCompass")}
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted border border-gold/15 hover:text-gold transition-colors ml-auto"
        >
          <RotateCcw size={13} />
          {t("vastu.toolbar.reset")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <RotateCcw size={13} className="text-muted shrink-0" />
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(northOffsetDeg)}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="flex-1 accent-[#D4AF37]"
          aria-label={t("vastu.toolbar.rotate")}
        />
        <span className="text-[11px] text-muted w-9 text-right tabular-nums">
          {Math.round(northOffsetDeg)}°
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[11px] text-muted">{t("vastu.toolbar.resizeHouse")}</span>
        <Stepper label="W" value={widthU} onChange={(v) => onHouseSize(v, heightU)} />
        <Stepper label="H" value={heightU} onChange={(v) => onHouseSize(widthU, v)} />
      </div>
    </div>
  );
}
