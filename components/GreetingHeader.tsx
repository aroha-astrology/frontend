"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import ProfileSwitcherSheet from "@/components/ProfileSwitcher";
import Avatar from "@/components/ui/Avatar";

function timeOfDayKey(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * Compact personalized header at the top of the home dashboard — replaces
 * the old large centered logo hero. Shows a placeholder avatar (no
 * `photoURL` field exists on `User`/`Profile` yet) and a first-name greeting
 * with a time-of-day line. The credit balance lives in `TopBar` instead.
 *
 * The greeting reflects the active profile (falling back to the account
 * owner) and, once profiles have loaded, is tappable to open a
 * profile-switcher bottom sheet. Kept non-interactive while `profiles` is
 * still null so there's no flash of a broken/empty switcher trigger before
 * that first load resolves.
 */
export default function GreetingHeader() {
  const { t } = useTranslation();
  const { user, profiles, activeProfile } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const displayName = activeProfile?.displayName ?? user?.displayName;
  const firstName = displayName?.trim().split(/\s+/)[0] ?? null;
  const greetingKey = timeOfDayKey(new Date().getHours());
  // "Namaste" is an India-specific greeting tied to the phone-OTP sign-in
  // path — Google/Apple sign-in (no phone claim) implies a non-Indian user
  // per the region-gated auth flow, so use a neutral "Hello" instead.
  const greetingPrefix = user?.phoneE164 ? "namaste" : "hello";

  const greeting = (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-5 pt-8 pb-2 flex items-center gap-3"
    >
      <Avatar name={displayName} size="md" />
      <div>
        <p className="text-foreground text-base font-semibold leading-tight">
          {firstName
            ? t(`home.${greetingPrefix}`, { name: firstName })
            : t(`home.${greetingPrefix}Guest`)}
        </p>
        <p className="text-muted text-xs">{t(`home.greeting.${greetingKey}`)}</p>
      </div>
      {/* Visible cue that the whole row is tappable — the switcher sheet itself already
          existed and opened on tap, but with no icon/label it read as a static greeting. */}
      {profiles !== null && (
        <span className="ml-auto flex items-center gap-0.5 text-muted text-xs shrink-0">
          {t("profileSwitcher.changeProfile")}
          <ChevronDown size={13} />
        </span>
      )}
    </motion.div>
  );

  // profiles === null means the first profiles fetch hasn't resolved yet —
  // render the static greeting so there's nothing broken/empty to tap.
  if (profiles === null) {
    return greeting;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        aria-label={t("profileSwitcher.title")}
        className="w-full text-left appearance-none bg-transparent p-0 border-0"
      >
        {greeting}
      </button>
      <ProfileSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
}
