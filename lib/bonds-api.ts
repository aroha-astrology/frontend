import { request, type Gender, type ProfileRelationship } from "@/lib/api";
import type { WhyFactor } from "@/lib/insights-api";

export type PhaseTone = "active" | "steady" | "mixed" | "testing";

/** The group a bond is listed under. Mirrors backend modules/bonds/bond-types.ts. */
export type BondCategory = "romantic" | "professional" | "family" | "social" | "other";

/** Mirrors backend modules/bonds/bonds.service.ts. */
export interface BondCompatibility {
  kind: "guna" | "harmony";
  score: number;
  max: number;
  pct: number;
  label: "excellent" | "good" | "average" | "below_average" | "poor" | "mixed";
  kootas: Array<{ koota: string; score: number; max: number }>;
}

export interface BondSummary {
  profileId: string;
  name: string | null;
  relationship: ProfileRelationship | null;
  /** Absent from an older API build; `categoryOf` works it out from the relationship. */
  category?: BondCategory;
  gender?: Gender;
  ready: boolean;
  compatibility: BondCompatibility | null;
  phase: PhaseTone | null;
}

export interface PeriodTheme {
  planet: string;
  /** 1-12 from that person's Ascendant. */
  house: number;
  theme: string;
}

export interface BondWindow {
  /** Whose sub-period it is. Absent from an older API build, where every window is the owner's. */
  who?: "you" | "them";
  start: string;
  end: string;
  tone: "good" | "care";
  lords: [string, string];
  why: WhyFactor[];
}

export interface SharedWindow {
  start: string;
  end: string;
  tone: "good" | "care";
}

export type RelateKey = "emotion" | "communication" | "spark" | "workflow" | "vibe" | "foundation";

export type RelatePart =
  | "grahaMaitri"
  | "bhakoot"
  | "tara"
  | "yoni"
  | "moonElement"
  | "mercury"
  | "venus"
  | "sun"
  | "jupiter"
  | "venusMars"
  | "marsVenus"
  | "lords4"
  | "lords10"
  | "lords11";

export interface RelateMeter {
  key: RelateKey;
  /** 0-100. */
  score: number;
  level: "high" | "mid" | "low";
  parts: Array<{ part: RelatePart; score: number; weight: number }>;
}

export interface BondMangal {
  you: boolean;
  them: boolean;
  status: "neither" | "both" | "oneSided";
}

export type BondDateKind =
  | "birthday"
  | "windowGood"
  | "windowCare"
  | "theirGood"
  | "theirCare"
  | "sharedGood"
  | "sharedCare";

export interface BondDetail extends BondSummary {
  phaseDetail: {
    tone: PhaseTone;
    lords: [string | null, string | null];
    themes?: [PeriodTheme | null, PeriodTheme | null];
    why: WhyFactor[];
  } | null;
  /** Null while the other person's chart isn't ready. */
  detail: {
    upcoming: BondWindow[];
    shared?: SharedWindow[];
    /** The last day "Periods ahead" looks at. */
    horizon?: string;
    communication: WhyFactor[];
    relate?: RelateMeter[];
    mangal?: BondMangal | null;
    dates: Array<{ date: string; kind: BondDateKind }>;
  } | null;
}

export const bondsApi = {
  list: () => request<{ bonds: BondSummary[] }>("/v1/bonds", { auth: true }),
  get: (profileId: string) => request<BondDetail>(`/v1/bonds/${profileId}`, { auth: true }),
};

/** Tailwind classes for a phase badge. */
export const PHASE_CLASS: Record<PhaseTone, string> = {
  active: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  steady: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  mixed: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  testing: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

/** The groups in the order the tabs and the add-a-person picker show them. */
export const BOND_CATEGORIES: readonly BondCategory[] = ["romantic", "family", "professional", "social", "other"];

/**
 * Every relationship under its group, in the order the picker offers them.
 * A Record over the whole type, so a relationship can't be left without a group.
 */
export const RELATIONSHIP_CATEGORY: Record<ProfileRelationship, BondCategory> = {
  spouse: "romantic",
  fiance: "romantic",
  partner: "romantic",
  prospective_match: "romantic",
  situationship: "romantic",
  crush: "romantic",
  first_love: "romantic",
  soulmate: "romantic",
  fwb: "romantic",
  ex: "romantic",
  parent: "family",
  child: "family",
  sibling: "family",
  cousin: "family",
  mother_in_law: "family",
  father_in_law: "family",
  business_partner: "professional",
  manager: "professional",
  employee: "professional",
  colleague: "professional",
  investor: "professional",
  competitor: "professional",
  friend: "social",
  roommate: "social",
  travel_buddy: "social",
  creative_partner: "social",
  gym_partner: "social",
  other: "other",
};

export function categoryOf(bond: Pick<BondSummary, "category" | "relationship">): BondCategory {
  return bond.category ?? (bond.relationship ? RELATIONSHIP_CATEGORY[bond.relationship] : "other");
}

export function relationshipsIn(category: BondCategory): ProfileRelationship[] {
  return (Object.keys(RELATIONSHIP_CATEGORY) as ProfileRelationship[]).filter(
    (r) => RELATIONSHIP_CATEGORY[r] === category,
  );
}

/** The app's own artwork for each group, shown beside the score. */
export const CATEGORY_ART: Record<BondCategory, string> = {
  romantic: "/true-love/couple.png",
  professional: "/career/climb.png",
  family: "/progeny/children.png",
  social: "/reports/relationship_monthly.png",
  other: "/reports/relationship_monthly.png",
};
