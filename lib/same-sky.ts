/**
 * Same Sky rooms (switch community.sameSky): short posts in a room for readers who share a Moon sign.
 * Every post is checked before it shows, can be reported, and its author can be blocked.
 */

export type PostState = "PENDING" | "APPROVED" | "REJECTED" | "REMOVED";

export interface SkyPost {
  id: string;
  /** "Reader 4F2A": stable in a room, reveals nothing. */
  handle: string;
  mine: boolean;
  body: string;
  /** Only the author sees a state other than published. */
  status: PostState | null;
  createdAt: string;
}

export interface SkyRoom {
  room: string | null;
  posts: SkyPost[];
  postsLeftToday: number;
}

export interface CreatedPost {
  post: SkyPost;
  outcome: PostState;
  reason: string;
}

export const MAX_POST_CHARS = 280;
export const REPORT_REASONS = ["harassment", "hate", "sexual", "spam", "personal-info", "harmful", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** The sign name as the room key ("taurus") capitalised for the i18n sign names. */
export function signOfRoom(room: string): string {
  return room.charAt(0).toUpperCase() + room.slice(1);
}

export type SkyProblem = "NO_ROOM" | "SKY_DAILY_LIMIT" | "OWN_POST";

export function skyProblemOf(message: string | undefined): SkyProblem | null {
  return message === "NO_ROOM" || message === "SKY_DAILY_LIMIT" || message === "OWN_POST" ? message : null;
}

export interface AdminSkyItem {
  id: string;
  room: string;
  handle: string;
  body: string;
  status: PostState;
  checkReason: string | null;
  reportCount: number;
  reasons: string[];
  createdAt: string;
}
