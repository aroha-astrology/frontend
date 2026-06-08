"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

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
}

export default i18n;
