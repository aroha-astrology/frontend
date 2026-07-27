"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import type { PanchangData } from "@/lib/api";
import Card from "@/components/ui/Card";
import { getVaraLord } from "@/lib/panchang/vara-lord";
import { getPlanet } from "@/components/3d/planet-registry";
import { getFestivalsForDate } from "@/lib/panchang/hindu-festivals";
import { getDayGuidanceKey } from "@/lib/panchang/day-guidance";
import DayWindowsBar from "./DayWindowsBar";

// WebGL is client-only — never render the canvas on the server (same guard MoonBackground.tsx uses).
const PlanetOrb3D = dynamic(() => import("@/components/3d/PlanetOrb3D"), { ssr: false });

interface TithiHeroProps {
  data: PanchangData;
  /** ISO (YYYY-MM-DD) date currently shown — for the festival-pill lookup. `data.date` is a display-formatted string, not this. */
  dateIso: string;
}

/** Isolated on purpose: a small, self-contained slice of TithiHero so the guidance-note
 * wiring stays easy to reason about independently of the rest of the hero's layout. */
function TithiGuidanceNote({ data }: { data: PanchangData }) {
  const { t } = useTranslation();
  if (!data.tithi) return null;
  const key = getDayGuidanceKey({
    tithiNumber: data.tithi.number,
    paksha: data.tithi.paksha,
    vara: data.vara,
    nakshatraName: data.nakshatra?.name,
  });
  return <p className="text-xs text-muted text-center mt-2 max-w-xs mx-auto">{t(key)}</p>;
}

/**
 * The Panchang page's centerpiece: a prominent PlanetOrb3D pinned on today's
 * vara lord (weekday ruling planet), the tithi name/paksha, an optional
 * "ends at / next tithi" note, a festival pill when today has one, and the
 * Rahu Kaal / Abhijit Muhurta dual bar directly beneath — one cohesive
 * hero block rather than separate page sections.
 */
export default function TithiHero({ data, dateIso }: TithiHeroProps) {
  const { t } = useTranslation();
  // Today's actual weekday, not the (possibly different) selected/viewed date —
  // the hero always shows today's ruling planet regardless of which date's
  // panchang facts are being browsed via the calendar above.
  const varaLord = getVaraLord(new Date());
  const glow = getPlanet(varaLord).glow;
  const festivals = getFestivalsForDate(dateIso);

  const tithi = data.tithi;
  const showEndsNote = !!tithi?.endsAt && !!tithi?.nextName;

  return (
    <Card className="p-5 border-gold/15 flex flex-col items-center text-center">
      {/* Soft radial wash behind the orb, using the vara lord's own registry glow color (not a new hardcoded one) — same technique as MoonBackground's atmospheric halo. */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div
          className="absolute -inset-8 rounded-full"
          style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
        />
        <PlanetOrb3D planet={varaLord} cycle={false} className="!absolute inset-0" />
      </div>

      {tithi && (
        <>
          <p className="mt-3 text-[11px] text-gold uppercase tracking-[0.15em]">{tithi.paksha}</p>
          <h2 className="text-2xl font-display text-foreground mt-1">{tithi.name}</h2>
        </>
      )}

      {showEndsNote && (
        <p className="mt-1.5 text-xs text-muted">
          {t("horoscope.panchang.tithiEndsNote", { time: tithi!.endsAt, next: tithi!.nextName })}
        </p>
      )}

      {festivals.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {festivals.map((f) => (
            <span
              key={f.name}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold"
            >
              {f.emoji} {f.name}
            </span>
          ))}
        </div>
      )}

      <TithiGuidanceNote data={data} />

      <div className="w-full">
        <DayWindowsBar
          rahuKaal={data.rahuKaal}
          abhijitMuhurta={data.abhijitMuhurta}
          gulikaKaal={data.gulikaKaal}
          yamagandaKaal={data.yamagandaKaal}
        />
      </div>
    </Card>
  );
}
