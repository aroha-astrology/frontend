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
  | "notification_settings_changed";

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
