"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BellOff, Bell } from "lucide-react";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { api, type Notification } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // Close on hardware back press instead of exiting the app/navigating away.
  useDismissOnBackPress(open, onClose);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getNotifications()
        .then(data => {
          setNotifications(data);
          // Optimistically mark all as read after fetching
          const unread = data.some(n => !n.readAt);
          if (unread) {
            api.markNotificationsRead().catch(() => {});
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <BottomSheetModal
          onClose={onClose}
          closeLabel={t("common.close")}
          header={<h2 className="text-lg font-semibold font-display text-foreground">{t("notifications.title", "Notifications")}</h2>}
        >
          <div className="flex flex-col py-6 gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <BellOff size={32} className="text-gold/40" />
                <p className="text-sm text-muted max-w-xs">{t("notifications.empty", "No new notifications")}</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gold/10">
                {notifications.map((n) => (
                  <div key={n.id} className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-medium text-foreground text-[15px]">{n.title}</h3>
                      <span className="text-xs text-muted shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BottomSheetModal>
      )}
    </AnimatePresence>
  );
}
