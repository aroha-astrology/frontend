import { Capacitor, registerPlugin } from "@capacitor/core";
import type { LangCode } from "@/providers/language-provider";

/**
 * Text-to-speech is behind this interface, not called directly from
 * components, because Web Speech API support inside the Android app's
 * Capacitor WebView is confirmed broken on real devices (a long-standing
 * open Chromium bug — https://issues.chromium.org/issues/40417848 — the
 * speaker icon was silently hiding itself in the app despite working in a
 * plain browser). `getTtsBackend()` now prefers the native plugin
 * (`mobile/android`'s `TtsPlugin.java`, wrapping `android.speech.tts.
 * TextToSpeech` directly) whenever running inside the Capacitor app, and
 * falls back to `speechSynthesis` only on plain web.
 */
export interface TtsBackend {
  isAvailable(): boolean;
  hasVoiceFor(lang: LangCode): Promise<boolean>;
  speak(text: string, lang: LangCode): Promise<void>;
  stop(): void;
}

/** BCP-47 prefixes to try, in order, for each app language code. */
const LANG_BCP47: Record<LangCode, string[]> = {
  en: ["en-IN", "en-US", "en"],
  hi: ["hi-IN", "hi"],
  bn: ["bn-IN", "bn-BD", "bn"],
  mr: ["mr-IN", "mr"],
  te: ["te-IN", "te"],
  ta: ["ta-IN", "ta-LK", "ta"],
  gu: ["gu-IN", "gu"],
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;

/**
 * `getVoices()` returns an empty array on its first call in Chrome/Android —
 * the list loads asynchronously. Callers that skip this and read
 * `getVoices()` directly will misdetect every language as unavailable.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices) return Promise.resolve(cachedVoices);
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing.length > 0) {
    cachedVoices = existing;
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      synth.onvoiceschanged = null;
      const voices = synth.getVoices();
      cachedVoices = voices;
      resolve(voices);
    }, 2000);

    synth.onvoiceschanged = () => {
      clearTimeout(timeout);
      synth.onvoiceschanged = null;
      const voices = synth.getVoices();
      cachedVoices = voices;
      resolve(voices);
    };
  });
}

async function findVoice(lang: LangCode): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  const prefixes = LANG_BCP47[lang];
  for (const prefix of prefixes) {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
    if (match) return match;
  }
  return null;
}

/**
 * Assistant content is markdown (headers, bold, lists, tables). Speak the
 * plain words, not literal `**`/`#`/`|` characters.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

class SpeechSynthesisBackend implements TtsBackend {
  isAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  async hasVoiceFor(lang: LangCode): Promise<boolean> {
    return (await findVoice(lang)) !== null;
  }

  async speak(text: string, lang: LangCode): Promise<void> {
    if (!this.isAvailable()) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const voice = await findVoice(lang);
    const utterance = new SpeechSynthesisUtterance(stripMarkdownForSpeech(text));
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = LANG_BCP47[lang][0];
    }

    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.isAvailable()) window.speechSynthesis.cancel();
  }
}

interface TtsPluginInterface {
  isLanguageAvailable(options: { lang: string }): Promise<{ available: boolean }>;
  speak(options: { text: string; lang: string }): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Local native plugin registered in mobile/android's MainActivity (not an
 * npm package) — same pattern as lib/play-billing.ts's PlayBilling plugin.
 */
const NativeTts = registerPlugin<TtsPluginInterface>("Tts");

class NativeTtsBackend implements TtsBackend {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  async hasVoiceFor(lang: LangCode): Promise<boolean> {
    try {
      const { available } = await NativeTts.isLanguageAvailable({ lang: LANG_BCP47[lang][0] });
      return available;
    } catch {
      return false;
    }
  }

  async speak(text: string, lang: LangCode): Promise<void> {
    try {
      await NativeTts.speak({ text: stripMarkdownForSpeech(text), lang: LANG_BCP47[lang][0] });
    } catch {
      // best-effort — a failed native speak call shouldn't surface as a chat error
    }
  }

  stop(): void {
    NativeTts.stop().catch(() => {});
  }
}

let backend: TtsBackend | null | undefined;

/**
 * Returns null if no TTS backend is usable in this environment — callers
 * should hide the speaker affordance entirely rather than show a dead button.
 * Prefers the native plugin inside the Capacitor app; falls back to
 * speechSynthesis on plain web.
 */
export function getTtsBackend(): TtsBackend | null {
  if (backend !== undefined) return backend;

  const nativeBackend = new NativeTtsBackend();
  if (nativeBackend.isAvailable()) {
    backend = nativeBackend;
    return backend;
  }

  const speechSynthesisBackend = new SpeechSynthesisBackend();
  backend = speechSynthesisBackend.isAvailable() ? speechSynthesisBackend : null;
  return backend;
}
