"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";
import { registerRoadmapBundles } from "./roadmap";

// Initialise once (module singleton). We start on "en" on both server and
// first client paint to avoid hydration mismatches; the persisted language is
// applied after mount by the LanguageProvider via i18n.changeLanguage().
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  // Roadmap features keep their strings in i18n/roadmap/*, merged in here.
  registerRoadmapBundles(i18n);
}

export default i18n;
