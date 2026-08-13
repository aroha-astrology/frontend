// Bhagavad Gita: 701 verses, Devanagari only — no translation, no IAST. This
// is a deliberately separate content model from lib/shlokas.ts, not a variant
// of it: no per-language fields (nothing here is translated), and the content
// + audio are both served live from the backend rather than shipped as
// frontend public/ assets — the 50-mantra Shlokas set is ~4MB of audio and
// fits in the repo; this one is ~57MB and does not.

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
