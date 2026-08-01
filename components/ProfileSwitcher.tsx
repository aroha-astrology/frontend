"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import Avatar from "@/components/ui/Avatar";
import type { Profile, ProfileRelationship } from "@/lib/api";

/** Maps each relationship enum value to its i18n key under profileSwitcher.relationship. */
export const RELATIONSHIP_KEYS: Record<ProfileRelationship, string> = {
  partner: "profileSwitcher.relationship.partner",
  prospective_match: "profileSwitcher.relationship.prospective_match",
  spouse: "profileSwitcher.relationship.spouse",
  child: "profileSwitcher.relationship.child",
  parent: "profileSwitcher.relationship.parent",
  sibling: "profileSwitcher.relationship.sibling",
  friend: "profileSwitcher.relationship.friend",
  other: "profileSwitcher.relationship.other",
};

/**
 * Bottom sheet opened from GreetingHeader's avatar/name row. Lists every
 * profile on the account (primary first, per the backend's contract — not
 * re-sorted here), highlights the active one, and lets the user switch or
 * jump into creating a new profile.
 */
export default function ProfileSwitcherSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { profiles, switchProfile } = useAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on hardware back press instead of exiting the app/navigating away.
  useDismissOnBackPress(open, onClose);

  const handleSelect = async (profile: Profile) => {
    if (profile.isActive || switchingId) return;
    setError(null);
    setSwitchingId(profile.id);
    try {
      await switchProfile(profile.id);
      onClose();
    } catch {
      // switchProfile leaves profiles/activeProfile unchanged on failure —
      // just surface an inline error and keep the sheet open so the user can retry.
      setError(t("profileSwitcher.switchError"));
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreate = () => {
    onClose();
    router.push("/onboarding?mode=new-profile");
  };

  return (
    <AnimatePresence>
      {open && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close")}
          header={<h2 className="text-lg font-semibold font-display text-foreground">{t("profileSwitcher.title")}</h2>}
        >
          <div className="flex flex-col gap-2">
            {(profiles ?? []).map((profile) => {
              const isBusy = switchingId === profile.id;
              const disabled = switchingId !== null;
              const name = profile.displayName?.trim() || t("profileSwitcher.unnamed");
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleSelect(profile)}
                  disabled={disabled}
                  aria-current={profile.isActive ? "true" : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    profile.isActive ? "border-gold/50 bg-gold/10" : "border-gold/10 hover:border-gold/30"
                  }`}
                >
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-medium truncate">{name}</div>
                    {!profile.isPrimary && profile.relationship && (
                      <div className="text-muted text-xs truncate">{t(RELATIONSHIP_KEYS[profile.relationship])}</div>
                    )}
                  </div>
                  {isBusy ? (
                    <Loader2 size={18} className="text-gold animate-spin shrink-0" />
                  ) : profile.isActive ? (
                    <Check size={18} className="text-gold shrink-0" />
                  ) : null}
                </button>
              );
            })}

            {error && <p className="text-xs text-red-400 px-1">{error}</p>}

            <button
              type="button"
              onClick={handleCreate}
              disabled={switchingId !== null}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-gold/25 text-gold hover:bg-gold/5 transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <span className="text-sm font-medium">{t("profileSwitcher.createProfile")}</span>
            </button>
          </div>
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}
