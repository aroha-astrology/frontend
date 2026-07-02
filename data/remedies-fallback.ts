import type { RemedyItem } from "@/lib/api";

/**
 * Shown when GET /v1/remedies isn't reachable (not yet deployed, or a
 * network failure) so the page always renders content. Mirrors the
 * backend's own GENERAL_REMEDIES list (backend/src/modules/astro/astro.service.ts)
 * so users see the same six remedies either way.
 */
export const REMEDIES_FALLBACK: RemedyItem[] = [
  {
    id: "fallback-career",
    planet: "General",
    title: "Career Growth",
    description: "A Jupiter remedy to support career growth and recognition.",
    category: "career",
    icon: "briefcase",
    remedy: "Chant Om Brihaspataye Namah 108 times every Thursday morning facing east.",
  },
  {
    id: "fallback-love",
    planet: "General",
    title: "Marriage & Love",
    description: "A Venus/Lakshmi remedy to support relationships and marriage.",
    category: "love",
    icon: "heart",
    remedy: "Offer white flowers to Goddess Lakshmi on Fridays and recite Om Shri Lakshmyai Namah.",
  },
  {
    id: "fallback-health",
    planet: "General",
    title: "Health & Vitality",
    description: "A general remedy for overall health and well-being.",
    category: "health",
    icon: "leaf",
    remedy: "Recite the Mahamrityunjaya Mantra 108 times daily at sunrise for overall well-being.",
  },
  {
    id: "fallback-finance",
    planet: "General",
    title: "Financial Abundance",
    description: "A Jupiter remedy to support financial growth and abundance.",
    category: "finance",
    icon: "coins",
    remedy: "Donate yellow lentils (chana dal) to a Brahmin on Thursday for Jupiter's blessings.",
  },
  {
    id: "fallback-peace",
    planet: "General",
    title: "Mental Peace",
    description: "A Shiva remedy to support calm and mental clarity.",
    category: "peace",
    icon: "brain",
    remedy: "Light a ghee lamp in front of Lord Shiva on Mondays and offer milk to Shivalinga.",
  },
  {
    id: "fallback-family",
    planet: "General",
    title: "Family Harmony",
    description: "A household remedy to support family harmony.",
    category: "family",
    icon: "home",
    remedy: "Keep a Tulsi plant at the entrance of your home and water it daily except Sundays.",
  },
];
