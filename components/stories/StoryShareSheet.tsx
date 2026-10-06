"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Copy, Instagram, MessageSquare, Share2, X } from "lucide-react";
import type { DailyStoriesData } from "@/hooks/useDailyStories";
import { track } from "@/lib/analytics";
import { storyShareUrl } from "@/lib/stories/share";
import { captureCard, shareStory, type ShareOutcome } from "@/lib/stories/share-image";
import type { ShareTarget, StoryId } from "@/lib/stories/types";
import { useAuth } from "@/providers/auth-provider";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import ShareCard from "./ShareCard";
import type { StoryMeta } from "./story-meta";

const INSTAGRAM_GRADIENT = "linear-gradient(45deg, #F9CE34, #EE2A7B 50%, #6228D7)";

/**
 * Where to send a story: WhatsApp Status or a chat, an Instagram Story or
 * post, X, an SMS, the clipboard, or whatever else the phone offers. Every
 * choice but SMS and copy sends the story as a picture (the share card below,
 * kept off screen) with a caption that carries the install link; what each
 * device can actually do with it is decided in lib/stories/share-image.ts.
 */
export default function StoryShareSheet({
  open,
  onClose,
  storyId,
  data,
  meta,
}: {
  open: boolean;
  onClose: () => void;
  storyId: StoryId;
  data: DailyStoriesData;
  meta: StoryMeta;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const pngRef = useRef<Promise<string> | null>(null);
  const [busy, setBusy] = useState<ShareTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useDismissOnBackPress(open, onClose);

  /** The card is drawn once per opening and reused for every option tapped. */
  const getPng = useCallback(() => {
    if (!pngRef.current) {
      const card = cardRef.current;
      pngRef.current = card ? captureCard(card) : Promise.reject(new Error("No share card"));
      // A failed draw must not be remembered, or every later tap would fail the same way.
      pngRef.current.catch(() => {
        pngRef.current = null;
      });
    }
    return pngRef.current;
  }, []);

  // Start drawing as soon as the sheet is up, so the picture is ready by the
  // time an option is tapped. Browsers only let a page open the share sheet
  // within a few seconds of the tap; drawing after it could miss that.
  useEffect(() => {
    if (!open) return;
    pngRef.current = null;
    setMessage(null);
    setCopied(false);
    const timer = window.setTimeout(() => void getPng().catch(() => undefined), 250);
    return () => window.clearTimeout(timer);
  }, [open, storyId, getPng]);

  const caption = t("stories.sheet.caption", {
    text: meta.shareText,
    url: storyShareUrl(storyId, user?.referralCode),
  });

  const messageFor = (outcome: ShareOutcome): string | null => {
    if (outcome === "saved") return t("stories.sheet.saved");
    if (outcome === "linkOnly") return t("stories.sheet.updateApp");
    return null;
  };

  async function share(target: ShareTarget) {
    if (busy) return;
    setBusy(target);
    setMessage(target === "copy" || target === "sms" ? null : t("stories.sheet.preparing"));
    try {
      const outcome = await shareStory({ target, caption, fileName: `aroha-${storyId}-${data.day}.png`, getPng });
      track("story_share_clicked", { story: storyId, channel: target, outcome });
      if (outcome === "copied") {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
      setMessage(messageFor(outcome));
    } catch {
      setMessage(t("stories.sheet.failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {/* Off screen, never hidden: a hidden element has no layout to draw. The outer box does the
          positioning so the card itself is captured at 0,0. */}
      {open && (
        <div aria-hidden className="pointer-events-none fixed top-0" style={{ left: -10_000 }}>
          <ShareCard ref={cardRef} storyId={storyId} data={data} meta={meta} />
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 px-3 pb-[calc(var(--sab)+0.75rem)]"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("stories.sheet.title")}
              data-testid="story-share-sheet"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#15131f] p-5 text-white shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base">{t("stories.sheet.title")}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                <Option
                  target="whatsappStatus"
                  label={t("stories.sheet.whatsappStatus")}
                  background="rgba(37,211,102,0.16)"
                  icon={<Image src="/icons/whatsapp.png" alt="" width={28} height={28} />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="whatsapp"
                  label="WhatsApp"
                  background="rgba(37,211,102,0.16)"
                  icon={<Image src="/icons/whatsapp.png" alt="" width={28} height={28} />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="instagramStory"
                  label={t("stories.sheet.instagramStory")}
                  background={INSTAGRAM_GRADIENT}
                  icon={<Instagram size={22} />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="instagram"
                  label="Instagram"
                  background={INSTAGRAM_GRADIENT}
                  icon={<Instagram size={22} />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="x"
                  label="X"
                  background="#000000"
                  icon={
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  }
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="sms"
                  label="SMS"
                  background="rgba(212,175,55,0.16)"
                  icon={<MessageSquare size={20} className="text-gold" />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="copy"
                  label={copied ? t("shareSheet.copied") : t("shareSheet.copyLink")}
                  background="rgba(212,175,55,0.16)"
                  icon={copied ? <Check size={20} className="text-gold" /> : <Copy size={20} className="text-gold" />}
                  busy={busy}
                  onShare={share}
                />
                <Option
                  target="system"
                  label={t("stories.sheet.more")}
                  background="rgba(255,255,255,0.1)"
                  icon={<Share2 size={20} />}
                  busy={busy}
                  onShare={share}
                />
              </div>

              <p className="mt-4 min-h-[1.25rem] text-center text-xs text-white/70" role="status" data-testid="story-share-status">
                {message}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Option({
  target,
  label,
  icon,
  background,
  busy,
  onShare,
}: {
  target: ShareTarget;
  label: string;
  icon: ReactNode;
  background: string;
  busy: ShareTarget | null;
  onShare: (target: ShareTarget) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onShare(target)}
      disabled={busy !== null}
      data-testid={`story-share-${target}`}
      className="flex min-w-0 flex-col items-center gap-1.5 disabled:opacity-60"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 ${busy === target ? "animate-pulse" : ""}`}
        style={{ background }}
      >
        {icon}
      </span>
      <span className="w-full text-center text-[10px] leading-tight text-white/70">{label}</span>
    </button>
  );
}
