import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VASTU_RULES, VASTU_RULE_SET, evaluateRoomPlacement, classifyPlacement } from "./rules";

// The server re-scores every paid report with its own copy of this table. Both
// repos test against the same snapshot (backend test/fixtures/, identical
// bytes), so a rule changed on one side fails CI until the other follows.
const snapshot = JSON.parse(
  readFileSync(path.join(__dirname, "__fixtures__/vastu-rules.aroha-traditional-v1.json"), "utf8"),
) as { ruleSetId: string; rules: unknown[] };

describe("rules table", () => {
  it("matches the snapshot shared with the backend", () => {
    expect(VASTU_RULE_SET.id).toBe(snapshot.ruleSetId);
    expect(
      VASTU_RULES.map((r) => ({
        room: r.room,
        idealDirections: r.idealDirections,
        acceptableDirections: r.acceptableDirections,
        avoidDirections: r.avoidDirections,
        weight: r.weight,
      })),
    ).toEqual(snapshot.rules);
  });

  it("scores ideal 100, acceptable 65, neutral 45, avoid 15", () => {
    expect(classifyPlacement("kitchen", "SE")?.score).toBe(100);
    expect(classifyPlacement("kitchen", "NW")?.score).toBe(65);
    expect(classifyPlacement("kitchen", "S")?.score).toBe(45);
    expect(classifyPlacement("kitchen", "NE")?.score).toBe(15);
  });

  it("weights the overall score and counts two rooms of one type separately", () => {
    const one = evaluateRoomPlacement({ bathroom: ["NW"] });
    const two = evaluateRoomPlacement({ bathroom: ["NW", "NE"] });
    expect(one.roomScores).toHaveLength(1);
    expect(two.roomScores).toHaveLength(2);
    expect(two.overallScore).toBeLessThan(one.overallScore);
  });
});
