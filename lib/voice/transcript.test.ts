import { describe, it, expect } from "vitest";
import { TranscriptBuffer } from "./transcript";

describe("TranscriptBuffer", () => {
  it("joins consecutive same-role fragments into one turn", () => {
    const buf = new TranscriptBuffer();
    buf.append("What does ", "user");
    buf.append("my chart say", "user");
    expect(buf.getTurns()).toEqual([{ role: "user", content: "What does my chart say" }]);
  });

  it("flushes a turn when the role flips, mapping model -> assistant", () => {
    const buf = new TranscriptBuffer();
    buf.append("hello", "user");
    buf.append("hi there", "model");
    expect(buf.getTurns()).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ]);
  });

  it("handles several role flips across a whole call", () => {
    const buf = new TranscriptBuffer();
    buf.append("q1", "user");
    buf.append("a1", "model");
    buf.append("q2", "user");
    buf.append("a2", "model");
    expect(buf.getTurns()).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "q2" },
      { role: "assistant", content: "a2" },
    ]);
  });

  it("flushes the in-progress turn on getTurns even with no role flip yet", () => {
    const buf = new TranscriptBuffer();
    buf.append("still talking", "user");
    expect(buf.getTurns()).toEqual([{ role: "user", content: "still talking" }]);
  });

  it("drops a turn that is empty or whitespace-only after trim", () => {
    const buf = new TranscriptBuffer();
    buf.append("   ", "user");
    buf.append("real content", "model");
    expect(buf.getTurns()).toEqual([{ role: "assistant", content: "real content" }]);
  });

  it("is safe to call getTurns repeatedly", () => {
    const buf = new TranscriptBuffer();
    buf.append("hi", "user");
    expect(buf.getTurns()).toEqual([{ role: "user", content: "hi" }]);
    expect(buf.getTurns()).toEqual([{ role: "user", content: "hi" }]);
  });

  it("caps a single turn's content at 8000 chars", () => {
    const buf = new TranscriptBuffer();
    buf.append("x".repeat(9000), "user");
    expect(buf.getTurns()[0]?.content.length).toBe(8000);
  });

  it("caps total turns at 60, keeping the most recent", () => {
    const buf = new TranscriptBuffer();
    for (let i = 0; i < 70; i++) {
      buf.append(`turn${i}`, i % 2 === 0 ? "user" : "model");
    }
    const turns = buf.getTurns();
    expect(turns).toHaveLength(60);
    expect(turns[0]?.content).toBe("turn10");
    expect(turns[59]?.content).toBe("turn69");
  });

  it("returns an empty array when nothing was ever appended", () => {
    expect(new TranscriptBuffer().getTurns()).toEqual([]);
  });
});
