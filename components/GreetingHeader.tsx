"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import ProfileSwitcherSheet from "@/components/ProfileSwitcher";
import Avatar from "@/components/ui/Avatar";
import DailyStoriesAvatar from "@/components/stories/DailyStoriesAvatar";
import StoryHint from "@/components/stories/StoryHint";
import { markHintClosed, readHintClosed } from "@/lib/stories/hint";
import { useNewFeature } from "@/hooks/useFeature";

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
 *
 * With Daily Stories on (`home.dailyStories`) the avatar wears the story ring
 * and is its own button that opens today's stories; only the name beside it
 * opens the profile switcher then. Until the reader closes it or opens the
 * stories once, a small bubble under the avatar says what the ring is for.
 */
export default function GreetingHeader() {
  const { t } = useTranslation();
  const { user, profiles, activeProfile } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const stories = useNewFeature("home.dailyStories").enabled;
  // False until localStorage has been read on the client, so the bubble never flashes at someone who closed it.
  const [hint, setHint] = useState(false);

  useEffect(() => setHint(stories && !readHintClosed()), [stories]);

  const closeHint = useCallback(() => {
    markHintClosed();
    setHint(false);
  }, []);

  const displayName = activeProfile?.displayName ?? user?.displayName;
  const firstName = displayName?.trim().split(/\s+/)[0] ?? null;
  const greetingKey = timeOfDayKey(new Date().getHours());
  // "Namaste" is an India-specific greeting tied to the phone-OTP sign-in
  // path — Google/Apple sign-in (no phone claim) implies a non-Indian user
  // per the region-gated auth flow, so use a neutral "Hello" instead.
  const greetingPrefix = user?.phoneE164 ? "namaste" : "hello";

  const words = (
    <div>
      <p className="text-foreground text-base font-semibold leading-tight">
        {firstName
          ? t(`home.${greetingPrefix}`, { name: firstName })
          : t(`home.${greetingPrefix}Guest`)}
        {/* Visible cue that the whole row is tappable — the switcher sheet itself already
            existed and opened on tap, but with no icon/label it read as a static greeting. */}
        {profiles !== null && (
          <span className="ml-1.5 inline-flex items-baseline gap-0.5 text-muted text-xs font-normal">
            ({t("profileSwitcher.changeProfile")}
            <ChevronDown size={12} className="relative top-0.5" />)
          </span>
        )}
      </p>
      <p className="text-muted text-xs">{t(`home.greeting.${greetingKey}`)}</p>
    </div>
  );

  // Two buttons side by side (a button can't sit inside another): the ringed
  // avatar plays the stories, the name opens the profile switcher.
  if (stories) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-8 pb-2 flex items-center gap-3"
        >
          <DailyStoriesAvatar name={displayName} onOpen={closeHint} />
          {profiles === null ? (
            words
          ) : (
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              aria-label={t("profileSwitcher.title")}
              className="min-w-0 flex-1 text-left appearance-none bg-transparent p-0 border-0"
            >
              {words}
            </button>
          )}
        </motion.div>
        <StoryHint show={hint} onClose={closeHint} />
        {profiles !== null && <ProfileSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />}
      </>
    );
  }

  const greeting = (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="pt-8 pb-2 flex items-center gap-3"
    >
      <Avatar name={displayName} size="md" />
      {words}
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
