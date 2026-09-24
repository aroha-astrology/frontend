"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Square, Volume2 } from "lucide-react";
import { getTtsBackend } from "@/lib/tts";
import type { LangCode } from "@/providers/language-provider";

/**
 * Speaks `text` with the device's own voice (native TTS in the app, the
 * browser's speech engine on the web). No audio is generated on the server.
 */
export default function ListenButton({ text, className = "" }: { text: string; className?: string }) {
  const { t, i18n } = useTranslation();
  const [speaking, setSpeaking] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const tts = getTtsBackend();

  useEffect(() => () => tts?.stop(), [tts]);
  if (!tts?.isAvailable()) return null;

  async function toggle() {
    if (!tts) return;
    if (speaking) {
      tts.stop();
      setSpeaking(false);
      return;
    }
    const lang = i18n.language as LangCode;
    if (!(await tts.hasVoiceFor(lang))) {
      setNoVoice(true);
      return;
    }
    setNoVoice(false);
    setSpeaking(true);
    try {
      await tts.speak(text, lang);
    } finally {
      setSpeaking(false);
    }
  }

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <button
        type="button"
        onClick={() => void toggle()}
        className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-2 py-0.5 text-[10px] font-medium text-gold hover:bg-gold/10 transition-colors"
      >
        {speaking ? <Square size={10} /> : <Volume2 size={11} />}
        {speaking ? t("weather.stop") : t("weather.listen")}
      </button>
      {noVoice && <span className="mt-1 text-[10px] text-muted">{t("weather.noVoice")}</span>}
    </span>
  );
}
