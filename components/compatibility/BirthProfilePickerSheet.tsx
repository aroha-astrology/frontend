"use client";

import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { RELATIONSHIP_KEYS } from "@/components/ProfileSwitcher";
import type { Profile } from "@/lib/api";

/**
 * Bottom sheet for picking a saved birth profile to autofill one side of the
 * Kundli Matching form. Filters by gender so the Boy's-side sheet shows male
 * (and unset/other) profiles while the Girl's-side sheet shows female (and
 * unset/other) profiles.
 */
export default function BirthProfilePickerSheet({
  open,
  onClose,
  genderFilter,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  /** Which side we're filling: "male" shows the Boy's picker, "female" shows the Girl's. */
  genderFilter: "male" | "female";
  onSelect: (profile: Profile) => void;
}) {
  const { t } = useTranslation();
  const { profiles } = useAuth();

  useDismissOnBackPress(open, onClose);

  // Show profiles matching the gender filter, plus gender-null/other profiles
  // (they can't be auto-classified so we show them on both sides).
  const filtered = (profiles ?? []).filter((p) => {
    if (genderFilter === "male") return p.gender === "male" || p.gender === null || p.gender === "other";
    return p.gender === "female" || p.gender === null || p.gender === "other";
  });

  const handleSelect = (profile: Profile) => {
    onSelect(profile);
    onClose();
  };

  const title =
    genderFilter === "male"
      ? t("compatibilityPage.pickerTitleBoy")
      : t("compatibilityPage.pickerTitleGirl");

  return (
    <AnimatePresence>
      {open && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close")}
          header={<h2 className="text-lg font-semibold font-display text-foreground">{title}</h2>}
        >
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              /* Empty state */
              <div className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                <p className="mb-2">{t("compatibilityPage.pickerEmpty")}</p>
                <Link
                  href="/onboarding?mode=new-profile"
                  className="text-gold underline underline-offset-2"
                  onClick={onClose}
                >
                  {t("compatibilityPage.pickerEmptyLink")}
                </Link>
              </div>
            ) : (
              filtered.map((profile) => {
                const name = profile.displayName?.trim() || t("profileSwitcher.unnamed");
                const initial = name.charAt(0).toUpperCase();
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleSelect(profile)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-gold/10 hover:border-gold/30 text-left transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold text-sm font-semibold shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground text-sm font-medium truncate">{name}</div>
                      {!profile.isPrimary && profile.relationship && (
                        <div className="text-muted text-xs truncate">
                          {t(RELATIONSHIP_KEYS[profile.relationship])}
                        </div>
                      )}
                      {profile.isPrimary && (
                        <div className="text-muted text-xs truncate">
                          {t("compatibilityPage.pickerPrimaryLabel")}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}

            {/* Always show "Create profile" link */}
            {filtered.length > 0 && (
              <Link
                href="/onboarding?mode=new-profile"
                onClick={onClose}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-gold/25 text-gold hover:bg-gold/5 transition-colors mt-1"
              >
                <div className="w-10 h-10 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
                  <UserPlus size={18} />
                </div>
                <span className="text-sm font-medium">{t("profileSwitcher.createProfile")}</span>
              </Link>
            )}
          </div>
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}
