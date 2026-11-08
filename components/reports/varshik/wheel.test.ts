import { describe, expect, it } from "vitest";
import { sampleFacts } from "./fixture";
import { NAKSHATRA_ORDER } from "./star-order";
import { wheelSlots } from "./facts-helpers";
import type { VarshikFacts } from "./types";

const stars = (sampleFacts as unknown as VarshikFacts).stars!;

describe("the Navatara wheel agrees with the engine's own special taras", () => {
  it("puts every special star the engine found on a planet at the same slot", () => {
    const slots = wheelSlots(stars.birthStar.number);
    for (const row of stars.table) {
      if (!row.special) continue;
      const star = (NAKSHATRA_ORDER as readonly string[]).indexOf(row.nakshatra) + 1;
      const offset = (star - stars.birthStar.number + 27) % 27;
      expect(slots[offset]!.special, `${row.point} in ${row.nakshatra}`).toBe(row.special.number);
    }
  });

  it("gives every slot the tara the engine gives a planet standing there", () => {
    const slots = wheelSlots(stars.birthStar.number);
    for (const row of stars.table) {
      const star = (NAKSHATRA_ORDER as readonly string[]).indexOf(row.nakshatra) + 1;
      expect(slots[(star - stars.birthStar.number + 27) % 27]!.tara, row.nakshatra).toBe(row.tara.number);
    }
    for (const seg of stars.segments) {
      const star = (NAKSHATRA_ORDER as readonly string[]).indexOf(seg.nakshatra) + 1;
      const s = slots[(star - stars.birthStar.number + 27) % 27]!;
      expect(s.tara, `${seg.planet} ${seg.nakshatra}`).toBe(seg.tara.number);
      expect(s.special ?? null, `${seg.planet} ${seg.nakshatra} special`).toBe(seg.special?.number ?? null);
    }
  });

  it("marks at most nine sensitive stars and never the birth star twice", () => {
    for (let b = 1; b <= 27; b++) {
      const marked = wheelSlots(b).filter((s) => s.special);
      expect(marked.length).toBeLessThanOrEqual(9);
      expect(marked.length).toBeGreaterThanOrEqual(8);
      expect(wheelSlots(b)[0]!.special).toBe(1);
    }
  });
});
