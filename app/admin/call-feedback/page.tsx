"use client";

// Deliberate i18n exception, same as the rest of /admin (see app/admin/layout.tsx) —
// this page stays plain hardcoded English. Do NOT add admin.* i18n keys here.

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminVoiceFeedbackRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import ErrorRetry from "@/components/admin/ErrorRetry";

/** The quick answers on the after-call sheet, as the sheet shows them in English. */
const TAG_LABELS: Record<string, string> = {
  clearVoice: "Clear voice",
  helpfulAnswers: "Helpful answers",
  understoodMe: "Understood me",
  feltNatural: "Felt natural",
  hardToHear: "Hard to hear",
  callCut: "Call cut off",
  didntUnderstand: "Didn't understand me",
  wrongLanguage: "Wrong language",
  notHelpful: "Answers not helpful",
  slowReplies: "Slow replies",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Same rule as the Users table: start to hang-up, or the minutes granted when the end never arrived. */
function callLength(row: AdminVoiceFeedbackRow): string {
  const seconds = row.callEndedAt
    ? Math.max(0, Math.round((new Date(row.callEndedAt).getTime() - new Date(row.callStartedAt).getTime()) / 1000))
    : row.minutesCharged * 60;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AdminCallFeedbackPage() {
  const [rows, setRows] = useState<AdminVoiceFeedbackRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listVoiceFeedback({ limit: 200 })
      .then((res) => {
        setRows(res.feedback);
        setTotal(res.total);
        setAverage(res.averageRating);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load call feedback"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gold mb-1">Call Feedback</h1>
      <p className="text-sm text-muted mb-4">
        What users answered to &ldquo;How was your call with Baba Ji?&rdquo; after a voice call (switch{" "}
        <code>chat.voiceFeedback</code>). Ratings of 2 stars or less are also sent to Telegram.
      </p>

      {rows && !error && total > 0 && (
        <p className="text-sm text-foreground mb-4" data-testid="call-feedback-summary">
          <span className="text-gold font-semibold">★ {average ?? "—"}</span> average from {total}{" "}
          {total === 1 ? "answer" : "answers"}
        </p>
      )}

      {loading && !rows && <p className="text-sm text-muted text-center py-10">Loading…</p>}
      {error && <ErrorRetry message={error} onRetry={fetchRows} />}

      {rows && !error && (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-10">No call feedback yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase tracking-wide bg-surface">
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Stars</th>
                    <th className="px-4 py-2 font-medium">Quick answers</th>
                    <th className="px-4 py-2 font-medium">Comment</th>
                    <th className="px-4 py-2 font-medium">Call</th>
                    <th className="px-4 py-2 font-medium">Answered</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.voiceSessionId} className="border-t border-border">
                      <td className="px-4 py-2 text-foreground">
                        {r.displayName ?? "—"} <span className="text-muted text-xs">{r.phoneE164 ?? r.userId}</span>
                      </td>
                      <td className={`px-4 py-2 whitespace-nowrap ${r.rating <= 2 ? "text-red-400" : "text-foreground"}`}>
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted">
                        {r.tags.length ? r.tags.map((tag) => TAG_LABELS[tag] ?? tag).join(", ") : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted max-w-md whitespace-normal break-words">{r.comment ?? "—"}</td>
                      <td className="px-4 py-2 text-muted whitespace-nowrap">
                        {callLength(r)}
                        <div className="text-[11px]">{formatDateTime(r.callStartedAt)}</div>
                      </td>
                      <td className="px-4 py-2 text-muted whitespace-nowrap">{formatDateTime(r.feedbackAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > rows.length && (
            <p className="text-xs text-muted mt-2">Showing the newest {rows.length} of {total}.</p>
          )}
        </>
      )}
    </div>
  );
}
