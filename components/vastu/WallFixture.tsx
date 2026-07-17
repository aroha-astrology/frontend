"use client";

import type { Room, Fixture } from "@/lib/vastu/types";
import { fixturePoint } from "@/lib/vastu/geometry";

/**
 * A door or window drawn on a room wall (SVG, unit coordinates). Doors are gold
 * with an outward opening arc; windows are cyan. Draggable via onDown — the
 * parent recomputes the nearest wall + position.
 */
export default function WallFixture({
  room,
  fixture,
  onDown,
}: {
  room: Room;
  fixture: Fixture;
  onDown: (e: React.PointerEvent, roomId: string, fixtureId: string) => void;
}) {
  const p = fixturePoint(room, fixture.wall, fixture.t);
  const horizontal = fixture.wall === "top" || fixture.wall === "bottom";
  const len = 1.1;
  const thick = 0.34;
  const isDoor = fixture.kind === "door";
  const color = isDoor ? "#D4AF37" : "#22d3ee";

  // Opening rectangle straddling the wall line.
  const rect = horizontal
    ? { x: p.x - len / 2, y: p.y - thick / 2, w: len, h: thick }
    : { x: p.x - thick / 2, y: p.y - len / 2, w: thick, h: len };

  // Outward tick showing which way the fixture faces.
  const out = 0.7;
  const tick =
    fixture.wall === "top"
      ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y - out }
      : fixture.wall === "bottom"
        ? { x1: p.x, y1: p.y, x2: p.x, y2: p.y + out }
        : fixture.wall === "left"
          ? { x1: p.x, y1: p.y, x2: p.x - out, y2: p.y }
          : { x1: p.x, y1: p.y, x2: p.x + out, y2: p.y };

  return (
    <g
      onPointerDown={(e) => onDown(e, room.id, fixture.id)}
      style={{ cursor: "grab", touchAction: "none" }}
    >
      {/* fat invisible hit area for touch */}
      <rect
        x={rect.x - 0.3}
        y={rect.y - 0.3}
        width={rect.w + 0.6}
        height={rect.h + 0.6}
        fill="transparent"
      />
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={0.08} fill={color} opacity={0.9} />
      <line
        x1={tick.x1}
        y1={tick.y1}
        x2={tick.x2}
        y2={tick.y2}
        stroke={color}
        strokeWidth={0.12}
        strokeDasharray={isDoor ? undefined : "0.25 0.2"}
        strokeLinecap="round"
      />
    </g>
  );
}
