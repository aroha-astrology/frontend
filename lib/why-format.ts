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
  return t(factor.textKey, vars);
}

/** The label a factor's direction gets: helps, holds back, or just context. */
export function effectKey(effect: WhyFactor["effect"]): "why.supports" | "why.strains" | "why.context" {
  if (effect > 0) return "why.supports";
  if (effect < 0) return "why.strains";
  return "why.context";
}
