"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, GanttChart, Lock, MessageCircle } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import { ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useNewFeature } from "@/hooks/useFeature";
import { timelineApi, type TimelineArea, type TimelineBand, type TimelineResponse } from "@/lib/insights-api";
import { ageTicks, chartWidthPx, positionPct, widthPct } from "@/lib/timeline-format";
import { shortDate } from "@/lib/calendar-format";
import { whyFactorText } from "@/lib/why-format";

const LANE_COLOR: Record<TimelineArea, string> = {
  career: "bg-amber-400",
  relationships: "bg-rose-400",
  money: "bg-emerald-400",
  education: "bg-sky-400",
  family: "bg-violet-400",
  business: "bg-orange-400",
  relocation: "bg-teal-400",
};

const planetName = (t: (k: string) => string, p: string) => t(`planetNames.${p.toLowerCase()}`);

function BandSheet({ area, band, onClose }: { area: TimelineArea; band: TimelineBand; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const areaName = t(`why.areas.${area}`);
  const [maha, antar] = band.lords;
  const question = t("timeline.band.askQuestion", {
    area: areaName,
    start: shortDate(band.start, lang),
    end: shortDate(band.end, lang),
    maha: planetName(t, maha),
    antar: planetName(t, antar),
  });
  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="min-w-0">
          <h2 className="text-lg font-semibold font-display text-foreground">
            {t("timeline.band.title", { area: areaName, level: t(`timeline.level.${band.level}`) })}
          </h2>
          <p className="text-[11px] text-muted">
            {t("timeline.band.dates", { start: shortDate(band.start, lang), end: shortDate(band.end, lang) })} ·{" "}
            {new Date(`${band.start}T00:00:00Z`).getUTCFullYear()}
          </p>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
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
  const { refresh: refreshUser } = useAuth();
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [error, setError] = useState<"notReady" | "error" | null>(null);
  const [focus, setFocus] = useState<TimelineArea | "all">("all");
  const [open, setOpen] = useState<{ area: TimelineArea; band: TimelineBand } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  // The whole-life unlock has its own switch; with it off the free window stays, without a buy button that would 403.
  const { enabled: unlockOn } = useNewFeature("paid.lifeTimelineFull");
  const [unlockError, setUnlockError] = useState<"funds" | "error" | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    timelineApi
      .get()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof ApiError && err.message === "CHART_NOT_READY" ? "notReady" : "error"));
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

  async function unlock() {
    setUnlocking(true);
    setUnlockError(null);
    try {
      await timelineApi.unlock();
      await refreshUser();
      setData(null);
      load();
    } catch (err) {
      setUnlockError(err instanceof ApiError && err.message === "INSUFFICIENT_CREDITS" ? "funds" : "error");
    } finally {
      setUnlocking(false);
    }
  }

  const lanes = data ? data.lanes.filter((l) => focus === "all" || l.area === focus) : [];
  const width = data ? chartWidthPx(data.range.from, data.range.to, 340) : 340;
  const tickStep = data && data.full ? 10 : 1;

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
        {error && <p className="py-10 text-center text-sm text-muted">{t(`timeline.${error}`)}</p>}

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
                <div className="w-20 shrink-0 space-y-2 pt-6">
                  <p className="h-6 text-[10px] leading-6 text-muted">{t("timeline.dashaRow")}</p>
                  {lanes.map((l) => (
                    <p key={l.area} className="h-6 text-[10px] leading-6 text-foreground/80 truncate">
                      {t(`why.areas.${l.area}`)}
                    </p>
                  ))}
                </div>
                <div ref={scroller} className="flex-1 overflow-x-auto no-scrollbar">
                  <div className="relative" style={{ width }}>
                    {/* Age axis */}
                    <div className="relative h-6">
                      {ageTicks(data.birthDate, data.range.from, data.range.to, tickStep).map((tick) => (
                        <span
                          key={tick.age}
                          className="absolute top-0 -translate-x-1/2 text-[9px] text-muted"
                          style={{ left: `${tick.pct}%` }}
                        >
                          {t("timeline.age", { age: tick.age })}
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
                            return (
                              <span
                                key={m.start}
                                className="absolute top-0 h-6 border-l border-gold/30 px-1 text-[9px] leading-6 text-gold/90 truncate"
                                style={{
                                  left: `${positionPct(start, data.range.from, data.range.to)}%`,
                                  width: `${widthPct(start, end, data.range.from, data.range.to)}%`,
                                }}
                              >
                                {planetName(t, m.planet)}
                              </span>
                            );
                          })}
                      </div>
                      {lanes.map((l) => (
                        <div key={l.area} className="relative h-6 rounded bg-white/[0.03]">
                          {l.bands.map((b) => (
                            <button
                              key={b.start}
                              type="button"
                              aria-label={`${t(`why.areas.${l.area}`)} ${b.start}`}
                              onClick={() => setOpen({ area: l.area, band: b })}
                              className={`absolute top-1 h-4 rounded ${LANE_COLOR[l.area]} ${b.level === "high" ? "opacity-100" : "opacity-45"}`}
                              style={{
                                left: `${positionPct(b.start, data.range.from, data.range.to)}%`,
                                width: `${widthPct(b.start, b.end, data.range.from, data.range.to)}%`,
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Today marker */}
                    <div
                      className="pointer-events-none absolute top-5 bottom-0 w-px bg-gold"
                      style={{ left: `${positionPct(data.today, data.range.from, data.range.to)}%` }}
                    >
                      <span className="absolute -top-1 -translate-x-1/2 rounded bg-gold px-1 text-[8px] font-bold text-black">
                        {t("timeline.today")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <p className="text-[11px] text-muted">{t("timeline.legend")}</p>
            {data.approximateBirthTime && <p className="text-[11px] text-amber-300/90">{t("timeline.approximate")}</p>}

            {!data.full && unlockOn && (
              <Card className="p-4 border-gold/20 text-center space-y-2">
                <p className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <Lock size={14} className="text-gold" />
                  {t("timeline.locked")}
                </p>
                <button
                  type="button"
                  disabled={unlocking}
                  onClick={() => void unlock()}
                  className="w-full rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold disabled:opacity-40"
                >
                  {data.unlock.pricePaise > 0
                    ? t("timeline.unlock", { price: formatRupees(data.unlock.pricePaise) })
                    : t("timeline.unlockFree")}
                </button>
                {unlockError && (
                  <p className="text-xs text-rose-300">
                    {unlockError === "funds" ? t("timeline.funds") : t("timeline.error")}{" "}
                    {unlockError === "funds" && (
                      <Link href="/payment" className="font-semibold text-gold underline">
                        {t("timeline.addMoney")}
                      </Link>
                    )}
                  </p>
                )}
              </Card>
            )}
            {data.full && data.unlock.via === "pass" && (
              <p className="text-center text-[11px] text-emerald-400">{t("timeline.freeWithPass")}</p>
            )}
            <p className="pb-4 text-center text-[10px] text-muted">{t("timeline.guidance")}</p>
          </>
        )}
      </div>
      <AnimatePresence>
        {open && <BandSheet area={open.area} band={open.band} onClose={() => setOpen(null)} />}
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
