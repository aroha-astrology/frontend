"use client";

import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import type { PanchangTimeWindow } from "@/lib/api";
import { timeToPercent } from "@/lib/panchang/time-window";

interface DayWindowsBarProps {
  rahuKaal?: PanchangTimeWindow;
  abhijitMuhurta?: PanchangTimeWindow;
  /** Shown in a smaller, visually-secondary row beneath the main track — same data, lower emphasis. */
  gulikaKaal?: PanchangTimeWindow;
  yamagandaKaal?: PanchangTimeWindow;
}

/** Horizontal position (%) of a segment's label, clamped so it never clips past the track's edges. */
function labelCenterPercent(leftPct: number, widthPct: number): number {
  return Math.min(96, Math.max(4, leftPct + widthPct / 2));
}

function Segment({ window, colorClass }: { window: PanchangTimeWindow; colorClass: string }) {
  const leftPct = timeToPercent(window.start);
  const widthPct = Math.max(timeToPercent(window.end) - leftPct, 1.5);
  return (
    <div
      className={`absolute inset-y-0 rounded-full ${colorClass}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    />
  );
}

function SegmentLabel({
  window,
  textClass,
  label,
}: {
  window: PanchangTimeWindow;
  textClass: string;
  label: string;
}) {
  const leftPct = timeToPercent(window.start);
  const widthPct = Math.max(timeToPercent(window.end) - leftPct, 1.5);
  const centerPct = labelCenterPercent(leftPct, widthPct);
  return (
    <div
      className="absolute top-full mt-1.5 -translate-x-1/2 text-center whitespace-nowrap"
      style={{ left: `${centerPct}%` }}
    >
      <p className={`text-[10px] font-semibold ${textClass}`}>{label}</p>
      <p className="text-[10px] text-muted font-mono">
        {window.start} – {window.end}
      </p>
    </div>
  );
}

/**
 * One 24h horizontal track (midnight=0%, next midnight=100%) with a red
 * Rahu Kaal segment and a green Abhijit Muhurta segment positioned
 * proportionally by their actual start/end times, each labeled beneath.
 * Gulika Kaal / Yamaganda Kaal render in a smaller secondary row below —
 * still shown, just visually secondary rather than 4 equal-weight cards.
 */
export default function DayWindowsBar({
  rahuKaal,
  abhijitMuhurta,
  gulikaKaal,
  yamagandaKaal,
}: DayWindowsBarProps) {
  const { t } = useTranslation();

  if (!rahuKaal && !abhijitMuhurta && !gulikaKaal && !yamagandaKaal) return null;

  return (
    <div className="mt-5">
      {(rahuKaal || abhijitMuhurta) && (
        <div className="relative">
          <div className="relative h-3 rounded-full bg-surface-2 border border-gold/10 overflow-hidden">
            {rahuKaal && <Segment window={rahuKaal} colorClass="bg-red-500/70" />}
            {abhijitMuhurta && <Segment window={abhijitMuhurta} colorClass="bg-emerald-500/70" />}
          </div>
          {/* Labels sit in a reserved band beneath the track so they never overlap it. */}
          <div className="relative h-9">
            {rahuKaal && (
              <SegmentLabel window={rahuKaal} textClass="text-red-400" label={t("horoscope.panchang.rahuKaal")} />
            )}
            {abhijitMuhurta && (
              <SegmentLabel
                window={abhijitMuhurta}
                textClass="text-emerald-400"
                label={t("horoscope.panchang.abhijitMuhurta")}
              />
            )}
          </div>
        </div>
      )}

      {(gulikaKaal || yamagandaKaal) && (
        <div className="mt-2 flex items-center justify-center gap-5 flex-wrap">
          {gulikaKaal && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <ShieldAlert size={11} className="text-red-400/70" />
              <span className="font-medium text-foreground/80">{t("horoscope.panchang.gulikaKaal")}</span>
              <span className="font-mono">
                {gulikaKaal.start} – {gulikaKaal.end}
              </span>
            </div>
          )}
          {yamagandaKaal && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <ShieldAlert size={11} className="text-red-400/70" />
              <span className="font-medium text-foreground/80">{t("horoscope.panchang.yamagandaKaal")}</span>
              <span className="font-mono">
                {yamagandaKaal.start} – {yamagandaKaal.end}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
