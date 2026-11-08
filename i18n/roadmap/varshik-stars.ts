import type { RoadmapBundle } from "./types";
import en from "./varshik-stars/en.json";
import hi from "./varshik-stars/hi.json";
import bn from "./varshik-stars/bn.json";
import mr from "./varshik-stars/mr.json";
import te from "./varshik-stars/te.json";
import ta from "./varshik-stars/ta.json";
import gu from "./varshik-stars/gu.json";

/**
 * Varshik Rashifal 2027, the C3 star pages: "Your birth stars", "The year's three flags", "Your stars in 2027",
 * the star lines of the sky calendar and month key dates, and the Gandanta dosha name. English plus the six bundle
 * languages; the other eight are merged into i18n/generated/*.json. Translated through apinex (free/gemini-3.8-flash).
 * The engine's own plain star lines (tara, Moorti, nature and meaning of each star) come from the backend in English.
 */
export const varshikStarsBundle = { en, hi, bn, mr, te, ta, gu } as RoadmapBundle;
