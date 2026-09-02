"use client";

import { useTranslation } from "react-i18next";
import { BIRTH_TIME_WINDOWS } from "@/lib/birth-time-window";

/**
 * The "I don't know the exact time" escape for the partner/spouse birth-detail
 * forms — the dense-form counterpart to onboarding's chat-style window step.
 *
 * Both forms previously fell back to a silent `"12:00"` when the time was left
 * blank, so a partner's chart was computed from noon with no flag and no caveat
 * anywhere. Picking a window here submits that window's MIDPOINT as the time
 * plus `timeAccuracy: "unknown"`, which is what makes the report narrate the
 * partner at sign level instead of asserting their ascendant.
 *
 * `value` is a BIRTH_TIME_WINDOWS key, or "" while an exact time is being given.
 */
export default function BirthTimeWindowSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (windowKey: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label={t("onboarding.windowQ")}
    >
      <option value="">{t("compatibilityPage.timeKnown")}</option>
      {BIRTH_TIME_WINDOWS.map((w) => (
        <option key={w.key} value={w.key}>
          {t(`onboarding.window.${w.key}`)} ({w.range})
        </option>
      ))}
    </select>
  );
}
