"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

/**
 * The one-time bubble under the Home avatar that points at the story ring
 * and says what a tap on it opens. It sits in the page's flow (pushing the
 * cards down rather than covering them) and folds away when closed; the
 * remembering lives in lib/stories/hint.ts.
 */
export default function StoryHint({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          // The top padding keeps the beak inside the clipped box.
          className="overflow-hidden pt-2 pb-1"
        >
          <div
            role="status"
            data-testid="story-hint"
            className="relative max-w-xs rounded-2xl border border-gold/30 bg-card py-2.5 pl-3.5 pr-10 shadow-lg"
          >
            {/* Beak under the middle of the ringed avatar (54px wide). */}
            <span
              aria-hidden
              className="absolute -top-[7px] left-[21px] h-3 w-3 rotate-45 border-l border-t border-gold/30 bg-card"
            />
            <p className="text-sm font-semibold leading-snug text-gold">{t("stories.hint.title")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("stories.hint.body")}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              data-testid="story-hint-close"
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-muted transition-colors hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
