// Maps a failed paid-report request to what the user should read. Pure.

import { ApiError } from "@/lib/api";

/** Map an analyze failure to the message the user should see (an i18n key, or the INSUFFICIENT_CREDITS sentinel). */
export function reportErrorKey(e: unknown): string {
  if (!(e instanceof ApiError)) return "vastu.analysis.error";
  if (e.status === 0) return "vastu.reportErrors.offline";
  if (e.message === "INSUFFICIENT_CREDITS") return "INSUFFICIENT_CREDITS";
  if (e.status === 429) return /limit/i.test(e.message) ? "vastu.reportErrors.dailyLimit" : "vastu.reportErrors.tooFast";
  if (e.status === 403 && /consent/i.test(e.message)) return "vastu.reportErrors.consent";
  if (e.status === 403) return "vastu.reportErrors.unavailable";
  if (e.status === 400 || e.status === 422) return "vastu.reportErrors.invalidPlan";
  return "vastu.analysis.error";
}
