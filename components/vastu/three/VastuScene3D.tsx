"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { DIR8_CW } from "@/lib/vastu/data";
import { DIR_BEARING } from "@/lib/vastu/lens";

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;
import * as THREE from "three";
import type { Plan, Room } from "@/lib/vastu/types";
import type { RoomRating } from "@/lib/vastu/analysis";
import { bbox, brahmasthanRadius, fixturePoint, maxVertexDist, planCenter } from "@/lib/vastu/geometry";
import Furniture from "./Furniture";

/**
 * The 3D explorer: the same plan as the 2D editor, extruded. Visualisation
 * defaults, not construction measurements — cutaway walls so the rooms stay
 * visible from above. 2D stays the precision editor; here you look, orbit and
 * select (selection is shared with 2D through `selectedId`).
 */

export type CameraMode = "iso" | "top";

const OUTER_H = 1.5;
const ROOM_H = 1.05;
const WALL_T = 0.14;
const RATING_TINT: Record<RoomRating["ratingKey"], string> = {
  ideal: "#21D88A",
  acceptable: "#A3E635",
  poor: "#F3C74B",
  harmful: "#FF6767",
  center: "#D4AF37",
};

function Wall({ a, b, h, color, opacity = 1 }: { a: THREE.Vector2; b: THREE.Vector2; h: number; color: string; opacity?: number }) {
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return (
    <mesh position={[mid.x, h / 2, mid.y]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[len + WALL_T, h, WALL_T]} />
      <meshStandardMaterial color={color} roughness={0.7} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

function Opening({ room, wall, t, kind, c }: { room: Room; wall: Room["fixtures"][number]["wall"]; t: number; kind: "door" | "window"; c: THREE.Vector2 }) {
  const p = fixturePoint(room, wall, t);
  const horizontal = wall === "top" || wall === "bottom";
  const out = wall === "top" || wall === "left" ? -1 : 1;
  const x = p.x - c.x + (horizontal ? 0 : out * (WALL_T / 2 + 0.02));
  const z = p.y - c.y + (horizontal ? out * (WALL_T / 2 + 0.02) : 0);
  const door = kind === "door";
  const h = door ? 0.95 : 0.45;
  const y = door ? h / 2 : 0.35 + h / 2;
  return (
    <mesh position={[x, y, z]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
      <boxGeometry args={[door ? 0.9 : 1.1, h, 0.05]} />
      <meshStandardMaterial color={door ? "#D4AF37" : "#36D9E8"} emissive={door ? "#6b5410" : "#0d4a52"} roughness={0.4} />
    </mesh>
  );
}

function RoomMesh({ room, c, rating, color, label, selected, vastu, onSelect }: {
  room: Room;
  c: THREE.Vector2;
  rating?: RoomRating;
  color: string;
  label: string;
  selected: boolean;
  vastu: boolean;
  onSelect: (id: string) => void;
}) {
  const cx = room.x + room.w / 2 - c.x;
  const cz = room.y + room.h / 2 - c.y;
  const tint = vastu && rating ? RATING_TINT[rating.ratingKey] : color;
  const corners = [
    new THREE.Vector2(room.x - c.x, room.y - c.y),
    new THREE.Vector2(room.x + room.w - c.x, room.y - c.y),
    new THREE.Vector2(room.x + room.w - c.x, room.y + room.h - c.y),
    new THREE.Vector2(room.x - c.x, room.y + room.h - c.y),
  ];
  return (
    <group>
      {/* Floor tile: the click target */}
      <mesh
        position={[cx, 0.012, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(room.id);
        }}
      >
        <planeGeometry args={[room.w - 0.04, room.h - 0.04]} />
        <meshStandardMaterial color={tint} transparent opacity={vastu ? 0.55 : 0.28} emissive={selected ? "#D4AF37" : "#000000"} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
      {corners.map((a, i) => (
        <Wall key={i} a={a} b={corners[(i + 1) % 4]} h={ROOM_H} color={selected ? "#E8C766" : vastu ? "#3a3a44" : "#d8d2c4"} opacity={vastu ? 0.9 : 1} />
      ))}
      <group position={[cx, 0.02, cz]}>
        <Furniture room={room} />
      </group>
      {room.fixtures.map((f) => (
        <Opening key={f.id} room={room} wall={f.wall} t={f.t} kind={f.kind} c={c} />
      ))}
      <Html position={[cx, ROOM_H + 0.45, cz]} center distanceFactor={12} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-lg"
          style={{
            background: "rgba(10,10,12,0.82)",
            color: selected ? "#F4D675" : "#E1E2EB",
            border: `1px solid ${vastu && rating ? RATING_TINT[rating.ratingKey] : selected ? "#D4AF37" : "rgba(223,181,100,0.35)"}`,
          }}
        >
          {rating?.emoji} {label}
          {vastu && rating && <span style={{ color: RATING_TINT[rating.ratingKey], marginLeft: 4 }}>{rating.zone}</span>}
        </div>
      </Html>
    </group>
  );
}

/** Moves the camera/target smoothly to a room (or back to the overview). */
function CameraRig({ controls, focus, mode, span, nonce }: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  focus: THREE.Vector3 | null;
  mode: CameraMode;
  span: number;
  nonce: number;
}) {
  const { camera, invalidate } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const target = focus ?? new THREE.Vector3(0, 0, 0);
    const dist = focus ? Math.max(5, span * 0.55) : span * 1.35;
    const pos =
      mode === "top"
        ? new THREE.Vector3(target.x, dist * 1.25, target.z + 0.001)
        : new THREE.Vector3(target.x + dist * 0.62, dist * 0.78, target.z + dist * 0.72);
    goal.current = { pos, target };
    invalidate();
  }, [focus, mode, span, nonce, invalidate]);

  useFrame(() => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    camera.position.lerp(g.pos, 0.14);
    c.target.lerp(g.target, 0.14);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.01 && c.target.distanceTo(g.target) < 0.01) goal.current = null;
    else invalidate();
  });
  return null;
}

export default function VastuScene3D({ plan, ratingById, labelForType, colorForType, selectedId, onSelect, vastu, cameraMode, resetNonce }: {
  plan: Plan;
  ratingById: Record<string, RoomRating>;
  labelForType: (type: string) => string;
  colorForType: (type: string) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Vastu mode: dark scene, rooms tinted by rating, Brahmasthan marked. */
  vastu: boolean;
  cameraMode: CameraMode;
  /** Bump to recentre on the whole home. */
  resetNonce: number;
}) {
  const centre = planCenter(plan);
  const c = useMemo(() => new THREE.Vector2(centre.x, centre.y), [centre.x, centre.y]);
  const bb = bbox(plan.plot);
  const span = Math.max(bb.w, bb.h, 6);
  const controls = useRef<OrbitControlsImpl | null>(null);

  const floorShape = useMemo(() => {
    const s = new THREE.Shape();
    plan.plot.forEach((p, i) => {
      const x = p.x - c.x;
      const y = -(p.y - c.y);
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
    s.closePath();
    return s;
  }, [plan.plot, c]);

  const outer = plan.plot.map((p) => new THREE.Vector2(p.x - c.x, p.y - c.y));
  const selected = selectedId ? plan.rooms.find((r) => r.id === selectedId) : undefined;
  const focus = useMemo(
    () => (selected ? new THREE.Vector3(selected.x + selected.w / 2 - c.x, 0, selected.y + selected.h / 2 - c.y) : null),
    // Re-aim only when the selection changes, not on every drag in 2D.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId],
  );

  // North arrow on the ground: real north is at screen bearing −offset (screen-up = −z).
  const nb = (-plan.northOffsetDeg * Math.PI) / 180;
  const nr = maxVertexDist(plan) + 1.4;
  const north = new THREE.Vector3(Math.sin(nb) * nr, 0.02, -Math.cos(nb) * nr);

  const bg = vastu ? "#07070a" : "#101216";

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 38, position: [span * 0.84, span * 1.05, span * 0.97], near: 0.1, far: 500 }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none" }}
      data-testid="vastu-3d-canvas"
    >
      <color attach="background" args={[bg]} />
      <hemisphereLight args={["#fff6e5", "#20222a", vastu ? 0.5 : 0.85]} />
      <directionalLight position={[span, span * 1.5, span * 0.6]} intensity={vastu ? 0.7 : 1.1} />

      {/* Ground + floor slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <circleGeometry args={[span * 1.4, 48]} />
        <meshStandardMaterial color={vastu ? "#0b0b10" : "#15171c"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <extrudeGeometry args={[floorShape, { depth: 0.2, bevelEnabled: false }]} />
        <meshStandardMaterial color={vastu ? "#1c1b22" : "#cdbfa6"} roughness={0.9} />
      </mesh>

      {/* Brahmasthan */}
      {vastu && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[brahmasthanRadius(plan) * 0.8, brahmasthanRadius(plan), 48]} />
          <meshBasicMaterial color="#D4AF37" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Vastu compass on the ground: eight zones, turned to real north */}
      {vastu && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
            <ringGeometry args={[nr - 0.9, nr - 0.84, 96]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.7} />
          </mesh>
          {DIR8_CW.map((d) => {
            const edge = ((DIR_BEARING[d] + 22.5 - plan.northOffsetDeg) * Math.PI) / 180;
            const mid = ((DIR_BEARING[d] - plan.northOffsetDeg) * Math.PI) / 180;
            const r0 = brahmasthanRadius(plan);
            const r1 = nr - 0.87;
            return (
              <group key={d}>
                <Line
                  points={[
                    [Math.sin(edge) * r0, 0.03, -Math.cos(edge) * r0],
                    [Math.sin(edge) * r1, 0.03, -Math.cos(edge) * r1],
                  ]}
                  color="#D4AF37"
                  lineWidth={1}
                  transparent
                  opacity={0.45}
                />
                <Html center position={[Math.sin(mid) * (nr - 0.35), 0.05, -Math.cos(mid) * (nr - 0.35)]} style={{ pointerEvents: "none" }}>
                  <span className="text-[11px] font-bold" style={{ color: d === "N" ? "#f87171" : "rgba(223,181,100,0.9)" }}>{d}</span>
                </Html>
              </group>
            );
          })}
        </group>
      )}

      {/* Outer walls (cutaway height) */}
      {outer.map((a, i) => (
        <Wall key={i} a={a} b={outer[(i + 1) % outer.length]} h={OUTER_H} color={vastu ? "#2a2833" : "#efe8da"} opacity={vastu ? 0.85 : 1} />
      ))}

      {plan.rooms.map((r) => (
        <RoomMesh
          key={r.id}
          room={r}
          c={c}
          rating={ratingById[r.id]}
          color={colorForType(r.type)}
          label={labelForType(r.type)}
          selected={r.id === selectedId}
          vastu={vastu}
          onSelect={onSelect}
        />
      ))}

      {/* North marker */}
      <group position={north.toArray()}>
        <mesh rotation={[-Math.PI / 2, 0, -nb]}>
          <coneGeometry args={[0.35, 0.9, 3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <Html center position={[0, 0.3, 0]} style={{ pointerEvents: "none" }}>
          <span className="text-[12px] font-extrabold text-red-400">N</span>
        </Html>
      </group>

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.25}
        minDistance={3}
        maxDistance={span * 3}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.7}
      />
      <CameraRig controls={controls} focus={focus} mode={cameraMode} span={span} nonce={resetNonce} />
    </Canvas>
  );
}
