/**
 * Ledger reasons for the one-time permission rewards, mirroring the backend's
 * config/permission-rewards.ts. They arrive on `user.claimedCampaigns`, which
 * is the single source of truth for whether a reward has been paid — checking
 * the OS permission instead would be wrong, since a user can hold the
 * permission from before these rewards existed.
 */
export const NOTIFICATIONS_REWARD_REASON = "notifications_enabled_reward";
export const LOCATION_REWARD_REASON = "location_enabled_reward";

/** Fallbacks matching the backend's `defaultPricePaise`, used only for display. */
export const PERMISSION_REWARD_FALLBACK_PAISE = 2500;
