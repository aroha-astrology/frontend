import { describe, expect, it, beforeEach, vi } from "vitest";

// No jsdom dependency in this project (see vitest.config.ts's comment — the
// default "node" environment is deliberate) — a minimal in-memory stub is
// enough for a module that only touches localStorage.getItem/setItem.
function makeLocalStorageStub(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

vi.stubGlobal("window", { localStorage: makeLocalStorageStub() });

const { recordGoodChatReply, markReportGeneratedForReview, feedbackAskDue } = await import("./app-review");

const KEY = "aroha:goodChatReplies:v1";
const ASK_AFTER_KEY = "aroha:feedbackAskAfter:v1";

describe("recordGoodChatReply", () => {
  beforeEach(() => {
    (window as unknown as { localStorage: Storage }).localStorage.clear();
  });

  it("starts at 1 on the very first call", () => {
    expect(recordGoodChatReply()).toBe(1);
  });

  it("accumulates across separate calls, simulating separate visits/days", () => {
    // The whole point of persisting to localStorage instead of a React ref:
    // a fresh page load must not lose progress toward the milestone.
    expect(recordGoodChatReply()).toBe(1);
    expect(recordGoodChatReply()).toBe(2);
    expect(recordGoodChatReply()).toBe(3);
  });

  it("reaches exactly 5 on the 5th good reply, ever", () => {
    for (let i = 0; i < 4; i++) recordGoodChatReply();
    expect(recordGoodChatReply()).toBe(5);
  });

  it("keeps counting past 5 without re-equaling 5 — the caller's === 5 check fires only once", () => {
    for (let i = 0; i < 5; i++) recordGoodChatReply();
    expect(recordGoodChatReply()).toBe(6);
    expect(recordGoodChatReply()).toBe(7);
  });

  it("persists the count in localStorage under a stable key", () => {
    recordGoodChatReply();
    recordGoodChatReply();
    expect(window.localStorage.getItem(KEY)).toBe("2");
  });

  it("resumes from whatever count was already stored, not from zero", () => {
    window.localStorage.setItem(KEY, "3");
    expect(recordGoodChatReply()).toBe(4);
  });
});

describe("feedbackAskDue", () => {
  beforeEach(() => {
    (window as unknown as { localStorage: Storage }).localStorage.clear();
    vi.useRealTimers();
  });

  it("stays false for a user who has done neither", () => {
    expect(feedbackAskDue()).toBe(false);
  });

  it("is false at 2 chat replies and true at the 3rd", () => {
    recordGoodChatReply();
    recordGoodChatReply();
    expect(feedbackAskDue()).toBe(false);
    recordGoodChatReply();
    expect(feedbackAskDue()).toBe(true);
  });

  it("stays false right after a report — the user is still reading it", () => {
    markReportGeneratedForReview();
    expect(feedbackAskDue()).toBe(false);
  });

  it("turns true once the reading window has passed", () => {
    vi.useFakeTimers();
    markReportGeneratedForReview();
    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(feedbackAskDue()).toBe(true);
  });

  it("does not let a second report push the ask further out", () => {
    vi.useFakeTimers();
    markReportGeneratedForReview();
    const first = window.localStorage.getItem(ASK_AFTER_KEY);
    vi.advanceTimersByTime(2 * 60 * 1000);
    markReportGeneratedForReview();
    expect(window.localStorage.getItem(ASK_AFTER_KEY)).toBe(first);
  });
});
