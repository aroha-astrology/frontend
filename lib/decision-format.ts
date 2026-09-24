import type { DecisionKind, DecisionResult, DayTone } from "@/lib/decisions-api";

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** The translation key of a Decision / Find My Date category's name. */
export function categoryKey(kind: DecisionKind, category: string): string {
  return kind === "decision" ? `decide.categories.${category}` : `findDate.categories.${category}`;
}

/** "Thu, 1 Oct" in the user's language. */
export function dayLabel(date: string, lang: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  } catch {
    return date;
  }
}

/** A best-time slot's name: Abhijit or a choghadiya ("amrit", "labh" …), via the shared muhurta names. */
export function slotName(t: Translate, name: string): string {
  return t(`muhurtaNames.${name}`);
}

export const TONE_CLASS: Record<DayTone, string> = {
  good: "bg-emerald-500/80",
  neutral: "bg-white/15",
  caution: "bg-amber-500/80",
};

/** The day strip split into calendar months, so a 90-day strip reads as three labelled rows. */
export function stripByMonth(days: DecisionResult["days"]): Array<{ month: string; days: DecisionResult["days"] }> {
  const out: Array<{ month: string; days: DecisionResult["days"] }> = [];
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === month) last.days.push(d);
    else out.push({ month, days: [d] });
  }
  return out;
}

/** The pre-filled "Ask Aroha" question for a date (the chat never auto-sends). */
export function askAboutDate(t: Translate, kind: DecisionKind, category: string, date: string, lang: string): string {
  return t("decide.result.askQuestion", { category: t(categoryKey(kind, category)), date: dayLabel(date, lang) });
}
