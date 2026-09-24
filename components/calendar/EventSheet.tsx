"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarPlus, MessageCircle } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import type { CalendarEvent } from "@/lib/insights-api";
import { buildIcs, eventTitle, googleCalendarUrl, shortDate, toneKey } from "@/lib/calendar-format";
import { whyFactorText } from "@/lib/why-format";
import { isNativeAndroid } from "@/lib/play-billing";

const TONE_CLASS = { good: "text-emerald-400", care: "text-amber-400", info: "text-muted" } as const;

/** What / Why / How long / Peak / Affects, plus Ask Aroha and Add to calendar. */
export default function EventSheet({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const title = eventTitle(t, event);
  const tone = toneKey(event.tone);
  const whyLines = event.why.map((f) => whyFactorText(t, f, lang));
  const description = [...whyLines, t("calendar.guidance")].join("\n");
  const question = t("calendar.detail.askQuestion", { title, date: shortDate(event.date, lang) });

  async function addToCalendar() {
    if (await isNativeAndroid()) {
      window.open(googleCalendarUrl(event, title, description), "_blank");
      return;
    }
    const blob = new Blob([buildIcs(event, title, description)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aroha-${event.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("tour.skip")}
      header={
        <div className="min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${TONE_CLASS[tone]}`}>
            {t(`calendar.tone.${tone}`)}
          </p>
          <h2 className="text-lg font-semibold font-display text-foreground leading-snug">{title}</h2>
          <p className="text-[11px] text-muted">{shortDate(event.date, lang)}</p>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {typeof event.params.house === "number" && (
          <section>
            <p className="text-[11px] font-semibold text-foreground/70">{t("calendar.detail.what")}</p>
            <p className="text-foreground/90">
              {t("calendar.houseLine", { houseName: t(`why.houses.${event.params.house}`) })}
            </p>
          </section>
        )}

        {whyLines.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-foreground/70">{t("calendar.detail.why")}</p>
            {whyLines.map((line, i) => (
              <p key={i} className="text-foreground/90 leading-snug">
                {line}
              </p>
            ))}
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold text-foreground/70">{t("calendar.detail.howLong")}</p>
            <p className="text-foreground/90">
              {event.endDate && event.endDate > event.date
                ? t("calendar.detail.until", { date: shortDate(event.endDate, lang) })
                : t("calendar.detail.oneDay")}
            </p>
            {event.peakDate && (
              <p className="text-[11px] text-muted">{t("calendar.detail.peak", { date: shortDate(event.peakDate, lang) })}</p>
            )}
          </div>
          {event.area && event.area !== "overall" && (
            <div>
              <p className="text-[11px] font-semibold text-foreground/70">{t("calendar.detail.area")}</p>
              <p className="text-foreground/90">{t(`why.areas.${event.area}`)}</p>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href={`/ai-chat?q=${encodeURIComponent(question)}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-gold/20 px-3 py-2.5 text-sm font-semibold text-gold"
          >
            <MessageCircle size={15} />
            {t("calendar.detail.ask")}
          </Link>
          <button
            type="button"
            onClick={() => void addToCalendar()}
            className="flex items-center justify-center gap-2 rounded-xl border border-gold/30 px-3 py-2.5 text-sm font-medium text-gold"
          >
            <CalendarPlus size={15} />
            {t("calendar.detail.addToCalendar")}
          </button>
        </div>
        <p className="text-center text-[10px] text-muted">{t("calendar.guidance")}</p>
      </div>
    </BottomSheetModal>
  );
}
