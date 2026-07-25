"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, UserCircle } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import ProfileSwitcherSheet from "@/components/ProfileSwitcher";

/**
 * Compact "which profile am I looking at" pill for feature pages (Vastu,
 * etc). Tapping it opens the same bottom sheet used by `GreetingHeader` on
 * the home dashboard, so switching profile behaves identically everywhere.
 * Hidden until `profiles` has loaded — same guard `GreetingHeader` uses to
 * avoid flashing a broken trigger before the first fetch resolves.
 */
export default function ProfileSwitchTrigger({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { profiles, activeProfile } = useAuth();
  const [open, setOpen] = useState(false);

  if (profiles === null || !activeProfile) return null;

  const name = activeProfile.displayName?.trim() || t("profileSwitcher.unnamed");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("profileSwitcher.title")}
        className={`inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 pl-2 pr-3 py-1.5 text-left ${className}`}
      >
        <UserCircle size={16} className="text-gold shrink-0" />
        <span className="text-xs font-medium text-foreground truncate max-w-[9rem]">
          {t("profileSwitcher.viewingLabel", { name })}
        </span>
        <ChevronDown size={13} className="text-muted shrink-0" />
      </button>
      <ProfileSwitcherSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
