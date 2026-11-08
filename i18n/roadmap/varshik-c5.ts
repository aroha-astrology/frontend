import type { RoadmapBundle } from "./types";
import en from "./varshik-c5/en.json";
import hi from "./varshik-c5/hi.json";
import bn from "./varshik-c5/bn.json";
import mr from "./varshik-c5/mr.json";
import te from "./varshik-c5/te.json";
import ta from "./varshik-c5/ta.json";
import gu from "./varshik-c5/gu.json";

/**
 * Varshik Rashifal, sprint C5 (Indian calendar correctness): house references "from your Lagna / from your Moon"
 * in the sky calendar, month key dates and big moves; eclipse classes (Grahan, Upachchaya, not visible) with local
 * times and Sutak; the no-muhurat periods (Shukra and Guru Asta, Kharmas, Chaturmas) in the decision table; peak
 * months, Moon sign and Lagna on the year share card. English plus the six bundle languages; the other eight are
 * merged into i18n/generated/*.json. Translated through apinex (free/gemini-3.8-flash).
 */
export const varshikC5Bundle = { en, hi, bn, mr, te, ta, gu } as RoadmapBundle;
