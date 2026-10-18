import type { i18n as I18n } from "i18next";

/**
 * Wording for the Modern Cosmic look. Only labels differ; the screens, data and behaviour are the same.
 * Applied over the base strings when the look is Cosmic and put back when it is not, so every screen
 * picks it up without knowing about looks. English only for now: another language keeps the Classic
 * wording until its Cosmic strings are translated.
 */
export const COSMIC_COPY: Record<string, Record<string, string>> = {
  en: {
    "nav.home": "Today",
    "nav.horoscope": "Forecast",
    "nav.askAI": "Ask Orion",
    "nav.reports": "Deep Dives",
    "nav.panchang": "Almanac",
    "nav.kundli": "Birth Chart",
    "nav.remedies": "Rituals",
    "reports.title": "Deep Dives",
    "home.moonSignHoroscope": "Your Forecast",
    "aiChatPage.askAiTitle": "Ask Orion",
    "aiChatPage.introTitle": "Ask Orion anything",
    "aiChatPage.voiceTitle": "Call Orion",
  },
};

/** The base value of each key we overwrote, per language, so the Classic wording can be restored exactly. */
const originals = new Map<string, Map<string, unknown>>();

/** Put the Cosmic wording over the base strings (`on`), or put the base strings back. */
export function applySkinCopy(i18n: I18n, on: boolean): void {
  for (const [lang, copy] of Object.entries(COSMIC_COPY)) {
    let saved = originals.get(lang);
    if (!saved) {
      saved = new Map();
      originals.set(lang, saved);
    }
    for (const [key, cosmicValue] of Object.entries(copy)) {
      if (on) {
        const base = saved.has(key) ? saved.get(key) : i18n.getResource(lang, "translation", key);
        // A key with no base string is skipped, so there is always something to put back.
        if (typeof base !== "string") continue;
        saved.set(key, base);
        i18n.addResource(lang, "translation", key, cosmicValue, { silent: true });
      } else if (saved.has(key)) {
        i18n.addResource(lang, "translation", key, saved.get(key) as string, { silent: true });
        saved.delete(key);
      }
    }
  }
  // Components re-render on a language change, not on a resource change; this tells them to re-read.
  i18n.emit("languageChanged", i18n.language);
}
