export interface TourStep {
  id: string;
  /** Matches a `data-tour="…"` attribute on the home page. `null` = centered welcome card, no spotlight. */
  target: string | null;
  titleKey: string;
  bodyKey: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", target: null, titleKey: "tour.welcomeTitle", bodyKey: "tour.welcomeBody" },
  { id: "horoscope", target: "daily-horoscope", titleKey: "tour.horoscopeTitle", bodyKey: "tour.horoscopeBody" },
  { id: "kundli", target: "kundli-summary", titleKey: "tour.kundliTitle", bodyKey: "tour.kundliBody" },
  { id: "askai", target: "ask-ai", titleKey: "tour.askAiTitle", bodyKey: "tour.askAiBody" },
  { id: "horoscope-tab", target: "nav-horoscope", titleKey: "tour.horoscopeTabTitle", bodyKey: "tour.horoscopeTabBody" },
  { id: "remedies", target: "nav-remedies", titleKey: "tour.remediesTitle", bodyKey: "tour.remediesBody" },
];

/** localStorage key marking the tour as seen (skipped or completed). */
export const TOUR_DONE_KEY = "aroha_tour_completed";
