"use client";

import type { Room } from "@/lib/vastu/types";
import type { RoomRating } from "@/lib/vastu/analysis";
import WallFixture from "./WallFixture";

export type Corner = "tl" | "tr" | "br" | "bl";

/**
 * A single room block on the SVG canvas (unit coordinates). Body drag + corner
 * resize handles + attached door/window fixtures. Presentational — all pointer
 * logic lives in PlanCanvas via the passed-down handlers.
 */
export default function RoomBlock({
  room,
  color,
  label,
  rating,
  selected,
  onBodyDown,
  onHandleDown,
  onFixtureDown,
}: {
  room: Room;
  color: string;
  /** Already-translated room label. */
  label: string;
  rating: RoomRating;
  selected: boolean;
  onBodyDown: (e: React.PointerEvent, roomId: string) => void;
  onHandleDown: (e: React.PointerEvent, roomId: string, corner: Corner) => void;
  onFixtureDown: (e: React.PointerEvent, roomId: string, fixtureId: string) => void;
}) {
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const stroke = selected ? 0.18 : 0.1;
  const compact = room.w < 3 || room.h < 2.2;

  const handles: { corner: Corner; x: number; y: number }[] = [
    { corner: "tl", x: room.x, y: room.y },
    { corner: "tr", x: room.x + room.w, y: room.y },
    { corner: "br", x: room.x + room.w, y: room.y + room.h },
    { corner: "bl", x: room.x, y: room.y + room.h },
  ];

  return (
    <g>
      {/* Body */}
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        rx={0.35}
        fill={color}
        fillOpacity={0.16}
        stroke={rating.hex}
        strokeWidth={stroke}
        onPointerDown={(e) => onBodyDown(e, room.id)}
        style={{ cursor: "move", touchAction: "none" }}
      />

      {/* Zone code chip (top-left) */}
      <text
        x={room.x + 0.28}
        y={room.y + 0.85}
        fontSize={0.62}
        fontWeight={700}
        fill={rating.hex}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {rating.zone}
      </text>

      {/* Emoji + label (centre) */}
      <text
        x={cx}
        y={compact ? cy + 0.55 : cy - 0.05}
        fontSize={compact ? 0.9 : 1.15}
        textAnchor="middle"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {rating.emoji}
      </text>
      {!compact && (
        <text
          x={cx}
          y={cy + 1.0}
          fontSize={0.58}
          textAnchor="middle"
          fill="currentColor"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      )}

      {/* Fixtures */}
      {room.fixtures.map((f) => (
        <WallFixture key={f.id} room={room} fixture={f} onDown={onFixtureDown} />
      ))}

      {/* Resize handles (only when selected) */}
      {selected &&
        handles.map((h) => (
          <circle
            key={h.corner}
            cx={h.x}
            cy={h.y}
            r={0.42}
            fill="var(--card)"
            stroke="#D4AF37"
            strokeWidth={0.12}
            onPointerDown={(e) => onHandleDown(e, room.id, h.corner)}
            style={{ cursor: "nwse-resize", touchAction: "none" }}
          />
        ))}
    </g>
  );
}
