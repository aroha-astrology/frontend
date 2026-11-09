"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { KUNDLI_UPDATE_SNOOZE_KEY, KUNDLI_UPDATE_SNOOZE_MS, kundliUpdateView } from "@/lib/kundli-update";
import { useAuth } from "@/providers/auth-provider";
import { usePermissionsPrompt } from "@/providers/permissions-prompt-provider";
import { useTour } from "@/providers/tour-provider";

/**
 * "Your Kundli needs a quick update" (audit Sprint 16): on Home only, when the active profile's saved
 * Kundli was built by an older calculation. "Open Kundli" goes to the page where the rebuild starts;
 * "Later" hides it for a day on this device. Waits for the permissions prompt and any tour.
 */
export default function KundliUpdatePrompt() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { resolved: permissionsResolved } = usePermissionsPrompt();
  const { tourActive, tourPending } = useTour();

  const [snoozedUntil, setSnoozedUntil] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(KUNDLI_UPDATE_SNOOZE_KEY);
      if (raw) {
        setSnoozedUntil(Number(raw));
      } else {
        setSnoozedUntil(null);
      }
    } catch {
      setSnoozedUntil(null);
    }
  }, []);

  const gatesOpen = permissionsResolved && !tourActive && !tourPending;

  const view = snoozedUntil === undefined || !gatesOpen ? null : kundliUpdateView(user, { pathname, snoozedUntil, now: Date.now() });

  // Coming back to Home (for example from the Kundli page): re-read the flag, but only for a reader
  // who has one, so everyone else pays no extra call.
  const userRef = useRef(user);
  userRef.current = user;
  useEffect(() => {
    const u = userRef.current;
    if (pathname !== "/" || !u || !(u.kundliOutdated || u.kundliUpdating)) return;
    void refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // While the old chart is being rebuilt, re-read the flag every 5 seconds (at most 2 minutes).
  useEffect(() => {
    if (view !== "updating") return;
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks > 24) {
        window.clearInterval(id);
        return;
      }
      void refresh().catch(() => {});
    }, 5000);
    return () => window.clearInterval(id);
  }, [view, refresh]);

  const later = useCallback(() => {
    const until = Date.now() + KUNDLI_UPDATE_SNOOZE_MS;
    try {
      window.localStorage.setItem(KUNDLI_UPDATE_SNOOZE_KEY, String(until));
    } catch {
      // nothing to remember it with: it will simply show again next open
    }
    setSnoozedUntil(until);
  }, []);

  const open = () => router.push("/kundli");

  if (view === null) return null;

  return (
    <BottomSheetModal
      onClose={later}
      closeLabel={t("common.close")}
      header={
        <h2 className="flex items-center gap-2 text-base font-display text-foreground">
          <RefreshCw size={18} className="text-gold" />
          {view === "updating" ? t("kundliUpdate.updatingTitle") : t("kundliUpdate.title")}
        </h2>
      }
    >
      <div data-testid="kundli-update">
        <p className="mb-4 text-sm text-muted leading-relaxed">
          {view === "updating" ? t("kundliUpdate.updatingBody") : t("kundliUpdate.body")}
        </p>
        {view === "outdated" && (
          <button type="button" onClick={open} data-testid="kundli-update-open"
            className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-medium text-black">
            {t("kundliUpdate.open")}
          </button>
        )}
        <button type="button" onClick={later} data-testid="kundli-update-later"
          className="mt-3 w-full py-2.5 text-sm text-muted">
          {t("kundliUpdate.later")}
        </button>
      </div>
    </BottomSheetModal>
  );
}
