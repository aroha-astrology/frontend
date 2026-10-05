"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Angry, Frown, Gift, Laugh, Meh, Smile, Star } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { useFeature } from "@/hooks/useFeature";
import { useAuth } from "@/providers/auth-provider";

/** One face per star, so the picker reacts as the user moves across the row. */
const FACES = [Angry, Frown, Meh, Smile, Laugh] as const;

/** Shared with FeedbackPrompt: once a rating lands from anywhere — including
 * Settings — the automatic prompt must never ask for one again. */
export const FEEDBACK_SEEN_KEY = "aroha:feedbackSeen:v1";

/**
 * Our own rating + comment, stored in our DB — deliberately NOT wired to the
 * Play Store review card in lib/app-review.ts. Google forbids asking a rating
 * question before showing that card, and forbids routing only happy raters to
 * it, so the two must never chain. Every rating gets the identical form.
 *
 * The first rating a user ever sends earns a one-time wallet credit, whatever
 * the stars (the backend pays it; see feedback.repo.ts there). The sheet says
 * so only to someone who will get it: not yet rated, and the admin amount
 * (`referral.feedbackReward`) switched on. The amount is read live, so the
 * line never names a figure the wallet doesn't receive.
 */
export default function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const reward = useFeature("referral.feedbackReward");
  // 5000 mirrors the backend's own fallback for a session that has no amount for this key.
  const rewardPaise = reward.enabled ? (reward.pricePaise ?? 5000) : 0;
  // Decided once, when the sheet opens: the refresh after a submit flips `feedbackGiven`,
  // and the thank-you still has to name the credit that was just earned.
  const [rewardOffered] = useState(() => Boolean(user) && !user?.feedbackGiven && rewardPaise > 0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const Face = FACES[rating - 1] ?? Meh;

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await api.submitFeedback({ rating, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      try {
        window.localStorage.setItem(FEEDBACK_SEEN_KEY, "1");
      } catch {
        // localStorage blocked — the prompt is skipped entirely in that case anyway.
      }
      // Brings the new balance into the top bar straight away.
      if (rewardOffered) void refresh().catch(() => {});
      setDone(true);
    } catch {
      // Nothing actionable for the user, and losing one rating isn't worth an
      // error state — close as if it landed.
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={<h2 className="text-base font-display text-foreground">{t("feedback.title")}</h2>}
    >
      {done ? (
        <p className="py-6 text-center text-sm text-muted" data-testid="feedback-thanks">
          {rewardOffered
            ? t("feedback.thanksReward", { amount: formatRupees(rewardPaise) })
            : t("feedback.thanks")}
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 mb-5">
            <Face
              size={52}
              strokeWidth={1.5}
              className={rating ? "text-gold transition-colors" : "text-muted/40 transition-colors"}
            />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={t("feedback.starLabel", { n })}
                  aria-pressed={rating === n}
                  className="p-1"
                >
                  <Star
                    size={30}
                    className={n <= rating ? "text-gold fill-gold" : "text-muted/40"}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted text-center">{t("feedback.prompt")}</p>
            {rewardOffered && (
              <div
                className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5"
                data-testid="feedback-reward"
              >
                <span className="text-gold shrink-0">
                  <Gift size={16} />
                </span>
                <p className="text-xs text-gold leading-relaxed">
                  {t("feedback.reward", { amount: formatRupees(rewardPaise) })}
                </p>
              </div>
            )}
          </div>

          {rating > 0 && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={t("feedback.commentPlaceholder")}
              className="w-full rounded-2xl border border-gold/20 bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted/60 resize-none outline-none focus:border-gold/50"
            />
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!rating || submitting}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-40"
          >
            {t("feedback.submit")}
          </button>
        </>
      )}
    </BottomSheetModal>
  );
}
