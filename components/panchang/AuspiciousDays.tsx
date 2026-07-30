"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Briefcase, GraduationCap, Plane, Home as HomeIcon, HeartPulse, Heart } from "lucide-react";
import { api, type PanchangMonthDay } from "@/lib/api";
import Card from "@/components/ui/Card";
import { buildKey, cacheGet, cacheSet, roundCoord } from "@/lib/cache";
import { istToday } from "@/lib/period-expiry";
import {
  evaluateMuhurtaCategory,
  findUpcomingFavorableDays,
  type MuhurtaCategoryId,
  type MuhurtaTone,
} from "@/lib/panchang/muhurta-categories";

/**
 * "Check Auspicious Days" — a self-contained category strip + verdict card.
 * Takes no required props: it fetches its own panchang-month data (current
 * month, plus next month once we're within a week of month-end so there are
 * always a handful of upcoming dates to show), evaluates every category
 * against lib/panchang/muhurta-categories.ts, and renders the result. A
 * later task drops <AuspiciousDays /> straight into app/panchang/page.tsx.
 *
 * A calendar month's per-day panchang summaries are immutable once computed
 * — same fixed-TTL hard cache, same cache-key shape (buildKey("panchangMonth",
 * year, month, lat?, lon?)) as components/panchang/MonthlyPanchangCalendar.tsx,
 * so the two components share cache entries instead of double-fetching.
 */
const PANCHANG_MONTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How many days must remain in the current month before we also fetch next month, so there's always a real week+ of upcoming dates to scan. */
const NEXT_MONTH_LOOKAHEAD_DAYS = 7;

interface AuspiciousDaysProps {
  lat?: number;
  lon?: number;
}

const CATEGORY_DISPLAY_ORDER: MuhurtaCategoryId[] = [
  "beautySelfCare",
  "careerBusiness",
  "education",
  "travel",
  "property",
  "health",
  "marriageRelationships",
];

const CATEGORY_ICONS: Record<MuhurtaCategoryId, React.ReactNode> = {
  beautySelfCare: <Sparkles size={20} />,
  careerBusiness: <Briefcase size={20} />,
  education: <GraduationCap size={20} />,
  travel: <Plane size={20} />,
  property: <HomeIcon size={20} />,
  health: <HeartPulse size={20} />,
  marriageRelationships: <Heart size={20} />,
};

/** Tone -> Tailwind classes, mirroring the red/emerald/gold tone convention already used elsewhere on this page (see WindowCard in app/panchang/page.tsx). */
function toneClasses(tone: MuhurtaTone): { text: string; border: string; bg: string } {
  switch (tone) {
    case "favorable":
      return { text: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/10" };
    case "unfavorable":
      return { text: "text-red-400", border: "border-red-500/25", bg: "bg-red-500/10" };
    case "neutral":
    default:
      return { text: "text-gold", border: "border-gold/25", bg: "bg-gold/10" };
  }
}

/** Formats an isoDate (YYYY-MM-DD) as e.g. "Jul 29" — UTC to avoid the date-only string shifting a day under a non-UTC host timezone (mirrors MonthlyPanchangCalendar's monthLabel formatting). */
function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function AuspiciousDays({ lat, lon }: AuspiciousDaysProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<MuhurtaCategoryId>(CATEGORY_DISPLAY_ORDER[0]);
  const [days, setDays] = useState<PanchangMonthDay[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    async function loadMonth(year: number, month: number): Promise<PanchangMonthDay[]> {
      const cacheKey = buildKey(
        "panchangMonth",
        year,
        month,
        lat != null ? roundCoord(lat) : undefined,
        lon != null ? roundCoord(lon) : undefined,
      );
      const cached = cacheGet<PanchangMonthDay[]>(cacheKey);
      if (cached) return cached;
      const res = await api.panchangMonth(year, month, lat, lon);
      cacheSet(cacheKey, res.days, Date.now() + PANCHANG_MONTH_TTL_MS);
      return res.days;
    }

    (async () => {
      try {
        const today = istToday();
        const [year, month] = today.split("-").map(Number); // month is 1-12
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const todayDay = Number(today.slice(8, 10));

        const monthsToLoad: [number, number][] = [[year, month]];
        if (daysInMonth - todayDay < NEXT_MONTH_LOOKAHEAD_DAYS) {
          monthsToLoad.push(month === 12 ? [year + 1, 1] : [year, month + 1]);
        }

        const loaded = await Promise.all(monthsToLoad.map(([y, m]) => loadMonth(y, m)));
        if (cancelled) return;
        setDays(loaded.flat());
        setState("ready");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const todayIso = istToday();
  const todayData = useMemo(() => days?.find((d) => d.isoDate === todayIso) ?? null, [days, todayIso]);

  const evaluation = todayData ? evaluateMuhurtaCategory(selected, todayData) : null;
  const upcoming = useMemo(
    () => (days ? findUpcomingFavorableDays(selected, days, { fromIsoDate: todayIso, limit: 5 }) : []),
    [days, selected, todayIso],
  );

  const tone = evaluation?.tone ?? "neutral";
  const toneStyle = toneClasses(tone);
  const categoryLabel = t(`horoscope.panchang.muhurta.categories.${selected}.label`);

  return (
    <div>
      <h2 className="text-sm font-display text-foreground">{t("horoscope.panchang.muhurta.sectionTitle")}</h2>
      <p className="text-[11px] text-muted mt-0.5 mb-3">{t("horoscope.panchang.muhurta.sectionSubtitle")}</p>

      {/* Category strip */}
      <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_DISPLAY_ORDER.map((id) => {
          const isSelected = id === selected;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="flex flex-col items-center gap-1.5 shrink-0 pb-2"
            >
              <span
                className={`flex items-center justify-center w-12 h-12 rounded-full border transition-colors ${
                  isSelected ? "bg-gold text-[#1a0e00] border-gold" : "bg-surface/40 text-muted border-gold/15"
                }`}
              >
                {CATEGORY_ICONS[id]}
              </span>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap px-0.5 border-b-2 ${
                  isSelected ? "text-foreground border-gold" : "text-muted border-transparent"
                }`}
              >
                {t(`horoscope.panchang.muhurta.categories.${id}.label`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Verdict card */}
      {state === "loading" && (
        <Card
          className="mt-3 p-4 border-gold/10 animate-pulse h-28"
          aria-busy="true"
          aria-label={t("horoscope.panchang.muhurta.loading")}
        />
      )}

      {state === "unavailable" && (
        <Card className="mt-3 p-4 border-gold/10 text-center text-sm text-muted">
          {t("horoscope.panchang.muhurta.unavailable")}
        </Card>
      )}

      {state === "ready" && (
        <Card className="mt-3 p-4 border-gold/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-display text-foreground">{categoryLabel}</p>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${toneStyle.text} ${toneStyle.border} ${toneStyle.bg}`}
            >
              {t(`horoscope.panchang.muhurta.tone.${tone}`)}
            </span>
          </div>

          <p className="text-xs text-foreground leading-relaxed">
            {evaluation ? t(evaluation.reasonKey) : t("horoscope.panchang.muhurta.unavailable")}
          </p>

          <p className="text-[10px] text-muted uppercase tracking-wider mt-4 mb-2">
            {t("horoscope.panchang.muhurta.perfectDaysHeading", { category: categoryLabel })}
          </p>

          {upcoming.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {upcoming.map((d) => (
                <span
                  key={d.isoDate}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 whitespace-nowrap"
                >
                  {formatShortDate(d.isoDate)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted">{t("horoscope.panchang.muhurta.noUpcomingDays")}</p>
          )}
        </Card>
      )}
    </div>
  );
}
