"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";
import { switchLanguage } from "@/i18n/switch-language";

/**
 * Supported languages: English, 7 Indian languages and 7 world languages.
 * Hand-written bundles live in i18n/resources.ts; the rest are generated into
 * i18n/generated/<code>.json and loaded by i18n/switch-language.ts — the picker reads this list directly.
 */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ja", label: "Japanese", native: "日本語" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "aroha:lang";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  // Restore persisted choice on mount and tell i18next to switch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setLangState(saved);
      void switchLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = (code: LangCode) => {
    setLangState(code);
    void switchLanguage(code); // <- this is what actually re-renders translated text
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, code);
      document.documentElement.lang = code;
    }
  };

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={{ lang, setLang }}>
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
