"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MessageSquare, Copy, Share2, X, Check } from "lucide-react";
import Image from "next/image";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { buildReferralShareLinks } from "@/lib/referral";
import { useReferralAmounts } from "@/hooks/useReferralAmounts";
import { useAuth } from "@/providers/auth-provider";

/**
 * App-choice picker for sharing a referral link — WhatsApp/Telegram/SMS/Copy,
 * built as explicit deep links rather than relying on navigator.share, which
 * is unreliable inside the shipped app's Capacitor Android WebView (it was
 * silently falling straight through to a clipboard copy with no app picker).
 */
export default function ShareOptionsSheet({
  open,
  onClose,
  code,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  // Amounts come from the admin-set referral features so the shared message
  // quotes what the recipient will actually receive. A live gift campaign
  // (e.g. Raksha Bandhan) swaps in its festive framing via i18next context —
  // see buildReferralShareLinks — with no code change needed once it ends.
  const links = buildReferralShareLinks(
    t,
    code,
    useReferralAmounts(),
    user?.activeClaimableCampaign?.title,
  );
  const canShareMore = typeof navigator !== "undefined" && !!navigator.share;

  useDismissOnBackPress(open, onClose);

  const openAndClose = (url: string) => {
    window.location.href = url;
    onClose();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(links.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const shareMore = async () => {
    try {
      await navigator.share({ title: "Aroha Astrology", text: links.text });
      onClose();
    } catch {
      // Dismissed the native picker — leave the sheet open so they can try another option.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-gold/20 bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display text-foreground">{t("shareSheet.title")}</h2>
              <button
                onClick={onClose}
                aria-label={t("common.close")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-foreground hover:bg-gold/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <ShareOption
                icon={<Image src="/icons/whatsapp.png" alt="" width={28} height={28} />}
                label="WhatsApp"
                colorClass="bg-green-500/15"
                onClick={() => openAndClose(links.whatsapp)}
              />
              <ShareOption
                icon={<Image src="/icons/telegram.png" alt="" width={28} height={28} />}
                label="Telegram"
                colorClass="bg-sky-500/15"
                onClick={() => openAndClose(links.telegram)}
              />
              <ShareOption
                icon={<MessageSquare size={20} />}
                label="SMS"
                colorClass="bg-gold/15 text-gold"
                onClick={() => openAndClose(links.sms)}
              />
              <ShareOption
                icon={copied ? <Check size={20} /> : <Copy size={20} />}
                label={copied ? t("shareSheet.copied") : t("shareSheet.copyLink")}
                colorClass="bg-gold/15 text-gold"
                onClick={copyLink}
              />
            </div>

            {canShareMore && (
              <button
                onClick={shareMore}
                className="mt-4 w-full py-2.5 rounded-xl border border-gold/20 text-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-gold/10 transition-colors"
              >
                <Share2 size={14} className="text-gold" />
                {t("shareSheet.more")}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShareOption({
  icon,
  label,
  colorClass,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  colorClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-0"
    >
      <span className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </span>
      <span className="text-[10px] text-muted truncate w-full text-center">{label}</span>
    </button>
  );
}
