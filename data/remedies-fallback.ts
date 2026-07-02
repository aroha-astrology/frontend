import type { RemedyItem } from "@/lib/api";

/**
 * Shown when GET /v1/remedies isn't reachable (not yet deployed, or a
 * network failure) so the page always renders content. Mirrors the
 * backend's own GENERAL_REMEDIES list (backend/src/modules/astro/astro.service.ts)
 * so users see the same six remedies either way.
 */
export const REMEDIES_FALLBACK: RemedyItem[] = [
  {
    planet: "General",
    title: "Career Growth",
    icon: "briefcase",
    remedy: "Chant Om Brihaspataye Namah 108 times every Thursday morning facing east.",
  },
  {
    planet: "General",
    title: "Marriage & Love",
    icon: "heart",
    remedy: "Offer white flowers to Goddess Lakshmi on Fridays and recite Om Shri Lakshmyai Namah.",
  },
  {
    planet: "General",
    title: "Health & Vitality",
    icon: "leaf",
    remedy: "Recite the Mahamrityunjaya Mantra 108 times daily at sunrise for overall well-being.",
  },
  {
    planet: "General",
    title: "Financial Abundance",
    icon: "coins",
    remedy: "Donate yellow lentils (chana dal) to a Brahmin on Thursday for Jupiter's blessings.",
  },
  {
    planet: "General",
    title: "Mental Peace",
    icon: "brain",
    remedy: "Light a ghee lamp in front of Lord Shiva on Mondays and offer milk to Shivalinga.",
  },
  {
    planet: "General",
    title: "Family Harmony",
    icon: "home",
    remedy: "Keep a Tulsi plant at the entrance of your home and water it daily except Sundays.",
  },
];
