import { Briefcase, Heart, Home, Shapes, Users, type LucideIcon } from "lucide-react";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import type { BondCategory, BondSummary } from "@/lib/bonds-api";

/** The icon that marks a bond's group. An icon, not a colour: the colours already mean the phase. */
export const CATEGORY_ICON: Record<BondCategory, LucideIcon> = {
  romantic: Heart,
  family: Home,
  professional: Briefcase,
  social: Users,
  other: Shapes,
};

/** What a bond is called under the person's name: Mother or Father for a parent whose gender is known. */
export function relationLabel(t: (key: string) => string, bond: Pick<BondSummary, "relationship" | "gender">): string {
  if (!bond.relationship) return "";
  if (bond.relationship === "parent" && bond.gender === "female") return t("bonds.mother");
  if (bond.relationship === "parent" && bond.gender === "male") return t("bonds.father");
  return t(RELATIONSHIP_KEYS[bond.relationship]);
}
