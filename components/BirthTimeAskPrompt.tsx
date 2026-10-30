"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { api } from "@/lib/api";
import {
  ANSWER_BODY,
  BIRTH_TIME_ASK_FEATURE,
  SNOOZE_KEY,
  SNOOZE_MS,
  shouldAskBirthTime,
  type BirthTimeAnswer,
} from "@/lib/birth-time-ask";
import { useNewFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";

const OPTIONS: { answer: BirthTimeAnswer; key: string }[] = [
  { answer: "record", key: "record" },
  { answer: "family", key: "family" },
  { answer: "unsure", key: "unsure" },
];

/**
 * Asks a reader who typed a birth time but never rated it where the time comes from (audit M7, switch
 * `home.birthTimeAsk`, ships off). The answer is saved with the normal profile update, so the
 * profile is rated from then on and never asked again; "Not now" waits two weeks (this device only).
 * Waits for the permissions prompt and any tour, and stays off report and onboarding screens, so it
 * never lands on top of something else.
 */
export default function BirthTimeAskPrompt() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const pathname = usePathname();
  const enabled = useNewFeature(BIRTH_TIME_ASK_FEATURE).enabled;
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive, tourPending } = useTour();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (open || typeof window === "undefined") return;
    if (!permissionsResolved || tourActive || tourPending) return;
    if (pathname?.startsWith("/reports/") || pathname?.startsWith("/onboarding")) return;
    let snoozedUntil: number | null = null;
    try {
      const raw = window.localStorage.getItem(SNOOZE_KEY);
      snoozedUntil = raw ? Number(raw) : null;
    } catch {
      // localStorage blocked: ask now; a later answer still ends the question for good.
    }
    if (shouldAskBirthTime(user, { enabled, snoozedUntil, now: Date.now() })) setOpen(true);
  }, [open, pathname, permissionsResolved, tourActive, tourPending, user, enabled]);

  if (!open) return null;

  const later = () => {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // nothing to remember it with: it will simply ask again next open
    }
    setOpen(false);
  };

  const answer = async (a: BirthTimeAnswer) => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await api.updateMe(ANSWER_BODY[a]);
      await refresh();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheetModal
      onClose={later}
      closeLabel={t("common.close")}
      header={
        <h2 className="flex items-center gap-2 text-base font-display text-foreground">
          <Clock size={18} className="text-gold" />
          {t("birthTimeAsk.title")}
        </h2>
      }
    >
      <div data-testid="birth-time-ask">
        <p className="mb-4 text-sm text-muted leading-relaxed">{t("birthTimeAsk.body")}</p>
        <div className="flex flex-col gap-2.5">
          {OPTIONS.map(({ answer: a, key }) => (
            <button
              key={a}
              type="button"
              disabled={saving}
              onClick={() => void answer(a)}
              className="w-full rounded-xl border border-gold/20 px-4 py-3 text-left transition-colors hover:border-gold/50 disabled:opacity-60"
            >
              <span className="block text-sm font-medium text-foreground">{t(`birthTimeAsk.${key}.label`)}</span>
              <span className="block text-xs text-muted">{t(`birthTimeAsk.${key}.hint`)}</span>
            </button>
          ))}
        </div>
        {failed && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {t("birthTimeAsk.failed")}
          </p>
        )}
        <button
          type="button"
          onClick={later}
          className="mt-4 w-full py-2.5 text-sm text-muted"
          data-testid="birth-time-ask-later"
        >
          {t("birthTimeAsk.later")}
        </button>
      </div>
    </BottomSheetModal>
  );
}
