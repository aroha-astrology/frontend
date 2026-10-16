"use client";

import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown, Plus, X } from "lucide-react";
import type { RectifyDomain, RectifyEvent } from "@/lib/api";
import { istToday, shortDateWithYear } from "@/lib/calendar-format";

/** The life events a birth time can be checked against, grouped as the picker shows them. */
export const DOMAIN_GROUPS: { group: string; options: RectifyDomain[] }[] = [
  {
    group: "career",
    options: ["job_started", "promotion", "job_loss", "business_started", "retirement"],
  },
  { group: "relationships", options: ["engagement", "marriage", "divorce"] },
  { group: "family", options: ["childbirth", "bereavement"] },
  {
    group: "homeMoney",
    options: ["property_bought", "vehicle_bought", "big_financial_gain", "relocation"],
  },
  { group: "healthLegal", options: ["health_crisis", "accident_injury", "legal_case"] },
  { group: "travelStudy", options: ["foreign_travel", "education_milestone"] },
];

/** The server refuses to suggest a time below this many dated events. */
export const MIN_EVENTS = 3;

const NEW_EVENT: RectifyEvent = { date: "", domain: "job_started" };
const FIELD = "relative h-12 rounded-2xl border transition-colors focus-within:border-yellow-500/60";
const FIELD_STYLE = { background: "var(--surface)", borderColor: "var(--border)" };

/**
 * One dated life event: what happened, and when. The two fields stack on a
 * phone (side by side they left the date a sliver and pushed the picker out of
 * its card) and sit in a row from tablet width up.
 *
 * The date field draws its own label and calendar icon and lays the browser's
 * date input over them, invisible: an empty native date input is a blank box
 * on Android and a dark-on-dark icon in the dark theme, and it never says what
 * it is for. Tapping anywhere on it opens the device's own date picker.
 */
function EventRow({
  event,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  event: RectifyEvent;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<RectifyEvent>) => void;
  onRemove: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <li className="flex items-start gap-2" data-testid="life-event-row">
      <span
        className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-semibold text-gold"
        aria-hidden
      >
        {index + 1}
      </span>

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={FIELD} style={FIELD_STYLE}>
          <select
            value={event.domain}
            onChange={(ev) => onChange({ domain: ev.target.value as RectifyDomain })}
            className="h-full w-full appearance-none truncate rounded-2xl bg-transparent pl-4 pr-10 text-base text-foreground outline-none"
          >
            {DOMAIN_GROUPS.map(({ group, options }) => (
              <optgroup key={group} label={t(`rectify.group.${group}`)}>
                {options.map((d) => (
                  <option key={d} value={d}>
                    {t(`rectify.domain.${d}`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gold" />
        </div>

        <div className={FIELD} style={FIELD_STYLE}>
          <span className="pointer-events-none flex h-full items-center gap-2.5 px-4 text-base">
            <CalendarDays size={16} className="shrink-0 text-gold" />
            <span className={`truncate ${event.date ? "text-foreground" : "text-muted"}`}>
              {event.date ? shortDateWithYear(event.date, i18n.language) : t("birthTime.eventDate")}
            </span>
          </span>
          <input
            type="date"
            aria-label={t("birthTime.eventDate")}
            value={event.date}
            max={istToday()}
            onChange={(ev) => onChange({ date: ev.target.value })}
            onClick={(ev) => {
              // Desktop browsers only open the picker from their own small icon.
              try {
                ev.currentTarget.showPicker?.();
              } catch {
                // not allowed here: the field still takes a typed date
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl opacity-0"
          />
        </div>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("birthTime.removeEvent")}
          className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-gold/10 hover:text-foreground"
        >
          <X size={16} />
        </button>
      )}
    </li>
  );
}

/** The editable list of life events both birth-time cards collect, with its "add another" button. */
export default function LifeEventRows({
  events,
  onChange,
}: {
  events: RectifyEvent[];
  onChange: (events: RectifyEvent[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <ul className="space-y-3">
        {events.map((e, i) => (
          <EventRow
            key={i}
            event={e}
            index={i}
            canRemove={events.length > 1}
            onChange={(patch) => onChange(events.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))}
            onRemove={() => onChange(events.filter((_, idx) => idx !== i))}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...events, { ...NEW_EVENT }])}
        className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gold/35 text-sm font-medium text-gold"
      >
        <Plus size={15} />
        {/* The string carries its own "+" from when it was a text link. */}
        {t("rectify.addEvent").replace(/^\+\s*/, "")}
      </button>
    </div>
  );
}

/** The events that have a full date: the only ones sent to the server. */
export function datedEvents(events: RectifyEvent[]): RectifyEvent[] {
  return events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
}
