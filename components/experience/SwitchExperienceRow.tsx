"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import ListRow from "@/components/ui/ListRow";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { switchRowState, type ExperienceSkin } from "@/lib/experience";
import { useExperience } from "@/hooks/useExperience";
import ExperienceCards, { useSkinName } from "./ExperienceCards";

function formatDate(d: Date, language: string): string {
  return d.toLocaleDateString(language, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Settings → "Switch experience". The first pick is made once (onboarding or the one-time prompt);
 * this row is for changing it: one free change at any time, then once every 30 days. The server
 * decides; the row only reports what the server said. Hidden while the switch is off.
 */
export default function SwitchExperienceRow() {
  const { t, i18n } = useTranslation();
  const { info, change } = useExperience();
  const skinName = useSkinName();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ExperienceSkin | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);

  if (!info || !info.enabled || !info.picked || !info.skin) return null;

  const state = switchRowState(info);
  const subtitle =
    state.kind === "wait"
      ? t("experience.settings.wait", { date: formatDate(state.nextAllowedAt, i18n.language) })
      : state.kind === "free"
        ? t("experience.settings.free", { name: skinName(info.skin) })
        : t("experience.settings.current", { name: skinName(info.skin) });

  function close() {
    setOpen(false);
    setTarget(null);
  }

  async function confirm() {
    if (!target) return;
    setBusy(true);
    const res = await change(target);
    setBusy(false);
    if (res.ok) {
      setMessage({ text: t("experience.settings.done", { name: skinName(target) }), tone: "ok" });
    } else {
      setMessage({
        text: res.waitUntil
          ? t("experience.settings.tooSoon", { date: formatDate(res.waitUntil, i18n.language) })
          : t("experience.settings.error"),
        tone: "bad",
      });
    }
    close();
  }

  return (
    <>
      <div id="experience" data-testid="switch-experience">
        <ListRow
          icon={<Sparkles size={16} />}
          label={t("experience.settings.row")}
          subtitle={subtitle}
          onClick={state.kind === "wait" ? undefined : () => setOpen(true)}
          right={state.kind === "wait" ? null : undefined}
        />
        {message && (
          <p
            role="status"
            data-testid="switch-experience-message"
            className={`mt-1.5 ml-1 text-xs ${message.tone === "ok" ? "text-gold" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      {open && (
        <BottomSheetModal
          onClose={() => !busy && close()}
          closeLabel={t("common.close")}
          header={
            <h2 className="text-base font-semibold text-foreground">
              {target ? t("experience.settings.confirmTitle", { name: skinName(target) }) : t("experience.settings.row")}
            </h2>
          }
        >
          <div className="space-y-4 p-1 pb-4">
            {!target ? (
              <ExperienceCards
                current={info.skin}
                onPick={(skin) => {
                  // Picking the look they already have changes nothing.
                  if (skin === info.skin) close();
                  else setTarget(skin);
                }}
              />
            ) : (
              <>
                <p className="text-sm text-muted">
                  {info.freeChangeLeft ? t("experience.settings.confirmFree") : t("experience.settings.confirmLater")}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    data-testid="switch-experience-confirm"
                    disabled={busy}
                    onClick={confirm}
                    className="flex-1 rounded-2xl bg-gold py-3 text-sm font-medium text-black disabled:opacity-50"
                  >
                    {t("experience.settings.confirm")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={close}
                    className="flex-1 rounded-2xl border border-border py-3 text-sm text-muted"
                  >
                    {t("experience.settings.cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </BottomSheetModal>
      )}
    </>
  );
}
