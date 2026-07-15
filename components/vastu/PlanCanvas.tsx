"use client";

import { useRef } from "react";
import type { Plan, Room, Wall } from "@/lib/vastu/types";
import type { RoomRating } from "@/lib/vastu/analysis";
import type { PlanAction } from "./planState";
import RoomBlock, { type Corner } from "./RoomBlock";
import CompassRing from "./CompassRing";

interface Pt {
  x: number;
  y: number;
}

type Drag =
  | { kind: "move"; roomId: string; startUnit: Pt; startX: number; startY: number }
  | { kind: "resize"; roomId: string; corner: Corner; fixed: Pt }
  | { kind: "fixture"; roomId: string; fixtureId: string };

/** Nearest wall of a room to a point, plus the position (0..1) along it. */
function nearestWall(room: Room, u: Pt): { wall: Wall; t: number } {
  const dTop = Math.abs(u.y - room.y);
  const dBottom = Math.abs(u.y - (room.y + room.h));
  const dLeft = Math.abs(u.x - room.x);
  const dRight = Math.abs(u.x - (room.x + room.w));
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  if (min === dTop) return { wall: "top", t: clamp01((u.x - room.x) / room.w) };
  if (min === dBottom) return { wall: "bottom", t: clamp01((u.x - room.x) / room.w) };
  if (min === dLeft) return { wall: "left", t: clamp01((u.y - room.y) / room.h) };
  return { wall: "right", t: clamp01((u.y - room.y) / room.h) };
}

export default function PlanCanvas({
  plan,
  ratingById,
  labelForType,
  colorForType,
  selectedId,
  onSelect,
  dispatch,
  locked,
}: {
  plan: Plan;
  ratingById: Record<string, RoomRating>;
  labelForType: (type: string) => string;
  colorForType: (type: string) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  dispatch: React.Dispatch<PlanAction>;
  locked: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const cx = plan.widthU / 2;
  const cy = plan.heightU / 2;
  const ringRadius = Math.hypot(cx, cy) + 1.3;
  const H = ringRadius + 1.1; // half view size (square, centred on the plot)

  function toUnit(e: React.PointerEvent): Pt {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const u = p.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  }

  function capture(e: React.PointerEvent) {
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  const onBodyDown = (e: React.PointerEvent, roomId: string) => {
    e.stopPropagation();
    onSelect(roomId);
    const room = plan.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const u = toUnit(e);
    dragRef.current = { kind: "move", roomId, startUnit: u, startX: room.x, startY: room.y };
    capture(e);
  };

  const onHandleDown = (e: React.PointerEvent, roomId: string, corner: Corner) => {
    e.stopPropagation();
    onSelect(roomId);
    const room = plan.rooms.find((r) => r.id === roomId);
    if (!room) return;
    // The opposite corner stays fixed while the grabbed one follows the pointer.
    const fixed: Pt = {
      x: corner === "tl" || corner === "bl" ? room.x + room.w : room.x,
      y: corner === "tl" || corner === "tr" ? room.y + room.h : room.y,
    };
    dragRef.current = { kind: "resize", roomId, corner, fixed };
    capture(e);
  };

  const onFixtureDown = (e: React.PointerEvent, roomId: string, fixtureId: string) => {
    e.stopPropagation();
    onSelect(roomId);
    dragRef.current = { kind: "fixture", roomId, fixtureId };
    capture(e);
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const u = toUnit(e);
    if (drag.kind === "move") {
      dispatch({
        type: "moveRoom",
        id: drag.roomId,
        x: drag.startX + (u.x - drag.startUnit.x),
        y: drag.startY + (u.y - drag.startUnit.y),
      });
    } else if (drag.kind === "resize") {
      dispatch({
        type: "resizeRoom",
        id: drag.roomId,
        rect: {
          x: Math.min(drag.fixed.x, u.x),
          y: Math.min(drag.fixed.y, u.y),
          w: Math.abs(u.x - drag.fixed.x),
          h: Math.abs(u.y - drag.fixed.y),
        },
      });
    } else if (drag.kind === "fixture") {
      const room = plan.rooms.find((r) => r.id === drag.roomId);
      if (!room) return;
      const { wall, t } = nearestWall(room, u);
      dispatch({ type: "moveFixture", roomId: drag.roomId, fixtureId: drag.fixtureId, wall, t });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  };

  // 3×3 guide lines on the plot.
  const gridLines: React.ReactNode[] = [];
  for (let i = 1; i < 3; i++) {
    const gx = (plan.widthU / 3) * i;
    const gy = (plan.heightU / 3) * i;
    gridLines.push(
      <line key={`v${i}`} x1={gx} y1={0} x2={gx} y2={plan.heightU} stroke="rgba(212,175,55,0.12)" strokeWidth={0.05} />,
      <line key={`h${i}`} x1={0} y1={gy} x2={plan.widthU} y2={gy} stroke="rgba(212,175,55,0.12)" strokeWidth={0.05} />,
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${cx - H} ${cy - H} ${2 * H} ${2 * H}`}
      className="w-full h-auto aspect-square select-none text-foreground"
      style={{ touchAction: "none" }}
      onPointerDown={() => onSelect(null)}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Plot outline + grid */}
      <rect
        x={0}
        y={0}
        width={plan.widthU}
        height={plan.heightU}
        rx={0.4}
        fill="rgba(212,175,55,0.03)"
        stroke="rgba(212,175,55,0.45)"
        strokeWidth={0.12}
      />
      {gridLines}

      {/* Brahmasthan centre */}
      <circle cx={cx} cy={cy} r={0.5} fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth={0.06} strokeDasharray="0.2 0.2" />

      {/* Rooms */}
      {plan.rooms.map((room) => {
        const rating = ratingById[room.id];
        if (!rating) return null;
        return (
          <RoomBlock
            key={room.id}
            room={room}
            color={colorForType(room.type)}
            label={labelForType(room.type)}
            rating={rating}
            selected={room.id === selectedId}
            onBodyDown={onBodyDown}
            onHandleDown={onHandleDown}
            onFixtureDown={onFixtureDown}
          />
        );
      })}

      {/* Compass ring */}
      <CompassRing cx={cx} cy={cy} radius={ringRadius} northOffsetDeg={plan.northOffsetDeg} locked={locked} />
    </svg>
  );
}
