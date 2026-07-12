"use client";

import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BellOff } from "lucide-react";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

/**
 * Bottom sheet opened from the home top-bar bell icon. There's no
 * notifications backend yet, so this always shows the empty state — but the
 * button is wired up rather than doing nothing on tap.
 *
 * Uses the shared BottomSheetModal (portal to document.body) rather than its
 * own `fixed inset-0`: this component is rendered from inside TopBar, which
 * lives inside PageTransition's animated `motion.div`. That ancestor's
 * `transform` makes it the containing block for any plain `position: fixed`
 * descendant, so an un-portaled sheet gets sized/positioned against the full
 * (often taller-than-viewport) scrollable page content instead of the real
 * viewport — pushing an `items-end`-anchored sheet below the visible screen.
 */
export default function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  // Close on hardware back press instead of exiting the app/navigating away.
  useDismissOnBackPress(open, onClose);

  return (
    <AnimatePresence>
      {open && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close")}
          header={<h2 className="text-lg font-semibold font-display text-foreground">{t("notifications.title")}</h2>}
        >
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <BellOff size={32} className="text-gold/40" />
            <p className="text-sm text-muted max-w-xs">{t("notifications.empty")}</p>
          </div>
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}
