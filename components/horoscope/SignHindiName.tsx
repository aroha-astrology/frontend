"use client";

import { useTranslation } from "react-i18next";
import { zodiacHindiName } from "@/data/zodiac";

/**
 * "(Kumbh)" under an English sign name: the name most users know the sign by,
 * in English letters. English UI only, since the other languages already show
 * the sign in their own words.
 */
export default function SignHindiName({ sign, size = "text-[10px]" }: { sign: string; size?: string }) {
  const { i18n } = useTranslation();
  const hindi = zodiacHindiName(sign);
  if (!hindi || !i18n.language.startsWith("en")) return null;
  return <p className={`${size} text-muted leading-tight`}>({hindi})</p>;
}
