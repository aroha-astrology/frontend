"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import { useNewFeature } from "@/hooks/useFeature";
import { calendarApi, type CalendarEvent } from "@/lib/insights-api";
import { eventTitle, istToday, pickNextWindow, shortDate } from "@/lib/calendar-format";
import EventSheet from "./EventSheet";

/** Home's "Next important window": the weightiest event of the next 45 days. Ships off (`home.nextWindow`). */
export default function NextWindowCard() {
  const { t, i18n } = useTranslation();
  const { enabled } = useNewFeature("home.nextWindow");
  const { enabled: calendarOn } = useNewFeature("nav.calendar");
  const [event, setEvent] = useState<CalendarEvent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const today = istToday();
    calendarApi
      .get(today, 45)
      .then((res) => !cancelled && setEvent(pickNextWindow(res.events, today)))
      .catch(() => !cancelled && setEvent(null));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || event === undefined) return null;

  return (
    <>
      <Card className="p-5 border-gold/15">
        <p className="flex items-center gap-2 text-gold text-xs font-medium uppercase tracking-wider mb-2">
          <Sparkles size={14} />
          {t("calendar.next.title")}
        </p>
        {event ? (
          <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
            <p className="text-base font-semibold text-foreground leading-snug">{eventTitle(t, event)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {shortDate(event.date, i18n.language)}
              {event.endDate && event.endDate > event.date ? ` → ${shortDate(event.endDate, i18n.language)}` : ""}
            </p>
          </button>
        ) : (
          <p className="text-sm text-muted">{t("calendar.next.none")}</p>
        )}
        {calendarOn && (
          <Link href="/calendar" className="mt-3 flex items-center justify-end gap-0.5 text-[11px] font-medium text-gold">
            {t("calendar.next.explore")}
            <ChevronRight size={12} />
          </Link>
        )}
      </Card>
      <AnimatePresence>{open && event && <EventSheet event={event} onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
