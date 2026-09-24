"use client";

import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "@/lib/insights-api";
import { eventTitle, toneKey } from "@/lib/calendar-format";

const DOT = { good: "bg-emerald-400", care: "bg-amber-400", info: "bg-gold/40" } as const;

/** One line of the calendar: day number, a tone dot, the title. */
export default function EventRow({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  const day = new Date(`${event.date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: "short", timeZone: "UTC" }).format(day);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
    >
      <span className="w-10 shrink-0 text-center">
        <span className="block text-base font-semibold text-foreground leading-none">{day.getUTCDate()}</span>
        <span className="block text-[10px] text-muted">{weekday}</span>
      </span>
      <span className={`h-2 w-2 rounded-full shrink-0 ${DOT[toneKey(event.tone)]}`} />
      <span className="flex-1 min-w-0 text-sm text-foreground leading-snug">{eventTitle(t, event)}</span>
    </button>
  );
}
