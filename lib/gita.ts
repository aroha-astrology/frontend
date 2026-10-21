// Bhagavad Gita: 701 verses, Devanagari only — no translation, no IAST. This
// is a deliberately separate content model from lib/shlokas.ts, not a variant
// of it: no per-language fields (nothing here is translated), and the content
// + audio are both served live from the backend rather than shipped as
// frontend public/ assets — the 50-mantra Shlokas set is ~4MB of audio and
// fits in the repo; this one is ~57MB and does not.

import { IMG_BASE } from "./shlokas";

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.arohaastrology.in"
).replace(/\/$/, "");

export interface GitaVerse {
  id: string; // "ch2-v47" — also the audio filename stem, see audioUrl()
  chapter: number;
  verse: number;
  sanskrit: string;
  /** Devanagari category label, e.g. "कर्मयोग". See CATEGORY_GLOSS for the English gloss. */
  mainCategory: string;
  /** English tag keys, e.g. ["anxiety"]. Empty for narrative verses — that's correct, not a data gap. See TAG_GLOSS for Devanagari labels. */
  tags: string[];
}

/** Devanagari label for each English tag key, matching the categorised MD's own vocabulary. */
export const TAG_GLOSS: Record<string, string> = {
  anxiety: "चिन्ता",
  fear: "भयम्",
  grief: "शोकः",
  anger: "क्रोधः",
  doubt: "संशयः",
  attachment: "आसक्तिः",
  desire: "कामः",
  restlessness: "अशान्तिः",
  peace: "शान्तिः",
  courage: "साहसम्",
  focus: "एकाग्रता",
  purpose: "कर्तव्यम्",
  surrender: "शरणागतिः",
  equanimity: "समत्वम्",
  "self-worth": "आत्मबलम्",
  compassion: "करुणा",
  bereavement: "मृत्युशोकः",
  "decision-making": "निर्णयः",
  failure: "असफलता",
  "success-humility": "विनयः",
  discipline: "संयमः",
  loneliness: "एकाकित्वम्",
  forgiveness: "क्षमा",
};

/** English gloss for each Devanagari category label. Order here is display order on the browse page. */
export const CATEGORY_GLOSS: Record<string, string> = {
  कर्मयोग: "Karma — Action & Duty",
  ज्ञानयोग: "Jnana — Knowledge & the Self",
  भक्तियोग: "Bhakti — Devotion & Surrender",
  ध्यानयोग: "Dhyana — Meditation & Mind Control",
  "आत्मा एवं अमरत्वम्": "Atman & Immortality",
  "ब्रह्म एवं सृष्टिक्रमः": "Brahman & Cosmic Order",
  "गुणाः एवं स्वभावः": "Gunas & Human Nature",
  "विभूतिः एवं विश्वरूपम्": "Divine Manifestation",
  "धर्मः एवं आचारः": "Dharma & Ethics",
  कथाप्रसङ्गः: "Narrative & Context",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_GLOSS);

/** Module-level memo — same reasoning as lib/shlokas.ts's loadShlokas(): avoid a duplicate in-flight request within one session. Not a localStorage cache; this is live backend content, not an immutable static asset. */
let pending: Promise<GitaVerse[]> | null = null;

export function loadGitaVerses(): Promise<GitaVerse[]> {
  if (!pending) {
    pending = fetch(`${BASE_URL}/v1/gita/verses`)
      .then((res) => {
        if (!res.ok) throw new Error(`gita/verses: ${res.status}`);
        return res.json() as Promise<{ verses: GitaVerse[] }>;
      })
      .then((data) => data.verses)
      .catch((err) => {
        pending = null; // don't memoize a failure — a transient blip shouldn't blank the page for the rest of the session
        throw err;
      });
  }
  return pending;
}

export function gitaAudioUrl(id: string): string {
  return `${BASE_URL}/v1/gita/audio/${id}.mp3`;
}

export type GitaSpeaker = "krishna" | "arjuna" | "sanjaya" | "dhritarashtra";

// The source marks who speaks with a heading line ("अर्जुन उवाच", "Arjuna
// said"), sometimes run straight into the verse with no line break.
const SPEAKER_LINES: [RegExp, GitaSpeaker][] = [
  [/^\s*श्री\s*भगवानुवाच\s*/, "krishna"],
  [/^\s*अर्जुन\s*उवाच\s*/, "arjuna"],
  [/^\s*(?:सञ्जय|संजय)\s*उवाच\s*/, "sanjaya"],
  [/^\s*धृतराष्ट्र\s*उवाच\s*/, "dhritarashtra"],
];

/**
 * A verse as display lines: the speaker heading taken off (it is not part of
 * the verse; showing only it made a list card read "धृतराष्ट्र उवाच"), the
 * blank lines between padas dropped, and a pada run on after a danda put on
 * its own line. Use this wherever a verse is shown, not `split("\n")[0]`.
 */
export function splitGitaVerse(sanskrit: string): { speaker: GitaSpeaker | null; lines: string[] } {
  let text = sanskrit;
  let speaker: GitaSpeaker | null = null;
  for (const [re, who] of SPEAKER_LINES) {
    const m = text.match(re);
    if (m) {
      speaker = who;
      text = text.slice(m[0].length);
      break;
    }
  }
  const lines = text
    // One verse (18.78) ends "।।18.78।": a doubled danda and its own number.
    .replace(/।।/g, "॥")
    .replace(/\s*[0-9०-९]+(?:\.[0-9०-९]+)*\s*[।॥]?/g, "")
    .split("\n")
    .flatMap((line) => line.split(/(?<=।)/))
    .map((line) => line.trim())
    .filter(Boolean);
  return { speaker, lines };
}

/**
 * Card art for a verse. There is no art per verse, so it comes from the three
 * Gita paintings by what the verse is: meditation for chapter 6 (Dhyana Yoga;
 * the ध्यानयोग theme itself covers half the Gita, too many for one picture),
 * the battlefield for the story and for anyone but Krishna speaking, Krishna
 * for the rest.
 */
export function gitaImage(v: GitaVerse): string {
  if (v.chapter === 6) return `${IMG_BASE}gita-48.webp`;
  const { speaker } = splitGitaVerse(v.sanskrit);
  if (v.mainCategory === "कथाप्रसङ्गः" || (speaker && speaker !== "krishna")) return `${IMG_BASE}gita-47.webp`;
  return `${IMG_BASE}gita-247.webp`;
}

/** Where a verse opens: the chant screen with the bead counter (there is no separate verse page). */
export function gitaChantHref(id: string): string {
  return `/shlokas/mala?verse=${encodeURIComponent(id)}&type=gita`;
}
