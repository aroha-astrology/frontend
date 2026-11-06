import type { TFunction } from "i18next";
import type { SkyEventFact, SkyEventKind } from "./types";
import { signName } from "./sign-name";

/** Whole sentences, one per kind, so every language can order its own words. */
export const SKY_EN: Record<SkyEventKind, string> = {
  ingress: "{{planet}} enters {{sign}}, house {{house}}",
  "station-retrograde": "{{planet}} turns retrograde in {{sign}}, house {{house}}",
  "station-direct": "{{planet}} turns direct in {{sign}}, house {{house}}",
  "combust-in": "{{planet}} goes combust in {{sign}}, house {{house}}",
  "combust-out": "{{planet}} leaves combustion in {{sign}}, house {{house}}",
  "eclipse-solar": "Solar eclipse in {{sign}}, house {{house}} of your chart",
  "eclipse-lunar": "Lunar eclipse in {{sign}}, house {{house}} of your chart",
};

export function skyLabel(t: TFunction, e: SkyEventFact): string {
  return t(`varshik.sky.${e.kind}`, {
    defaultValue: SKY_EN[e.kind],
    planet: t(`varshik.planet.${e.planet.toLowerCase()}`, { defaultValue: e.planet }),
    sign: signName(t, e.sign),
    house: e.natalHouse,
  });
}
