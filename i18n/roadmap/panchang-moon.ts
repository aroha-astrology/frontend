import type { RoadmapBundle } from "./types";

/**
 * Moonrise/moonset follow Drik Panchang's day (sunrise to sunrise), so either
 * can fall after midnight. Shown under the time by
 * components/panchang/SunMoonTimings.tsx.
 */
export const panchangMoonBundle: RoadmapBundle = {
  en: { horoscope: { panchang: { nextDay: "next day" } } },
  hi: { horoscope: { panchang: { nextDay: "अगले दिन" } } },
  bn: { horoscope: { panchang: { nextDay: "পরের দিন" } } },
  mr: { horoscope: { panchang: { nextDay: "दुसऱ्या दिवशी" } } },
  te: { horoscope: { panchang: { nextDay: "మరుసటి రోజు" } } },
  ta: { horoscope: { panchang: { nextDay: "மறுநாள்" } } },
  gu: { horoscope: { panchang: { nextDay: "બીજા દિવસે" } } },
};
