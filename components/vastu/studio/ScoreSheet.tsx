"use client";

import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertTriangle, MinusCircle, Circle } from "lucide-react";
import type { ScoreBreakdown, Signal } from "@/lib/vastu/breakdown";
import { AnimatedNumber, ScoreRing, Sheet, scoreColor } from "./ui";

const SIGNAL = {
  good: { Icon: CheckCircle2, cls: "text-emerald-400" },
  ok: { Icon: CheckCircle2, cls: "text-lime-400" },
  check: { Icon: AlertTriangle, cls: "text-amber-400" },
  none: { Icon: MinusCircle, cls: "text-muted" },
} as const;

function Row({ label, value, signal }: { label: string; value: string; signal: Signal }) {
  const { Icon, cls } = SIGNAL[signal];
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-gold/8 last:border-0">
      <Icon size={16} className={cls} />
      <span className="text-sm text-foreground flex-1">{label}</span>
      <span className="text-[12px] text-muted text-right">{value}</span>
    </div>
  );
}

/** Tap the score: what's behind it. Only room placement makes the number. */
export default function ScoreSheet({ open, onClose, score, hasRooms, breakdown }: {
  open: boolean;
  onClose: () => void;
  score: number;
  hasRooms: boolean;
  breakdown: ScoreBreakdown;
}) {
  const { t } = useTranslation();
  const b = breakdown;
  const bar = (n: number, color: string) => (n ? <div style={{ flex: n, background: color }} /> : null);
  return (
    <Sheet open={open} onClose={onClose} title={t("vastu.studio.scoreTitle", "Aroha Vastu Score")} subtitle={t("vastu.studio.scoreBasis", "Based on Aroha's selected Vastu rule set — a guide, not a measurement.")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <ScoreRing score={score} size={76} stroke={6} empty={!hasRooms} />
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold" style={{ color: hasRooms ? scoreColor(score) : undefined }}>
              {hasRooms ? <AnimatedNumber value={score} /> : "–"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex h-2 rounded-full overflow-hidden bg-gold/10 mb-2">
              {bar(b.aligned, "#21D88A")}
              {bar(b.acceptable, "#A3E635")}
              {bar(b.average + b.onCentre, "#F3C74B")}
              {bar(b.correction, "#FF6767")}
            </div>
            <p className="text-[12px] text-foreground/85">
              {t("vastu.studio.countsLine", "{{a}} aligned · {{b}} acceptable · {{c}} to correct", { a: b.aligned, b: b.acceptable + b.average + b.onCentre, c: b.correction })}
            </p>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold/80 mb-1">{t("vastu.studio.counts", "Counts toward the score")}</p>
          <Row label={t("vastu.studio.roomPlacement", "Room placement")} value={t("vastu.studio.weighted", "weighted by room importance")} signal={b.correction ? "check" : b.aligned ? "good" : "none"} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold/80 mb-1">{t("vastu.studio.signals", "Worth checking (not scored)")}</p>
          <Row label={t("vastu.studio.entrance", "Entrance")} value={b.entrance === "none" ? t("vastu.studio.entranceNone", "add an Entrance with a door") : b.entrance === "good" ? t("vastu.studio.good", "well placed") : b.entrance === "ok" ? t("vastu.studio.ok", "acceptable") : t("vastu.studio.check", "worth a look")} signal={b.entrance} />
          <Row label={t("vastu.studio.centreRow", "Centre (Brahmasthan)")} value={b.centre === "good" ? t("vastu.studio.centreOpen", "kept open") : t("vastu.studio.centreBlocked", "a room sits on it")} signal={b.centre} />
          <Row label={t("vastu.studio.plotShape", "Plot shape")} value={b.plotShape === "good" ? t("vastu.studio.regular", "regular") : t("vastu.studio.irregular", "{{n}} sides — cut corners matter", { n: b.plotSides })} signal={b.plotShape} />
        </div>
        <p className="flex items-center gap-1.5 text-[10.5px] text-muted"><Circle size={8} /> {t("vastu.studio.scoreFootnote", "The score reflects this rule set only; it doesn't predict real-world outcomes.")}</p>
      </div>
    </Sheet>
  );
}
