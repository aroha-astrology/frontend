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

/**
 * A small legend chip (dot + label + time range) rather than a label
 * positioned under the track at the segment's own clock-time offset: Rahu
 * Kaal and Abhijit Muhurta both fall within daylight hours, so their
 * proportional positions on a 24h track are often close together — labels
 * anchored to those positions collided and rendered as illegible overlapping
 * text (caught via a real-browser screenshot, not just code review). A plain
 * flex-wrap legend below the track can never overlap regardless of how close
 * the two windows are on the clock.
 */
function WindowLegendChip({
  window,
  dotClass,
  textClass,
  label,
}: {
  window: PanchangTimeWindow;
  dotClass: string;
  textClass: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <span className={`font-semibold ${textClass}`}>{label}</span>
      <span className="text-muted font-mono">
        {window.start} – {window.end}
      </span>
    </div>
  );
}

/**
 * One 24h horizontal track (midnight=0%, next midnight=100%) with a red
 * Rahu Kaal segment and a green Abhijit Muhurta segment positioned
 * proportionally by their actual start/end times, with a legend beneath.
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
        <>
          {/* bg-[var(--border-faint)] rather than bg-surface-2/bg-card: the latter two are near-identical to this card's own background in both themes (surface-2 is literally #FFFFFF in light mode, same as --card), which would make the empty track invisible — border-faint is a warm, theme-aware tint made for exactly this "visible but subtle" fill. */}
          <div className="relative h-3 rounded-full bg-[var(--border-faint)] border border-gold/10 overflow-hidden">
            {rahuKaal && <Segment window={rahuKaal} colorClass="bg-red-500/70" />}
            {abhijitMuhurta && <Segment window={abhijitMuhurta} colorClass="bg-emerald-500/70" />}
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
            {rahuKaal && (
              <WindowLegendChip
                window={rahuKaal}
                dotClass="bg-red-500/70"
                textClass="text-red-400"
                label={t("horoscope.panchang.rahuKaal")}
              />
            )}
            {abhijitMuhurta && (
              <WindowLegendChip
                window={abhijitMuhurta}
                dotClass="bg-emerald-500/70"
                textClass="text-emerald-400"
                label={t("horoscope.panchang.abhijitMuhurta")}
              />
            )}
          </div>
        </>
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
