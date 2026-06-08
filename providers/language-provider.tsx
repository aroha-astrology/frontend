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

/**
 * Supported languages: English + the 6 most-spoken Indian languages
 * (by number of native speakers). Add more by appending here AND adding a
 * matching block in i18n/resources.ts — the picker reads this list directly.
 */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
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
      i18n.changeLanguage(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = (code: LangCode) => {
    setLangState(code);
    i18n.changeLanguage(code); // <- this is what actually re-renders translated text
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
