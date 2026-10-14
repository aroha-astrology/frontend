"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import {
  rateVoiceSession,
  VOICE_FEEDBACK_BAD_TAGS,
  VOICE_FEEDBACK_GOOD_TAGS,
  type VoiceFeedbackTag,
} from "@/lib/swarm-api";

/** How long the thank-you stays before the sheet closes itself. */
const THANKS_MS = 1800;

/**
 * "How was your call with Yogi Baba?" — shown once a voice call ends (see
 * useVoiceCall's `feedbackFor` for which calls get it). Stars first; then quick
 * answers that fit the stars (what was good for 4-5, what went wrong for 1-3)
 * and an optional comment. "Not now" closes it with nothing sent.
 */
export default function VoiceCallFeedbackSheet({
  voiceSessionId,
  onClose,
}: {
  voiceSessionId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<VoiceFeedbackTag[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useDismissOnBackPress(true, onClose);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onClose, THANKS_MS);
    return () => clearTimeout(id);
  }, [done, onClose]);

  const good = rating >= 4;
  const offered: readonly VoiceFeedbackTag[] = good ? VOICE_FEEDBACK_GOOD_TAGS : VOICE_FEEDBACK_BAD_TAGS;

  const pickRating = (n: number) => {
    // Moving between "good" and "poor" swaps the quick answers on offer, so
    // ones picked from the other set no longer apply.
    if (n >= 4 !== good) setTags([]);
    setRating(n);
  };

  const toggleTag = (tag: VoiceFeedbackTag) =>
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await rateVoiceSession(voiceSessionId, {
        rating,
        tags,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setDone(true);
    } catch {
      // Nothing the caller can do about it, and one lost answer isn't worth an
      // error state — close as if it landed, same idiom as FeedbackSheet.
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      onClose={onClose}
      closeLabel={t("common.close")}
      header={<h2 className="text-base font-display text-foreground">{t("callFeedback.title")}</h2>}
    >
      {done ? (
        <p className="py-6 text-center text-sm text-muted" data-testid="call-feedback-thanks">
          {t("callFeedback.thanks")}
        </p>
      ) : (
        <div data-testid="call-feedback-sheet">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => pickRating(n)}
                  aria-label={t("feedback.starLabel", { n })}
                  aria-pressed={rating === n}
                  className="p-1"
                >
                  <Star size={30} className={n <= rating ? "text-gold fill-gold" : "text-muted/40"} />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted text-center">{t("callFeedback.prompt")}</p>
          </div>

          {rating > 0 && (
            <>
              <p className="text-xs font-semibold text-foreground mb-2">
                {good ? t("callFeedback.likedQuestion") : t("callFeedback.wrongQuestion")}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {offered.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                      data-testid={`call-feedback-tag-${tag}`}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        on ? "border-gold bg-gold/15 text-gold" : "border-border text-muted"
                      }`}
                    >
                      {t(`callFeedback.tags.${tag}`)}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder={t("callFeedback.commentPlaceholder")}
                className="w-full rounded-2xl border border-gold/20 bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted/60 resize-none outline-none focus:border-gold/50"
              />
            </>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!rating || submitting}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold disabled:opacity-40"
          >
            {t("feedback.submit")}
          </button>
          <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-muted">
            {t("callFeedback.skip")}
          </button>
        </div>
      )}
    </BottomSheetModal>
  );
}
