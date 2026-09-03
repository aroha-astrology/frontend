"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import { useDismissOnBackPress } from "@/providers/back-handler-provider";
import { useAuth } from "@/providers/auth-provider";
import { reportsApi } from "@/lib/reports-api";
import { formatRupees } from "@/lib/format";
import { markReportRated } from "@/lib/report-rating";

/**
 * Per-report rating — distinct from FeedbackSheet's once-ever, app-wide
 * rating. A rating under 3 stars triggers an automatic 100% refund on the
 * backend; when that happens we show it before letting the caller's onClose
 * (which resumes the pending back-navigation) run, since money silently
 * landing in the wallet with no explanation would read as a bug.
 */
export default function ReportRatingSheet({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refundedPaise, setRefundedPaise] = useState<number | null>(null);

  useDismissOnBackPress(true, onClose);

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      const res = await reportsApi.rate(reportId, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      markReportRated(reportId);
      if (res.refundedPaise) {
        void refresh();
        setRefundedPaise(res.refundedPaise);
      } else {
        onClose();
      }
    } catch {
      // Nothing actionable for the user, and losing one rating isn't worth an
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
      header={<h2 className="text-base font-display text-foreground">{t("reportRating.title")}</h2>}
    >
      {refundedPaise !== null ? (
        <div className="py-4 text-center">
          <p className="text-sm text-foreground mb-4">
            {t("reportRating.refunded", { amount: formatRupees(refundedPaise) })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-sm font-bold"
          >
            {t("common.close")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 mb-5">
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
                  <Star size={30} className={n <= rating ? "text-gold fill-gold" : "text-muted/40"} />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted text-center">{t("reportRating.prompt")}</p>
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
