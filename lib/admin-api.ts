// Typed client for the backend's /v1/admin/* surface — revenue analytics,
// the feature-flag kill-switch board, user wallet management, and user-group
// management. Every admin endpoint requires `Authorization: Bearer
// <firebase-id-token>` from an allowlisted admin phone (403 otherwise); a 403
// here is treated by app/admin/layout.tsx as "not an admin", not a generic
// error.
//
// Reuses `request<T>()` from lib/api.ts directly rather than duplicating the
// fetch/auth/error-parsing logic — see that file's `request` export.

import { request } from "./api";
import { buildAdminRangeQuery, type AdminDateRangePreset, type AdminFeatureGroupKey } from "./admin-format";

export type { AdminDateRangePreset, AdminFeatureGroupKey };

// ─── Overview ──────────────────────────────────────────────────────────────

export interface AdminOverviewTimeSeriesPoint {
  bucketStart: string;
  totalPaise: number;
  count: number;
}

export interface AdminSpendByFeatureRow {
  reasonPrefix: string;
  totalPaise: number;
  count: number;
}

export interface AdminTopUpFunnelRow {
  status: string;
  count: number;
}

export interface AdminLlmCostByAgentRow {
  agent: string;
  tokensIn: number;
  tokensOut: number;
  calls: number;
  /** The billed subset — free-tier calls cost ₹0 regardless of token count. */
  paidTokensIn: number;
  paidTokensOut: number;
  paidCalls: number;
}

export interface AdminOverview {
  range: { from: string; to: string };
  cashInPaise: number;
  orderCount: number;
  walletSpendPaise: number;
  walletLiabilityPaise: number;
  payingUsers: number;
  arpuPaise: number;
  newUsers: number;
  activeUsers: number;
  timeSeries: AdminOverviewTimeSeriesPoint[];
  spendByFeature: AdminSpendByFeatureRow[];
  topUpFunnel: AdminTopUpFunnelRow[];
  llmCostByAgent: AdminLlmCostByAgentRow[];
}

// ─── Features ──────────────────────────────────────────────────────────────

export interface AdminFeatureRow {
  key: string;
  label: string;
  group: AdminFeatureGroupKey;
  enabled: boolean;
  pricePaise: number | null;
  /** "Strikethrough" MRP shown on the customer report catalogue when higher than pricePaise. Null = no discount configured. */
  originalPricePaise: number | null;
}

export interface UpdateAdminFeatureBody {
  key: string;
  enabled: boolean;
  pricePaise?: number | null;
  originalPricePaise?: number | null;
}

// ─── Users ─────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  walletBalancePaise: number;
  createdAt: string;
  lastActiveAt: string | null;
  /** Has this user claimed the Independence Day 2026 wallet bonus (independence_day_2026 campaign)? */
  claimedIndependenceDay: boolean;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface AdminWalletAdjustBody {
  /** Non-zero; positive grants, negative deducts. */
  deltaPaise: number;
  /** 1-500 chars — required audit note for the adjustment. */
  note: string;
}

export interface AdminWalletAdjustResponse {
  walletBalancePaise: number;
}

// ─── Support tickets ───────────────────────────────────────────────────────

/** Admin-facing shape — unlike the caller-facing `SupportTicket` in lib/api.ts, includes `userId` and `adminNote`. */
export interface AdminSupportTicket {
  id: string;
  userId: string;
  category: string;
  message: string;
  locale: string | null;
  appVersion: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AdminSupportTicketsResponse {
  tickets: AdminSupportTicket[];
  total: number;
  offset: number;
  limit: number;
}

// ─── Reports ───────────────────────────────────────────────────────────────

export interface AdminReportRow {
  reportKey: string;
  totalPaise: number;
  count: number;
}

// ─── Groups ────────────────────────────────────────────────────────────────

export interface AdminGroupRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  memberCount: number;
}

export interface CreateAdminGroupBody {
  name: string;
  description?: string | null;
}

export interface AdminGroupMemberRow {
  userId: string;
  displayName: string | null;
  phoneE164: string | null;
  addedAt: string;
}

/** `'inherit'` = no override for this group (falls through to the global switch); `true`/`false` = an explicit per-group override. */
export type AdminGroupFeatureState = "inherit" | true | false;

export interface AdminGroupFeatureRow {
  key: string;
  label: string;
  group: AdminFeatureGroupKey;
  state: AdminGroupFeatureState;
}

export interface UpdateAdminGroupFeatureBody {
  key: string;
  /** `null` clears the override back to 'inherit'. */
  enabled: boolean | null;
}

// ─── Referrals ─────────────────────────────────────────────────────────────

export interface AdminReferredUser {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  createdAt: string;
}

export interface AdminReferralRow {
  referrer: { id: string; displayName: string | null; phoneE164: string | null };
  count: number;
  referredUsers: AdminReferredUser[];
}

export interface AdminReferralsResponse {
  referrals: AdminReferralRow[];
}

// ─── Recurring users ───────────────────────────────────────────────────────

export interface AdminRecurringUsersWeek {
  label: "this_week" | "last_week" | "last_week_plus_1" | "last_week_plus_2";
  from: string;
  to: string;
  activeUsers: number;
  recurringUsers: number;
  timeSpentHours: number;
}

export interface AdminRecurringUsersResponse {
  weeks: AdminRecurringUsersWeek[];
}



// ─── Deletion requests ─────────────────────────────────────────────────────

export interface AdminDeletionRequestRow {
  id: string;
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
  deletionRequestedAt: string;
}

export interface AdminDeletionRequestsResponse {
  requests: AdminDeletionRequestRow[];
}

export interface AdminDeletionActionResponse {
  id: string;
  deletionRequestedAt: string | null;
}

// ─── Client ────────────────────────────────────────────────────────────────

export interface AdminDateRangeParams {
  preset: AdminDateRangePreset;
  /** YYYY-MM-DD — required only when preset === 'custom'. */
  from?: string;
  /** YYYY-MM-DD — required only when preset === 'custom'. */
  to?: string;
}

export const adminApi = {
  /** Revenue/usage analytics for a date range. */
  overview: (params: AdminDateRangeParams & { userId?: string }) =>
    request<AdminOverview>(
      `/v1/admin/overview?${buildAdminRangeQuery(params.preset, params.from, params.to)}` +
        // Narrows the LLM cost breakdown only — the revenue and funnel figures
        // in the same response stay business-wide.
        (params.userId ? `&userId=${encodeURIComponent(params.userId)}` : ""),
      { auth: true },
    ),

  /** Per-report-type revenue breakdown for a date range. */
  reports: (params: AdminDateRangeParams) =>
    request<{ reports: AdminReportRow[] }>(
      `/v1/admin/reports?${buildAdminRangeQuery(params.preset, params.from, params.to)}`,
      { auth: true },
    ),

  /** Every admin-controlled feature toggle, across all 4 groups (nav/home/paid/reports). */
  listFeatures: () => request<{ features: AdminFeatureRow[] }>("/v1/admin/features", { auth: true }),

  /** Flip a feature's global enabled state and/or its price. Throws ApiError(400) if `key` is unknown. */
  updateFeature: (body: UpdateAdminFeatureBody) =>
    request<AdminFeatureRow>("/v1/admin/features", { method: "PUT", body, auth: true }),

  /**
   * Searches/paginates users. Also the single user-search primitive reused
   * by the group member-add control — don't build a second search.
   */
  listUsers: (
    params: {
      q?: string;
      contactType?: "all" | "phone" | "email";
      offset?: number;
      limit?: number;
      sortBy?: "createdAt" | "lastActiveAt" | "walletBalancePaise" | "claimedIndependenceDay";
      sortDir?: "asc" | "desc";
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.contactType && params.contactType !== "all") qs.set("contactType", params.contactType);
    qs.set("offset", String(params.offset ?? 0));
    qs.set("limit", String(params.limit ?? 20));
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortDir) qs.set("sortDir", params.sortDir);
    return request<AdminUsersResponse>(`/v1/admin/users?${qs.toString()}`, { auth: true });
  },

  /** Grant (positive deltaPaise) or deduct (negative) from a user's wallet, with a required audit note. */
  adjustWallet: (userId: string, body: AdminWalletAdjustBody) =>
    request<AdminWalletAdjustResponse>(`/v1/admin/users/${userId}/wallet`, {
      method: "POST",
      body,
      auth: true,
    }),

  /** All user groups. */
  listGroups: () => request<{ groups: AdminGroupRow[] }>("/v1/admin/groups", { auth: true }),

  /** Create a group. Throws ApiError(400) on a case-insensitive duplicate name. */
  createGroup: (body: CreateAdminGroupBody) =>
    request<AdminGroupRow>("/v1/admin/groups", { method: "POST", body, auth: true }),

  /** Deletes a group and cascades — removes all its members and feature overrides too. */
  deleteGroup: (id: string) => request<void>(`/v1/admin/groups/${id}`, { method: "DELETE", auth: true }),

  /** Members of one group. */
  listGroupMembers: (id: string) =>
    request<{ members: AdminGroupMemberRow[] }>(`/v1/admin/groups/${id}/members`, { auth: true }),

  /** Adds a user to a group. Idempotent — safe to call for an already-added user. */
  addGroupMember: (id: string, userId: string) =>
    request<unknown>(`/v1/admin/groups/${id}/members`, { method: "POST", body: { userId }, auth: true }),

  /** Removes a user from a group. */
  removeGroupMember: (id: string, userId: string) =>
    request<void>(`/v1/admin/groups/${id}/members/${userId}`, { method: "DELETE", auth: true }),

  /** This group's per-feature override state — 'inherit' unless explicitly overridden for this group. */
  listGroupFeatures: (id: string) =>
    request<{ features: AdminGroupFeatureRow[] }>(`/v1/admin/groups/${id}/features`, { auth: true }),

  /** Sets (enabled: true/false) or clears (enabled: null) this group's override for one feature. */
  updateGroupFeature: (id: string, body: UpdateAdminGroupFeatureBody) =>
    request<AdminGroupFeatureRow>(`/v1/admin/groups/${id}/features`, { method: "PUT", body, auth: true }),

  /** Searches/paginates support tickets, optionally filtered by user and/or status. */
  listSupportTickets: (params: { userId?: string; status?: string; offset?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.userId) qs.set("userId", params.userId);
    if (params.status) qs.set("status", params.status);
    qs.set("offset", String(params.offset ?? 0));
    qs.set("limit", String(params.limit ?? 20));
    return request<AdminSupportTicketsResponse>(`/v1/admin/support/tickets?${qs.toString()}`, { auth: true });
  },

  /** Updates a ticket's status and/or adminNote (at least one required). Backend auto-stamps/clears resolvedAt on terminal-status transitions. */
  updateSupportTicket: (id: string, body: { status?: string; adminNote?: string }) =>
    request<AdminSupportTicket>(`/v1/admin/support/tickets/${id}`, { method: "PATCH", body, auth: true }),

  /** All referral relationships — who referred whom, grouped by referrer, sorted by count desc. */
  listReferrals: () => request<AdminReferralsResponse>("/v1/admin/referrals", { auth: true }),

  /** Recurring-user counts + approximate time spent for this week, last week, last week+1, last week+2. */
  recurringUsers: () => request<AdminRecurringUsersResponse>("/v1/admin/recurring-users", { auth: true }),

  /** Pending account-deletion requests, oldest first. No pagination — same precedent as listReferrals. */
  listDeletionRequests: () =>
    request<AdminDeletionRequestsResponse>("/v1/admin/deletion-requests", { auth: true }),

  /** Manually flag a user for deletion (e.g. they called in rather than tapping Delete Account). Idempotent. */
  flagForDeletion: (userId: string) =>
    request<AdminDeletionActionResponse>(`/v1/admin/deletion-requests/${userId}`, {
      method: "POST",
      auth: true,
    }),

  /** Dismiss a pending request — the account stays exactly as it was. */
  rejectDeletionRequest: (userId: string) =>
    request<AdminDeletionActionResponse>(`/v1/admin/deletion-requests/${userId}/reject`, {
      method: "PATCH",
      auth: true,
    }),

  /** Irreversible hard delete — no shell row survives. */
  hardDeleteUser: (userId: string) =>
    request<{ id: string }>(`/v1/admin/deletion-requests/${userId}`, { method: "DELETE", auth: true }),
};

