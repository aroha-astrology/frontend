import type { TFunction } from "i18next";
import type { EclipsePlace, SkyEventFact, SkyEventKind } from "./types";
import { signName } from "./sign-name";

/** Whole sentences, one per kind, so every language can order its own words. Used by reports saved before C5. */
export const SKY_EN: Record<SkyEventKind, string> = {
  ingress: "{{planet}} enters {{sign}}, house {{house}}",
  "station-retrograde": "{{planet}} turns retrograde in {{sign}}, house {{house}}",
  "station-direct": "{{planet}} turns direct in {{sign}}, house {{house}}",
  "combust-in": "{{planet}} goes combust in {{sign}}, house {{house}}",
  "combust-out": "{{planet}} leaves combustion in {{sign}}, house {{house}}",
  "eclipse-solar": "Solar eclipse in {{sign}}, house {{house}} of your chart",
  "eclipse-lunar": "Lunar eclipse in {{sign}}, house {{house}} of your chart",
};

/**
 * C5: every house names what it is counted from. {{lagna}} and {{moon}} arrive as English ordinals
 * ("6th") in English and as plain numbers in every other language, which writes its own ordinal.
 */
export const SKY_REF_EN: Record<Exclude<SkyEventKind, "eclipse-solar" | "eclipse-lunar">, string> = {
  ingress: "{{planet}} enters {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "station-retrograde": "{{planet}} turns retrograde in {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "station-direct": "{{planet}} turns direct in {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "combust-in": "{{planet}} goes combust in {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "combust-out": "{{planet}} leaves combustion in {{sign}} · {{lagna}} from your Lagna · {{moon}} from your Moon",
};

/** C5 eclipse sentences, by body and class. Only a Grahan names houses; the others are plain markers. */
export const ECLIPSE_EN = {
  "solar.grahan": "Solar eclipse in {{sign}}, seen as a Grahan · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "lunar.grahan": "Lunar eclipse in {{sign}}, seen as a Grahan · {{lagna}} from your Lagna · {{moon}} from your Moon",
  "lunar.upachchaya": "Penumbral lunar eclipse (Upachchaya) in {{sign}}: a faint shading only, no Sutak",
  "solar.not_visible.india": "Solar eclipse in {{sign}}, not visible in India: no Sutak",
  "lunar.not_visible.india": "Lunar eclipse in {{sign}}, not visible in India: no Sutak",
  "solar.not_visible.reader": "Solar eclipse in {{sign}}, not visible where you live: no Sutak",
  "lunar.not_visible.reader": "Lunar eclipse in {{sign}}, not visible where you live: no Sutak",
} as const;

/** The eclipse's type word, for a small chip beside the line. */
export const ECLIPSE_TYPE_EN = {
  total: "Total",
  annular: "Annular",
  hybrid: "Hybrid",
  partial: "Partial",
  penumbral: "Penumbral",
} as const;

export function ordinal(n: number, lang: string): string {
  if (!lang.startsWith("en")) return String(n);
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export function skyLabel(t: TFunction, e: SkyEventFact, lang = "en", place?: EclipsePlace): string {
  const planet = t(`varshik.planet.${e.planet.toLowerCase()}`, { defaultValue: e.planet });
  const sign = signName(t, e.sign);
  const isEclipse = e.kind === "eclipse-solar" || e.kind === "eclipse-lunar";
  if (e.moonHouse === undefined) {
    return t(`varshik.sky.${e.kind}`, { defaultValue: SKY_EN[e.kind], planet, sign, house: e.natalHouse });
  }
  const refs = { lagna: ordinal(e.natalHouse, lang), moon: ordinal(e.moonHouse, lang) };
  if (!isEclipse) {
    const kind = e.kind as keyof typeof SKY_REF_EN;
    return t(`varshik.skyRef.${kind}`, { defaultValue: SKY_REF_EN[kind], planet, sign, ...refs });
  }
  const body = e.kind === "eclipse-solar" ? "solar" : "lunar";
  const cls = e.eclipse?.class ?? "grahan";
  const key = (cls === "not_visible" ? `${body}.not_visible.${place?.scope ?? "india"}` : `${body}.${cls}`) as keyof typeof ECLIPSE_EN;
  return t(`varshik.eclipse.${key}`, { defaultValue: ECLIPSE_EN[key] ?? ECLIPSE_EN[`${body}.grahan` as keyof typeof ECLIPSE_EN], sign, ...refs });
}

/** The local-times lines under a Grahan or Upachchaya: one per place, with Sutak for a Grahan. */
export function eclipsePlaceLines(t: TFunction, e: SkyEventFact): string[] {
  const x = e.eclipse;
  if (!x || x.class === "not_visible") return [];
  const solar = e.kind === "eclipse-solar";
  const seen = x.places.filter((p) => p.visible && p.from && p.to);
  // A penumbral eclipse has the same contacts everywhere: one line, not five copies.
  if (x.class === "upachchaya" && seen.length > 0 && seen.every((p) => p.from === seen[0]!.from && p.to === seen[0]!.to)) {
    return [t("varshik.eclipse.placeAll", { defaultValue: "{{from}} to {{to}}, the same in every city", from: seen[0]!.from, to: seen[0]!.to })];
  }
  return seen
    .map((p) => {
      const sutak = x.sutak.find((s) => s.place === p.name);
      const sutakTime = sutak ? sutak.from.slice(11) : "";
      if (x.class === "upachchaya") {
        return t("varshik.eclipse.placeFaint", { defaultValue: "{{place}}: {{from}} to {{to}}", place: p.name, from: p.from, to: p.to });
      }
      if (solar && p.magnitude !== null) {
        return t("varshik.eclipse.placeSolar", {
          defaultValue: "{{place}}: {{from}} to {{to}}, {{pct}}% of the Sun covered · Sutak from {{sutak}}",
          place: p.name,
          from: p.from,
          to: p.to,
          pct: Math.round(p.magnitude * 100),
          sutak: sutakTime,
        });
      }
      return t("varshik.eclipse.placeLunar", {
        defaultValue: "{{place}}: {{from}} to {{to}} · Sutak from {{sutak}}",
        place: p.name,
        from: p.from,
        to: p.to,
        sutak: sutakTime,
      });
    });
}
