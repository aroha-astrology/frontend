"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  X,
  Pencil,
  Calendar,
  Clock,
  MapPin,
  UserPlus,
  MessageCircle,
  Wallet,
  FileText,
  HelpCircle,
  Settings,
  LogOut,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useFeature } from "@/hooks/useFeature";
import { useKundli } from "@/hooks/useKundli";
import { extractChartSigns } from "@/lib/kundli-helpers";
import { formatTimeOfBirth } from "@/lib/format";
import { zodiacSignLabel } from "@/data/zodiac";
import Card from "@/components/ui/Card";
import ListRow from "@/components/ui/ListRow";
import ProfileSwitcherSheet from "@/components/ProfileSwitcher";

/**
 * Right-side profile panel triggered by TopBar's kebab button. Replaces the
 * old left-side hamburger drawer. Shows the signed-in user's identity + a
 * quick natal-sign glance, promotes adding family/friend profiles, and links
 * out to the rest of the account surface.
 */
export default function AppMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const remediesEnabled = useFeature("nav.remedies").enabled;

  // Only fetches while the panel is open — useKundli's SWR cache (7 days)
  // makes this cheap even on every open.
  const { kundli, loading: kundliLoading } = useKundli(open);
  const chartSigns = useMemo(() => extractChartSigns(kundli?.chart), [kundli]);
  const signsReady = !kundliLoading && Boolean(chartSigns.moonSign || chartSigns.sunSign || chartSigns.ascendant);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on hardware back press instead of exiting the app/navigating away.
  useDismissOnBackPress(open, onClose);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      onClose();
      router.replace("/sign-in");
    }
  };

  const initial = (user?.displayName ?? user?.phoneE164 ?? user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            aria-hidden
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-label={t("menu.title")}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed left-0 top-0 bottom-0 z-[70] w-[84%] max-w-[340px] bg-card border-r border-gold/20 shadow-2xl overflow-y-auto"
          >
            {/* Pinned header — extra top padding clears the device status bar,
                which this fixed-to-top panel sits directly under. */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-gold/10 px-5 pt-11 pb-4 flex items-center justify-between">
              <button
                onClick={onClose}
                aria-label={t("common.close")}
                className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-gold/10 transition-colors"
              >
                <X size={18} />
              </button>
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/30 text-gold text-xs font-semibold hover:bg-gold/10 transition-colors"
              >
                <Pencil size={13} />
                {t("menu.editProfile")}
              </Link>
            </div>

            {/* Scrolling body */}
            <div className="px-5 py-5 flex flex-col gap-5">
              {/* Identity block */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/80 to-purple-600/60 flex items-center justify-center text-[#1a0e00] font-display text-xl shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-foreground font-medium text-base truncate">
                      {user?.displayName ?? t("menu.guest")}
                    </div>
                    {(user?.phoneE164 ?? user?.email) && (
                      <div className="text-muted text-xs truncate">{user?.phoneE164 ?? user?.email}</div>
                    )}
                  </div>
                </div>

                {(user?.dateOfBirth || user?.timeOfBirth || user?.placeOfBirth?.name) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
                    {user?.dateOfBirth && (
                      <span title={t("profile.dob")} className="flex items-center gap-1 text-[11px] text-muted">
                        <Calendar size={12} className="text-gold/70 shrink-0" />
                        {new Date(user.dateOfBirth).toLocaleDateString()}
                      </span>
                    )}
                    {user?.timeOfBirth && (
                      <span title={t("profile.tob")} className="flex items-center gap-1 text-[11px] text-muted">
                        <Clock size={12} className="text-gold/70 shrink-0" />
                        {formatTimeOfBirth(user.timeOfBirth)}
                      </span>
                    )}
                    {user?.placeOfBirth?.name && (
                      <span
                        title={t("profile.place")}
                        className="flex items-center gap-1 text-[11px] text-muted min-w-0"
                      >
                        <MapPin size={12} className="text-gold/70 shrink-0" />
                        <span className="truncate">{user.placeOfBirth.name}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Sign trio — Moon / Sun / Ascendant, only once resolved */}
              {signsReady && (
                <div className="flex gap-2">
                  {chartSigns.moonSign && (
                    <SignChip label={t("kundli.moonSign")} value={zodiacSignLabel(t, chartSigns.moonSign)} />
                  )}
                  {chartSigns.sunSign && (
                    <SignChip label={t("kundli.sunSign")} value={zodiacSignLabel(t, chartSigns.sunSign)} />
                  )}
                  {chartSigns.ascendant && (
                    <SignChip label={t("kundli.ascendant")} value={zodiacSignLabel(t, chartSigns.ascendant)} />
                  )}
                </div>
              )}

              {/* Add Loved Ones promo */}
              <Card className="p-4 border-gold/20 bg-gradient-to-br from-gold/10 via-card to-purple-950/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold shrink-0">
                    <UserPlus size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t("menu.promoTitle")}</p>
                    <p className="text-xs text-muted mt-0.5">{t("menu.promoDesc")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSwitcherOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-gold/15 border border-gold/40 text-gold text-sm font-medium hover:bg-gold/25 transition-colors"
                >
                  {t("menu.promoCta")}
                </button>
              </Card>

              {/* Rows */}
              <div className="flex flex-col gap-2">
                <ListRow
                  icon={<MessageCircle size={16} />}
                  label={t("menu.chatHistory")}
                  href="/chat-history"
                  onClick={onClose}
                />
                <ListRow
                  icon={<Wallet size={16} />}
                  label={t("menu.transactionHistory")}
                  href="/profile/orders"
                  onClick={onClose}
                />
                <ListRow
                  icon={<FileText size={16} />}
                  label={t("menu.myReports")}
                  href="/reports/history"
                  onClick={onClose}
                />
                {remediesEnabled && (
                  <ListRow
                    icon={<Flame size={16} />}
                    label={t("menu.remedies")}
                    href="/remedies"
                    onClick={onClose}
                  />
                )}
                <ListRow
                  icon={<HelpCircle size={16} />}
                  label={t("menu.needHelp")}
                  href="/help"
                  onClick={onClose}
                />
                <ListRow
                  icon={<Settings size={16} />}
                  label={t("menu.accountSettings")}
                  href="/settings"
                  onClick={onClose}
                />
                <ListRow
                  icon={<LogOut size={16} />}
                  label={t("menu.signOut")}
                  onClick={handleSignOut}
                  tone="danger"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gold/10 flex flex-col items-center gap-3">
                <div className="flex items-start gap-2 self-stretch">
                  <ShieldCheck size={13} className="text-gold/70 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted text-left">{t("menu.encryptionNote")}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <Link href="/legal/privacy" onClick={onClose} className="text-muted hover:text-gold transition-colors">
                    {t("legal.privacy")}
                  </Link>
                  <span className="text-muted/30">•</span>
                  <Link href="/legal/terms" onClick={onClose} className="text-muted hover:text-gold transition-colors">
                    {t("legal.terms")}
                  </Link>
                </div>
                <p className="text-[10px] text-muted/60">
                  {t("menu.appVersion", { version: process.env.NEXT_PUBLIC_APP_VERSION ?? "" })}
                </p>
              </div>
            </div>
          </motion.aside>

          <ProfileSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
}

function SignChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl border border-gold/15 bg-surface/50 text-center">
      <span className="text-[9px] text-muted uppercase tracking-wider truncate w-full">{label}</span>
      <span className="text-xs text-gold font-medium truncate w-full">{value}</span>
    </div>
  );
}
