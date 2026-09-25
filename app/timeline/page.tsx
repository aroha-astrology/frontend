"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GanttChart, MessageCircle } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { ApiError } from "@/lib/api";
import { isPassRequired } from "@/lib/pass-api";
import PassLock from "@/components/pass/PassLock";
import { timelineApi, type TimelineArea, type TimelineBand, type TimelineResponse } from "@/lib/insights-api";
import {
  ageOn,
  ageTicks,
  bandTense,
  barYears,
  chartWidthPx,
  fullDate,
  positionPct,
  relativeFromToday,
  widthPct,
  yearSpan,
} from "@/lib/timeline-format";
import { whyFactorText } from "@/lib/why-format";

// Full class names so Tailwind keeps them: `strong` for high bands, `soft` for medium ones.
const LANE_COLOR: Record<TimelineArea, { strong: string; soft: string }> = {
  career: { strong: "bg-amber-400", soft: "bg-amber-400/45" },
  relationships: { strong: "bg-rose-400", soft: "bg-rose-400/45" },
  money: { strong: "bg-emerald-400", soft: "bg-emerald-400/45" },
  education: { strong: "bg-sky-400", soft: "bg-sky-400/45" },
  family: { strong: "bg-violet-400", soft: "bg-violet-400/45" },
  business: { strong: "bg-orange-400", soft: "bg-orange-400/45" },
  relocation: { strong: "bg-teal-400", soft: "bg-teal-400/45" },
};

const planetName = (t: (k: string) => string, p: string) => t(`planetNames.${p.toLowerCase()}`);

/** The years printed on a bar, if it's wide enough to hold them. */
function barLabel(band: TimelineBand, px: number): string {
  if (px >= 48) return barYears(band.start, band.end);
  return px >= 30 ? band.start.slice(0, 4) : "";
}

function BandSheet({
  area,
  band,
  birthDate,
  today,
  onClose,
}: {
  area: TimelineArea;
  band: TimelineBand;
  birthDate: string;
  today: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const areaName = t(`why.areas.${area}`);
  const [maha, antar] = band.lords;
  const start = fullDate(band.start, lang);
  const end = fullDate(band.end, lang);
  const question = t("timeline.band.askQuestion", {
    area: areaName,
    start,
    end,
    maha: planetName(t, maha),
    antar: planetName(t, antar),
  });
  const [fromAge, toAge] = [ageOn(birthDate, band.start), ageOn(birthDate, band.end)];
  const tense = bandTense(band.start, band.end, today);
  const status =
    tense === "now"
      ? t("timeline.band.now", { end })
      : tense === "future"
        ? t("timeline.band.future", { start, when: relativeFromToday(band.start, today, lang) })
        : t("timeline.band.past", { end, when: relativeFromToday(band.end, today, lang) });
  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70">
            <span className={`h-2 w-2 shrink-0 rounded-full ${LANE_COLOR[area].strong}`} />
            {t("timeline.band.title", { area: areaName, level: t(`timeline.level.${band.level}`) })}
          </p>
          <h2 className="text-2xl font-semibold font-display text-gold">{yearSpan(band.start, band.end)}</h2>
          <p className="text-[11px] text-muted">
            {fromAge === toAge ? t("timeline.age", { age: fromAge }) : t("timeline.band.ages", { from: fromAge, to: toAge })}{" "}
            · {t("timeline.band.dates", { start, end })}
          </p>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <p
          className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            tense === "now" ? "bg-gold/20 text-gold" : "bg-white/5 text-foreground/80"
          }`}
        >
          {status}
        </p>
        <div className="rounded-xl border border-gold/15 bg-gold/5 p-3">
          <p className="text-[11px] font-semibold text-foreground/70">{t("timeline.band.meaningTitle")}</p>
          <p className="mt-1 leading-snug text-foreground">{t(`timeline.meaning.${area}.${band.level}`)}</p>
        </div>
        <p className="text-foreground/80">
          {t("timeline.band.lords", { maha: planetName(t, maha), antar: planetName(t, antar) })}
        </p>
        {band.why.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-foreground/70">{t("timeline.band.why")}</p>
            {band.why.map((f, i) => (
              <p key={i} className="text-foreground/90 leading-snug">
                {whyFactorText(t, f, lang)}
              </p>
            ))}
          </div>
        )}
        <Link
          href={`/ai-chat?q=${encodeURIComponent(question)}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold"
        >
          <MessageCircle size={15} />
          {t("timeline.band.ask")}
        </Link>
        <p className="text-center text-[10px] text-muted">{t("timeline.guidance")}</p>
      </div>
    </BottomSheetModal>
  );
}

function TimelinePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<TimelineResponse | null>(null);
  // "pass": Aroha Pass only, and this user has no Pass.
  const [error, setError] = useState<"pass" | "notReady" | "error" | null>(null);
  const [focus, setFocus] = useState<TimelineArea | "all">("all");
  const [open, setOpen] = useState<{ area: TimelineArea; band: TimelineBand } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    timelineApi
      .get()
      .then(setData)
      .catch((err: unknown) =>
        setError(
          isPassRequired(err)
            ? "pass"
            : err instanceof ApiError && err.message === "CHART_NOT_READY"
              ? "notReady"
              : "error",
        ),
      );
  }, []);

  useEffect(load, [load]);

  // `/timeline?area=career` (Ask Aroha's "Explore further") opens on that lane.
  useEffect(() => {
    if (!data) return;
    const area = new URLSearchParams(window.location.search).get("area");
    const lane = data.lanes.find((l) => l.area === area);
    if (lane) setFocus(lane.area);
  }, [data]);

  // Start with today in view.
  useEffect(() => {
    if (!data || !scroller.current) return;
    const el = scroller.current;
    const pct = positionPct(data.today, data.range.from, data.range.to) / 100;
    el.scrollLeft = Math.max(0, el.scrollWidth * pct - el.clientWidth / 2);
  }, [data]);

  const lanes = data ? data.lanes.filter((l) => focus === "all" || l.area === focus) : [];
  const width = data ? chartWidthPx(data.range.from, data.range.to, 340) : 340;
  // The whole life: a tick every 10 years.
  const tickStep = 10;

  return (
    <main className="cosmic-bg min-h-screen pb-tab-safe relative overflow-hidden text-foreground">
      <ParticleBackground />
      <div className="relative z-10 px-5 pt-8 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => router.back()} aria-label={t("common.back")}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display flex items-center gap-2">
              <GanttChart size={18} className="text-gold" />
              {t("timeline.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("timeline.subtitle")}</p>
          </div>
        </div>

        {!data && !error && <p className="py-10 text-center text-sm text-muted">{t("timeline.loading")}</p>}
        {error === "pass" && <PassLock feature={t("timeline.title")} />}
        {error && error !== "pass" && <p className="py-10 text-center text-sm text-muted">{t(`timeline.${error}`)}</p>}

        {data && (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["all", ...data.lanes.map((l) => l.area)] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setFocus(a)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                    focus === a ? "border-gold bg-gold/15 text-gold" : "border-gold/20 text-foreground/70"
                  }`}
                >
                  {a === "all" ? t("timeline.all") : t(`why.areas.${a}`)}
                </button>
              ))}
            </div>

            <Card className="p-3 border-gold/15">
              <div className="flex">
                <div className="w-20 shrink-0 space-y-2 pt-8">
                  <p className="h-6 text-[10px] leading-6 text-muted">{t("timeline.dashaRow")}</p>
                  {lanes.map((l) => (
                    <p key={l.area} className="h-6 text-[10px] leading-6 text-foreground/80 truncate">
                      {t(`why.areas.${l.area}`)}
                    </p>
                  ))}
                </div>
                <div ref={scroller} className="flex-1 overflow-x-auto no-scrollbar">
                  <div className="relative" style={{ width }}>
                    {/* Year / age axis */}
                    <div className="relative h-8">
                      {ageTicks(data.birthDate, data.range.from, data.range.to, tickStep).map((tick) => (
                        <span
                          key={tick.age}
                          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center leading-tight"
                          style={{ left: `${tick.pct}%` }}
                        >
                          <span className="block text-[9px] font-semibold text-foreground/70">{tick.year}</span>
                          <span className="block text-[8px] text-muted">{t("timeline.age", { age: tick.age })}</span>
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {/* Mahadasha row */}
                      <div className="relative h-6 rounded bg-white/5">
                        {data.mahadashas
                          .filter((m) => m.end > data.range.from && m.start < data.range.to)
                          .map((m) => {
                            const start = m.start < data.range.from ? data.range.from : m.start;
                            const end = m.end > data.range.to ? data.range.to : m.end;
                            // The name is sticky so it stays in view when the dasha starts off-screen.
                            return (
                              <span
                                key={m.start}
                                className="absolute top-0 h-6 border-l border-gold/30"
                                style={{
                                  left: `${positionPct(start, data.range.from, data.range.to)}%`,
                                  width: `${widthPct(start, end, data.range.from, data.range.to)}%`,
                                }}
                              >
                                <span className="sticky left-0 inline-block max-w-full truncate px-1 text-[9px] leading-6 text-gold/90">
                                  {planetName(t, m.planet)}
                                </span>
                              </span>
                            );
                          })}
                      </div>
                      {lanes.map((l) => (
                        <div key={l.area} className="relative h-6 rounded bg-white/[0.03]">
                          {l.bands.map((b) => {
                            const w = widthPct(b.start, b.end, data.range.from, data.range.to);
                            const color = LANE_COLOR[l.area];
                            return (
                              <button
                                key={b.start}
                                type="button"
                                aria-label={`${t(`why.areas.${l.area}`)} ${b.start}`}
                                onClick={() => setOpen({ area: l.area, band: b })}
                                className={`absolute top-0.5 h-5 overflow-hidden whitespace-nowrap rounded px-1 text-[9px] font-semibold leading-5 ${
                                  b.level === "high" ? `${color.strong} text-black/80` : `${color.soft} text-white/90`
                                } ${open?.band === b ? "ring-2 ring-white" : ""}`}
                                style={{ left: `${positionPct(b.start, data.range.from, data.range.to)}%`, width: `${w}%` }}
                              >
                                {barLabel(b, (w / 100) * width)}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {/* Today marker */}
                    <div
                      className="pointer-events-none absolute top-[30px] bottom-0 w-px bg-gold"
                      style={{ left: `${positionPct(data.today, data.range.from, data.range.to)}%` }}
                    >
                      <span className="absolute -top-2 -translate-x-1/2 rounded bg-gold px-1 text-[8px] font-bold text-black">
                        {t("timeline.today")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-[11px] text-muted">{t("timeline.legend")}</p>
            {data.approximateBirthTime && <p className="text-[11px] text-amber-300/90">{t("timeline.approximate")}</p>}

            <p className="pb-4 text-center text-[10px] text-muted">{t("timeline.guidance")}</p>
          </>
        )}
      </div>
      <AnimatePresence>
        {open && data && (
          <BandSheet
            area={open.area}
            band={open.band}
            birthDate={data.birthDate}
            today={data.today}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function TimelineRoute() {
  return (
    <NewFeatureGuard featureKey="nav.lifeTimeline">
      <TimelinePage />
    </NewFeatureGuard>
  );
}
