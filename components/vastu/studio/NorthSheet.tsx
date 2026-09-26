"use client";

import { useTranslation } from "react-i18next";
import { Compass, Check, Loader2, Lock, RefreshCw, Navigation } from "lucide-react";
import type { CompassState } from "../useCompass";
import { Sheet } from "./ui";

/** Point the plan at real north: the phone's compass, or turn it by hand. */
export default function NorthSheet({ open, onClose, deg, onRotate, onRotateStart, compassState, onAlign, onLock, onRecalibrate, hint }: {
  open: boolean;
  onClose: () => void;
  deg: number;
  onRotate: (deg: number) => void;
  /** Starts one undo step for a slider drag. */
  onRotateStart: () => void;
  compassState: CompassState;
  onAlign: () => void;
  onLock: () => void;
  onRecalibrate: () => void;
  hint: string | null;
}) {
  const { t } = useTranslation();
  const d = Math.round(deg) % 360;
  const reading = compassState === "reading";
  const locked = compassState === "locked";

  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.studio.northTitle", "Point it North")} subtitle={t("vastu.studio.northHint", "Every room's direction depends on where north really is.")}>
      <div className="flex flex-col items-center gap-4">
        {/* Dial */}
        <div className="relative w-36 h-36 rounded-full border border-gold/25 bg-surface flex items-center justify-center" aria-hidden>
          {["N", "E", "S", "W"].map((c, i) => (
            <span key={c} className={`absolute text-[11px] font-bold ${c === "N" ? "text-red-400" : "text-gold/70"}`} style={{ transform: `rotate(${i * 90 - d}deg) translateY(-58px) rotate(${-(i * 90 - d)}deg)` }}>
              {c}
            </span>
          ))}
          <Navigation size={30} className="text-gold transition-transform duration-300" style={{ transform: `rotate(${-d}deg)` }} fill="currentColor" />
          <span className="absolute bottom-7 text-[11px] tabular-nums text-muted">{d}°</span>
        </div>

        {locked ? (
          <div className="flex gap-2 w-full">
            <span className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold bg-emerald-500/12 text-emerald-400 border border-emerald-500/30">
              <Check size={15} /> {t("vastu.compass.aligned")}
            </span>
            <button onClick={onRecalibrate} className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-gold border border-gold/30">
              <RefreshCw size={15} /> {t("vastu.compass.recalibrate")}
            </button>
          </div>
        ) : reading ? (
          <div className="flex flex-col gap-2 w-full">
            <p className="text-center text-xs text-amber-400">{t("vastu.compass.locking")}</p>
            <button onClick={onLock} className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold bg-emerald-500 text-[#04210f]">
              <Lock size={15} /> {t("vastu.toolbar.lock")}
            </button>
          </div>
        ) : (
          <button onClick={onAlign} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold bg-gold text-[#1a0e00]">
            {reading ? <Loader2 size={15} className="animate-spin" /> : <Compass size={16} />}
            {t("vastu.studio.useCompass", "Use my phone's compass")}
          </button>
        )}
        {hint && <p className="text-center text-[11px] text-amber-400">{hint}</p>}

        <div className="w-full">
          <p className="text-[11px] text-muted mb-1.5">{t("vastu.studio.rotateByHand", "Or turn it by hand")}</p>
          <input
            type="range"
            min={0}
            max={359}
            value={d}
            onPointerDown={onRotateStart}
            onChange={(e) => onRotate(Number(e.target.value))}
            className="w-full accent-[#D4AF37] h-7"
            aria-label={t("vastu.toolbar.rotate")}
          />
        </div>
      </div>
    </Sheet>
  );
}
