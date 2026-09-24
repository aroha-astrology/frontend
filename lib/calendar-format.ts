import type { CalendarEvent } from "@/lib/insights-api";

type Translate = (key: string, vars?: Record<string, unknown>) => string;

const planet = (t: Translate, p: string | number | undefined) => t(`planetNames.${String(p ?? "").toLowerCase()}`);
const sign = (t: Translate, s: string | number | undefined) => t(`zodiac.signs.${String(s ?? "").toLowerCase()}`);

/** One calendar event's headline, in the user's language. */
export function eventTitle(t: Translate, e: CalendarEvent): string {
  const p = e.params;
  switch (e.kind) {
    case "ingress":
    case "retrograde":
    case "direct":
      return t(`calendar.title_.${e.kind}`, { planet: planet(t, p.planet), sign: sign(t, p.sign) });
    case "dashaChange":
      return t("calendar.title_.dashaChange", { planet: planet(t, p.planet) });
    case "areaWindow":
      return t(e.tone > 0 ? "calendar.title_.areaWindowGood" : "calendar.title_.areaWindowCare", {
        area: t(`why.areas.${e.area ?? "overall"}`),
      });
    case "saturnPhase":
      return t(`calendar.title_.saturnPhase.${String(p.phase)}`);
    case "eclipse":
      return t(`calendar.title_.eclipse.${String(p.eclipse)}`);
    case "moonSign":
      return t("calendar.title_.moonSign", { sign: sign(t, p.sign) });
    case "festival":
      return `${String(p.emoji ?? "")} ${String(p.name ?? "")}`.trim();
  }
}

/** Which filter chip an event belongs to. */
export function eventGroup(e: CalendarEvent): "planets" | "dasha" | "festivals" {
  if (e.kind === "dashaChange" || e.kind === "areaWindow") return "dasha";
  if (e.kind === "festival") return "festivals";
  return "planets";
}

export function toneKey(tone: CalendarEvent["tone"]): "good" | "care" | "info" {
  return tone > 0 ? "good" : tone < 0 ? "care" : "info";
}

/** Events grouped under 'YYYY-MM' month keys, keeping their order. */
export function groupByMonth(events: CalendarEvent[]): Array<{ month: string; events: CalendarEvent[] }> {
  const groups: Array<{ month: string; events: CalendarEvent[] }> = [];
  for (const e of events) {
    const month = e.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.events.push(e);
    else groups.push({ month, events: [e] });
  }
  return groups;
}

/** Kinds worth putting on the Home "next important window" card. */
const WINDOW_KINDS = new Set<CalendarEvent["kind"]>(["areaWindow", "dashaChange", "ingress", "saturnPhase", "eclipse"]);

/** The heaviest upcoming event from `today` on — ties go to the sooner one. */
export function pickNextWindow(events: CalendarEvent[], today: string): CalendarEvent | null {
  let best: CalendarEvent | null = null;
  for (const e of events) {
    if (!WINDOW_KINDS.has(e.kind) || e.date < today || e.weight < 40) continue;
    if (!best || e.weight > best.weight || (e.weight === best.weight && e.date < best.date)) best = e;
  }
  return best;
}

function icsDate(date: string): string {
  return date.replace(/-/g, "");
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

/** Adds one day to 'YYYY-MM-DD' — iCalendar all-day events end exclusively. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** A one-event .ics file: an all-day event (or the whole period for dasha windows). */
export function buildIcs(e: CalendarEvent, title: string, description: string): string {
  const end = e.endDate && e.endDate > e.date ? nextDay(e.endDate) : nextDay(e.date);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aroha Astrology//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${e.id.replace(/[^A-Za-z0-9.:-]/g, "")}@arohaastrology.in`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
    `DTEND;VALUE=DATE:${icsDate(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** 'YYYY-MM-DD' → a short localized date ("12 Oct"). */
export function shortDate(date: string, lang: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  } catch {
    return date;
  }
}

/** 'YYYY-MM' → a localized month heading ("October 2026"). */
export function monthHeading(month: string, lang: string): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  try {
    return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return month;
  }
}

/** Today as YYYY-MM-DD in IST. */
export function istToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/**
 * A Google Calendar "add event" link — used inside the Android app, where a
 * downloaded .ics file often goes nowhere. It opens the Calendar app or the
 * browser with the event pre-filled.
 */
export function googleCalendarUrl(e: CalendarEvent, title: string, description: string): string {
  const end = e.endDate && e.endDate > e.date ? nextDay(e.endDate) : nextDay(e.date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${icsDate(e.date)}/${icsDate(end)}`,
    details: description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
