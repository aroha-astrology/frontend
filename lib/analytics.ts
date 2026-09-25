import posthog from "posthog-js";

/**
 * Product events we read funnels from. One list so an event name is never
 * typo'd at a call site and a new event is a deliberate addition here.
 */
export type AnalyticsEvent =
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "welcome_reward_claimed"
  | "daily_reward_claimed"
  | "topup_started"
  | "topup_succeeded"
  | "report_purchase_started"
  | "report_purchased"
  | "chat_message_sent"
  | "referral_share_clicked"
  | "push_opened"
  | "push_received_foreground"
  | "notification_settings_changed"
  // Vastu Studio (spec §62): does the studio get understood, used and trusted?
  | "vastu_open"
  | "vastu_plan_created"
  | "vastu_room_added"
  | "vastu_fixture_added"
  | "vastu_north_aligned"
  | "vastu_lens_opened"
  | "vastu_issue_opened"
  | "vastu_show_me"
  | "vastu_fix_preview"
  | "vastu_fix_applied"
  | "vastu_fixplan_opened"
  | "vastu_fixplan_applied"
  | "vastu_3d_opened"
  | "vastu_score_viewed"
  | "vastu_report_cta"
  | "vastu_report_started"
  | "vastu_report_done"
  | "vastu_report_error"
  | "vastu_history_opened"
  | "vastu_version_restored"
  | "vastu_upload_started"
  | "vastu_followup_asked";

/**
 * Fire-and-forget PostHog capture. The `__loaded` guard matters: PostHog is
 * never initialised when the user declined analytics consent
 * (providers/posthog-provider.tsx), and capture() before init would queue
 * events that later flush without consent. Never throws — analytics must not
 * break the flow it measures.
 */
export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null | undefined>): void {
  try {
    if (typeof window !== "undefined" && posthog.__loaded) posthog.capture(event, props);
  } catch {
    // ignore
  }
}
