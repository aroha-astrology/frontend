// Starter layouts for a new home. Simple geometry to edit from — not
// architectural plans. Room ids are regenerated on every use.

import type { Fixture, Plan, Pt, Room } from "./types";

export type TemplateId = "blank" | "1bhk" | "2bhk" | "3bhk";

const sq = (s: number): Pt[] => [
  { x: 0, y: 0 },
  { x: s, y: 0 },
  { x: s, y: s },
  { x: 0, y: s },
];

type Spec = [type: string, x: number, y: number, w: number, h: number, fixtures?: Omit<Fixture, "id">[]];

const SPECS: Record<TemplateId, { span: number; rooms: Spec[] }> = {
  blank: { span: 12, rooms: [] },
  "1bhk": {
    span: 12,
    rooms: [
      ["living", 3, 0, 6, 4, [{ kind: "door", wall: "top", t: 0.5 }]],
      ["bathroom", 0, 0, 3, 3],
      ["puja_room", 9.5, 0, 2.5, 2.5],
      ["master_bed", 0, 7, 5, 5, [{ kind: "window", wall: "left", t: 0.5 }]],
      ["kitchen", 8, 8, 4, 4, [{ kind: "window", wall: "right", t: 0.5 }]],
    ],
  },
  "2bhk": {
    span: 12,
    rooms: [
      ["living", 3, 0, 6, 4, [{ kind: "door", wall: "top", t: 0.5 }]],
      ["bathroom", 0, 0, 3, 3],
      ["puja_room", 9.5, 0, 2.5, 2.5],
      ["bed_2", 0, 4, 3, 3],
      ["dining", 9, 4, 3, 3],
      ["master_bed", 0, 7, 5, 5, [{ kind: "window", wall: "left", t: 0.5 }]],
      ["kitchen", 8, 8, 4, 4, [{ kind: "window", wall: "right", t: 0.5 }]],
    ],
  },
  "3bhk": {
    span: 14,
    rooms: [
      ["living", 4, 0, 6, 4, [{ kind: "door", wall: "top", t: 0.5 }]],
      ["bathroom", 0, 0, 3, 3],
      ["puja_room", 11, 0, 3, 3],
      ["kids_room", 3.5, 4.5, 3, 3],
      ["bed_2", 0, 5, 3.5, 3.5],
      ["dining", 10.5, 5, 3.5, 3.5],
      ["master_bed", 0, 10, 4.5, 4, [{ kind: "window", wall: "left", t: 0.5 }]],
      ["store", 5, 11, 3, 3],
      ["kitchen", 10, 10, 4, 4, [{ kind: "window", wall: "right", t: 0.5 }]],
    ],
  },
};

export const TEMPLATE_IDS: TemplateId[] = ["blank", "1bhk", "2bhk", "3bhk"];

export function templatePlan(id: TemplateId, makeId: () => string): Plan {
  const spec = SPECS[id];
  const rooms: Room[] = spec.rooms.map(([type, x, y, w, h, fixtures = []]) => ({
    id: makeId(),
    type,
    x,
    y,
    w,
    h,
    fixtures: fixtures.map((f) => ({ ...f, id: makeId() })),
  }));
  return { plot: sq(spec.span), northOffsetDeg: 0, rooms };
}
