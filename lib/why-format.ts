import type { WhyFactor } from "@/lib/insights-api";

type Translate = (key: string, vars?: Record<string, unknown>) => string;

/** 'YYYY-MM-DD' → a short localized date ("Jan 2037"), falling back to the raw value. */
export function formatUntil(iso: string, lang: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang, { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * One factor as a sentence in the user's language. The backend sends a key and
 * raw values (planet "Saturn", house 10, sign "Pisces"); planet and sign names
 * go through the app's existing `planetNames.*` / `zodiac.signs.*` keys and
 * houses through `why.houses.*`, so nothing English leaks into Hindi text.
 */
export function whyFactorText(t: Translate, factor: WhyFactor, lang: string): string {
  const p = factor.params ?? {};
  const vars: Record<string, string> = {};
  if (p.planet != null) vars.planet = t(`planetNames.${String(p.planet).toLowerCase()}`);
  if (p.house != null) vars.houseName = t(`why.houses.${p.house}`);
  if (p.placed != null) vars.placedName = t(`why.houses.${p.placed}`);
  if (p.sign != null) vars.sign = t(`zodiac.signs.${String(p.sign).toLowerCase()}`);
  if (p.until != null) vars.until = formatUntil(String(p.until), lang);
  if (p.tara != null) vars.taraName = t(`why.taras.${p.tara}`);
  if (p.starLord != null) vars.starLord = t(`planetNames.${String(p.starLord).toLowerCase()}`);
  if (p.nakshatra != null) vars.nakshatraName = t(`nakshatraNames.${String(p.nakshatra).toLowerCase()}`);
  if (p.weekday != null) vars.weekdayName = weekdayName(Number(p.weekday), lang);
  if (p.name != null) vars.name = String(p.name);
  return t(factor.textKey, vars);
}

/** 0 = Sunday … 6 = Saturday, as a weekday name in `lang` ("गुरुवार"). */
export function weekdayName(weekday: number, lang: string): string {
  // 2023-01-01 was a Sunday.
  const d = new Date(Date.UTC(2023, 0, 1 + weekday));
  try {
    return new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(d);
  }
}

/** The label a factor's direction gets: helps, holds back, or just context. */
export function effectKey(effect: WhyFactor["effect"]): "why.supports" | "why.strains" | "why.context" {
  if (effect > 0) return "why.supports";
  if (effect < 0) return "why.strains";
  return "why.context";
}
