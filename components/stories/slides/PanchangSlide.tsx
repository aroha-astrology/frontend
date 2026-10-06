"use client";

import { useTranslation } from "react-i18next";
import { Sunrise, Sunset } from "lucide-react";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { getDayGuidanceKey } from "@/lib/panchang/day-guidance";
import { getFestivalsForDate } from "@/lib/panchang/hindu-festivals";
import { formatClock, formatClockRange, moonLitPath, moonPhase } from "@/lib/stories/format";
import { STORY_CAPS, StoryLabel, StorySkeleton, StoryTile, StoryUnavailable, type StoryMode } from "../StoryFrame";

/** The day's Moon, drawn from the tithi: a lit sliver on a dim disc, with a halo. */
function MoonGlyph({ tithiNumber }: { tithiNumber: number }) {
  const { lit, waxing } = moonPhase(tithiNumber);
  return (
    <svg viewBox="-30 -30 60 60" className="h-16 w-16" aria-hidden>
      <defs>
        <radialGradient id="story-moon-halo">
          <stop offset="55%" stopColor="rgba(244,214,117,0.35)" />
          <stop offset="100%" stopColor="rgba(244,214,117,0)" />
        </radialGradient>
      </defs>
      <circle r="30" fill="url(#story-moon-halo)" />
      <circle r="20" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
      <path d={moonLitPath(lit, 20)} fill="#F6E7B4" transform={waxing ? undefined : "scale(-1 1)"} />
    </svg>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <StoryTile>
      <StoryLabel>{label}</StoryLabel>
      <p className="mt-1 truncate text-[15px] font-semibold leading-tight text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-white/60">{sub}</p>}
    </StoryTile>
  );
}

/** A "best" (green) or "avoid" (red) time window. Colours are literal: the stories keep their own palette in both app themes. */
function Window({ tone, label, name, range }: { tone: "good" | "avoid"; label: string; name: string; range: string }) {
  const colour = tone === "good" ? "#7BE3A8" : "#FF9C8A";
  return (
    <div
      className="min-w-0 flex-1 rounded-2xl border px-3.5 py-2.5"
      style={{ borderColor: `${colour}40`, background: `${colour}14` }}
    >
      <p className={`text-[10px] font-semibold ${STORY_CAPS}`} style={{ color: colour }}>
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-white">{name}</p>
      <p className="truncate text-[11px] text-white/70">{range}</p>
    </div>
  );
}

/**
 * Today's Panchang as one glance: the tithi and its Moon, when it ends, the
 * day's festival, the other four limbs, sunrise and sunset, and the one
 * window to use and the one to avoid.
 */
export default function PanchangSlide({ data, mode }: { data: DailyStoriesData; mode: StoryMode }) {
  const { t } = useTranslation();

  if (data.panchangState === "loading") return <StorySkeleton />;
  const p = data.panchang;
  if (!p?.tithi) return <StoryUnavailable message={t("stories.unavailable")} />;

  const tithi = p.tithi;
  const festivals = getFestivalsForDate(data.day).slice(0, 2);
  const nakshatra = p.nakshatra
    ? t(`nakshatraNames.${p.nakshatra.name.toLowerCase()}`, { defaultValue: p.nakshatra.name })
    : null;
  const guidanceKey = getDayGuidanceKey({
    tithiNumber: tithi.number,
    paksha: tithi.paksha,
    vara: p.vara,
    nakshatraName: p.nakshatra?.name,
  });

  return (
    <div className="flex flex-col items-center text-center" data-testid="story-panchang">
      <MoonGlyph tithiNumber={tithi.number} />
      <p className={`mt-2 text-[11px] font-semibold ${STORY_CAPS}`} style={{ color: "var(--story-accent)" }}>
        {tithi.paksha}
      </p>
      <h2 className="mt-1 font-display text-[2.4rem] leading-none text-white">{tithi.name}</h2>
      {tithi.endsAt && tithi.nextName && (
        <p className="mt-2 text-xs text-white/70">
          {t("horoscope.panchang.tithiEndsNote", { time: formatClock(tithi.endsAt), next: tithi.nextName })}
        </p>
      )}

      {festivals.length > 0 && (
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {festivals.map((f) => (
            <span
              key={f.name}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white"
            >
              {f.emoji} {f.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
        {nakshatra && (
          <Fact
            label={t("horoscope.panchang.nakshatra")}
            value={nakshatra}
            sub={p.nakshatra?.endsAt ? t("stories.panchang.endsAt", { time: formatClock(p.nakshatra.endsAt) }) : undefined}
          />
        )}
        {p.vara && <Fact label={t("horoscope.panchang.vaar")} value={p.vara} />}
        {p.yoga && <Fact label={t("horoscope.panchang.yoga")} value={p.yoga.name} />}
        {p.karana && <Fact label={t("horoscope.panchang.karana")} value={p.karana.name} />}
      </div>

      {(p.sunriseTime || p.sunsetTime) && (
        <StoryTile className="mt-2 flex w-full items-center justify-around !py-2.5 text-[13px] text-white">
          {p.sunriseTime && (
            <span className="flex items-center gap-1.5">
              <Sunrise size={15} style={{ color: "var(--story-accent)" }} />
              <span className="text-white/60">{t("horoscope.panchang.sunrise")}</span>
              <span className="font-semibold">{formatClock(p.sunriseTime)}</span>
            </span>
          )}
          {p.sunsetTime && (
            <span className="flex items-center gap-1.5">
              <Sunset size={15} style={{ color: "var(--story-accent)" }} />
              <span className="text-white/60">{t("horoscope.panchang.sunset")}</span>
              <span className="font-semibold">{formatClock(p.sunsetTime)}</span>
            </span>
          )}
        </StoryTile>
      )}

      {(p.abhijitMuhurta || p.rahuKaal) && (
        <div className="mt-2 flex w-full gap-2 text-left">
          {p.abhijitMuhurta && (
            <Window
              tone="good"
              label={t("stories.panchang.best")}
              name={t("horoscope.panchang.abhijitMuhurta")}
              range={formatClockRange(p.abhijitMuhurta.start, p.abhijitMuhurta.end)}
            />
          )}
          {p.rahuKaal && (
            <Window
              tone="avoid"
              label={t("stories.panchang.avoid")}
              name={t("horoscope.panchang.rahuKaal")}
              range={formatClockRange(p.rahuKaal.start, p.rahuKaal.end)}
            />
          )}
        </div>
      )}

      {/* Extras for a tall screen only: on a short phone the facts above already fill it. */}
      {mode === "view" && (
        <div className="[@media(max-height:780px)]:hidden">
          <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-white/70">{t(guidanceKey)}</p>
          {data.referenceLocation && (
            <p className="mt-2 text-[10px] text-white/40">{t("horoscope.panchang.referenceLocation")}</p>
          )}
        </div>
      )}
    </div>
  );
}
