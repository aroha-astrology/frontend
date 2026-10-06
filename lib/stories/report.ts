import { request } from "@/lib/api";
import type { ShareTarget, StoryId } from "./types";

/**
 * Tells the backend that a story was opened or a share option was tapped, so
 * the admin dashboard can count visitors and shares (POST /v1/stories/events).
 * Fire and forget: a story must never wait on, or fail because of, its own
 * bookkeeping. The backend counts a view once per story per day, so a repeat
 * report is harmless.
 */
export function reportStoryEvent(kind: "view" | "share", storyId: StoryId, channel?: ShareTarget): void {
  const body = kind === "share" ? { kind, storyId, channel } : { kind, storyId };
  void request<{ ok: boolean }>("/v1/stories/events", { method: "POST", body, auth: true }).catch(() => undefined);
}
