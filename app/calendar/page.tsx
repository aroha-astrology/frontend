"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CalendarDays } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import IconButton from "@/components/ui/IconButton";
import Card from "@/components/ui/Card";
import NewFeatureGuard from "@/components/NewFeatureGuard";
import EventRow from "@/components/calendar/EventRow";
import EventSheet from "@/components/calendar/EventSheet";
import { ApiError } from "@/lib/api";
import { calendarApi, type CalendarEvent, type CalendarResponse } from "@/lib/insights-api";
import { eventGroup, groupByMonth, istToday, monthHeading } from "@/lib/calendar-format";

const FILTERS = ["all", "planets", "dasha", "festivals"] as const;
type Filter = (typeof FILTERS)[number];

function CalendarPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [error, setError] = useState<"notReady" | "error" | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    calendarApi
      .get(istToday(), 120)
      .then((res) => !cancelled && setData(res))
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError && err.message === "CHART_NOT_READY" ? "notReady" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const months = useMemo(() => {
    if (!data) return [];
    const events = filter === "all" ? data.events : data.events.filter((e) => eventGroup(e) === filter);
    return groupByMonth(events);
  }, [data, filter]);

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
              <CalendarDays size={18} className="text-gold" />
              {t("calendar.title")}
            </h1>
            <p className="text-[11px] text-muted">{t("calendar.subtitle")}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                filter === f ? "border-gold bg-gold/15 text-gold" : "border-gold/20 text-foreground/70"
              }`}
            >
              {t(`calendar.filters.${f}`)}
            </button>
          ))}
        </div>

        {!data && !error && <p className="py-10 text-center text-sm text-muted">{t("calendar.loading")}</p>}
        {error && <p className="py-10 text-center text-sm text-muted">{t(`calendar.${error}`)}</p>}
        {data && months.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("calendar.empty")}</p>}

        {months.map(({ month, events }) => (
          <Card key={month} className="p-3 border-gold/15">
            <p className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gold">
              {monthHeading(month, i18n.language)}
            </p>
            <div className="divide-y divide-white/5">
              {events.map((e) => (
                <EventRow key={e.id} event={e} onOpen={() => setOpen(e)} />
              ))}
            </div>
          </Card>
        ))}

        {data && <p className="pb-4 text-center text-[10px] text-muted">{t("calendar.guidance")}</p>}
      </div>
      <AnimatePresence>{open && <EventSheet event={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </main>
  );
}

export default function CalendarRoute() {
  return (
    <NewFeatureGuard featureKey="nav.calendar">
      <CalendarPage />
    </NewFeatureGuard>
  );
}
