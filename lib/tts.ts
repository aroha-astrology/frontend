import type { LangCode } from "@/providers/language-provider";

/**
 * Text-to-speech is behind this interface, not called directly from
 * components, because Web Speech API support inside the Android app's
 * Capacitor WebView is unconfirmed (it's a long-standing open Chromium bug —
 * https://issues.chromium.org/issues/40417848 — that works in Chrome but can
 * be silently broken in an embedded WebView). If real-device testing shows
 * it's dead there, a native Capacitor plugin backend can be added here
 * without touching any UI code — callers only ever see `getTtsBackend()`.
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

let backend: TtsBackend | null | undefined;

/**
 * Returns null if no TTS backend is usable in this environment — callers
 * should hide the speaker affordance entirely rather than show a dead button.
 */
export function getTtsBackend(): TtsBackend | null {
  if (backend !== undefined) return backend;
  const speechSynthesisBackend = new SpeechSynthesisBackend();
  backend = speechSynthesisBackend.isAvailable() ? speechSynthesisBackend : null;
  return backend;
}
