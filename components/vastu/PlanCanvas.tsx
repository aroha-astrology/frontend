"use client";

import { useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { Plan, Room, Wall } from "@/lib/vastu/types";
import type { RoomRating } from "@/lib/vastu/analysis";
import { plotOutlinePath, planCenter, maxVertexDist, bbox } from "@/lib/vastu/geometry";
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
  | { kind: "fixture"; roomId: string; fixtureId: string }
  | { kind: "vertex"; index: number }
  | { kind: "pan"; startClient: Pt; startPan: Pt; unitPerPx: number; moved: boolean };

const MAX_ZOOM = 3;

function nearestWall(room: Room, u: Pt): { wall: Wall; t: number } {
  const dTop = Math.abs(u.y - room.y);
  const dBottom = Math.abs(u.y - (room.y + room.h));
  const dLeft = Math.abs(u.x - room.x);
  const dRight = Math.abs(u.x - (room.x + room.w));
  const min = Math.min(dTop, dBottom, dLeft, dRight);
  const c01 = (v: number) => Math.min(1, Math.max(0, v));
  if (min === dTop) return { wall: "top", t: c01((u.x - room.x) / room.w) };
  if (min === dBottom) return { wall: "bottom", t: c01((u.x - room.x) / room.w) };
  if (min === dLeft) return { wall: "left", t: c01((u.y - room.y) / room.h) };
  return { wall: "right", t: c01((u.y - room.y) / room.h) };
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const [selVertex, setSelVertex] = useState<number | null>(null);

  const center = planCenter(plan);
  const ringRadius = maxVertexDist(plan) + 1.5;
  const H = ringRadius + 1.1;
  const viewSize = (2 * H) / zoom;
  const bb = bbox(plan.plot);

  const minX = center.x - viewSize / 2 + pan.x;
  const minY = center.y - viewSize / 2 + pan.y;

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
  const capture = (e: React.PointerEvent) => svgRef.current?.setPointerCapture(e.pointerId);

  const onBodyDown = (e: React.PointerEvent, roomId: string) => {
    e.stopPropagation();
    onSelect(roomId);
    setSelVertex(null);
    const room = plan.rooms.find((r) => r.id === roomId);
    if (!room) return;
    dragRef.current = { kind: "move", roomId, startUnit: toUnit(e), startX: room.x, startY: room.y };
    capture(e);
  };
  const onHandleDown = (e: React.PointerEvent, roomId: string, corner: Corner) => {
    e.stopPropagation();
    onSelect(roomId);
    const room = plan.rooms.find((r) => r.id === roomId);
    if (!room) return;
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
  const onVertexDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    setSelVertex(index);
    onSelect(null);
    dragRef.current = { kind: "vertex", index };
    capture(e);
  };
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      const rect = svgRef.current?.getBoundingClientRect();
      const unitPerPx = rect ? viewSize / rect.width : 1;
      dragRef.current = { kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startPan: pan, unitPerPx, moved: false };
      capture(e);
    } else {
      onSelect(null);
      setSelVertex(null);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "pan") {
      const dxPx = e.clientX - drag.startClient.x;
      const dyPx = e.clientY - drag.startClient.y;
      if (Math.abs(dxPx) + Math.abs(dyPx) > 3) drag.moved = true;
      const lim = H;
      setPan({
        x: Math.max(-lim, Math.min(lim, drag.startPan.x - dxPx * drag.unitPerPx)),
        y: Math.max(-lim, Math.min(lim, drag.startPan.y - dyPx * drag.unitPerPx)),
      });
      return;
    }
    const u = toUnit(e);
    if (drag.kind === "move") {
      dispatch({ type: "moveRoom", id: drag.roomId, x: drag.startX + (u.x - drag.startUnit.x), y: drag.startY + (u.y - drag.startUnit.y) });
    } else if (drag.kind === "resize") {
      dispatch({ type: "resizeRoom", id: drag.roomId, rect: { x: Math.min(drag.fixed.x, u.x), y: Math.min(drag.fixed.y, u.y), w: Math.abs(u.x - drag.fixed.x), h: Math.abs(u.y - drag.fixed.y) } });
    } else if (drag.kind === "fixture") {
      const room = plan.rooms.find((r) => r.id === drag.roomId);
      if (!room) return;
      const { wall, t } = nearestWall(room, u);
      dispatch({ type: "moveFixture", roomId: drag.roomId, fixtureId: drag.fixtureId, wall, t });
    } else if (drag.kind === "vertex") {
      dispatch({ type: "moveVertex", index: drag.index, x: u.x, y: u.y });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      if (drag.kind === "pan" && !drag.moved) {
        onSelect(null);
        setSelVertex(null);
      }
      svgRef.current?.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  };

  // 3×3 guide lines across the plot bbox.
  const gridLines: React.ReactNode[] = [];
  for (let i = 1; i < 3; i++) {
    const gx = bb.minX + (bb.w / 3) * i;
    const gy = bb.minY + (bb.h / 3) * i;
    gridLines.push(
      <line key={`v${i}`} x1={gx} y1={bb.minY} x2={gx} y2={bb.maxY} stroke="rgba(212,175,55,0.12)" strokeWidth={0.05} />,
      <line key={`h${i}`} x1={bb.minX} y1={gy} x2={bb.maxX} y2={gy} stroke="rgba(212,175,55,0.12)" strokeWidth={0.05} />,
    );
  }

  const canDeleteVertex = plan.plot.length > 3;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${viewSize} ${viewSize}`}
        className="w-full h-auto aspect-square select-none text-foreground"
        style={{ touchAction: "none" }}
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Plot outline polygon */}
        <path d={plotOutlinePath(plan)} fill="rgba(212,175,55,0.03)" stroke="rgba(212,175,55,0.5)" strokeWidth={0.13} strokeLinejoin="round" />
        {gridLines}

        {/* Brahmasthan centre */}
        <circle cx={center.x} cy={center.y} r={0.5} fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth={0.06} strokeDasharray="0.2 0.2" />

        {/* Rooms */}
        {plan.rooms.map((room) => {
          const rating = ratingById[room.id];
          if (!rating) return null;
          return (
            <RoomBlock key={room.id} room={room} color={colorForType(room.type)} label={labelForType(room.type)} rating={rating} selected={room.id === selectedId} onBodyDown={onBodyDown} onHandleDown={onHandleDown} onFixtureDown={onFixtureDown} />
          );
        })}

        {/* Editable plot vertices (drag a corner to reshape) */}
        {plan.plot.map((v, i) => {
          const isSel = selVertex === i;
          return (
            <g key={i}>
              <circle cx={v.x} cy={v.y} r={isSel ? 0.5 : 0.38} fill="var(--card)" stroke="#D4AF37" strokeWidth={isSel ? 0.16 : 0.1} onPointerDown={(e) => onVertexDown(e, i)} style={{ cursor: "grab", touchAction: "none" }} />
              {isSel && canDeleteVertex && (
                <g
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "deleteVertex", index: i });
                    setSelVertex(null);
                  }}
                  style={{ cursor: "pointer", touchAction: "none" }}
                >
                  <circle cx={v.x + 0.95} cy={v.y - 0.95} r={0.55} fill="#ef4444" />
                  <line x1={v.x + 0.72} y1={v.y - 0.95} x2={v.x + 1.18} y2={v.y - 0.95} stroke="#fff" strokeWidth={0.13} strokeLinecap="round" />
                </g>
              )}
            </g>
          );
        })}

        <CompassRing cx={center.x} cy={center.y} radius={ringRadius} northOffsetDeg={plan.northOffsetDeg} locked={locked} />
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.5).toFixed(1)))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" className="w-9 h-9 rounded-full bg-card/85 border border-gold/25 text-gold flex items-center justify-center backdrop-blur disabled:opacity-40">
          <Plus size={16} />
        </button>
        <button onClick={() => { const nz = Math.max(1, +(zoom - 0.5).toFixed(1)); setZoom(nz); if (nz === 1) setPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} aria-label="Zoom out" className="w-9 h-9 rounded-full bg-card/85 border border-gold/25 text-gold flex items-center justify-center backdrop-blur disabled:opacity-40">
          <Minus size={16} />
        </button>
      </div>
    </div>
  );
}
