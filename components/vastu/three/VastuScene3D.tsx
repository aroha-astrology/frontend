"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, Html, Lightformer, Line, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { Plan, Pt, Room } from "@/lib/vastu/types";
import type { RoomRating } from "@/lib/vastu/analysis";
import { bbox, brahmasthanRadius, fixturePoint, maxVertexDist, planCenter } from "@/lib/vastu/geometry";
import { DIR8_CW } from "@/lib/vastu/data";
import { DIR_BEARING } from "@/lib/vastu/lens";
import Furniture from "./Furniture";
import { wallPieces, type Opening } from "./walls";
import { CAP, CAP_SELECTED, GLASS, RATING_TINT, SLAB, SLAB_VASTU, WALL, WALL_VASTU, floorColor } from "./materials";

/**
 * The 3D explorer ("dollhouse" view): the same plan as the 2D editor, extruded.
 * Walls are cut below head height with dark caps so every room reads from
 * above; doors leave gaps and windows get sills with glass. Visualisation
 * defaults, not construction measurements. 2D stays the precision editor —
 * here you orbit, look and select (selection is shared with 2D).
 */

export type CameraMode = "iso" | "top";

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;

const OUTER_H = 1.25;
const OUTER_T = 0.22;
const ROOM_H = 1.0;
const ROOM_T = 0.1;
const CAP_H = 0.025;
const DOOR_W = 0.9;
const WINDOW_W = 1.1;

/** A straight wall from a to b (plan units, relative to the house centre), split around openings. */
function Wall({ a, b, h, t, openings, color, cap, shadows }: {
  a: Pt;
  b: Pt;
  h: number;
  t: number;
  openings: Opening[];
  color: string;
  cap: string;
  shadows: boolean;
}) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const pieces = useMemo(() => wallPieces(len, h, openings), [len, h, openings]);
  return (
    <group position={[a.x, 0, a.y]} rotation={[0, -angle, 0]}>
      {pieces.map((p, i) => {
        const w = p.to - p.from;
        const cx = (p.from + p.to) / 2;
        const ph = p.y1 - p.y0;
        if (p.kind === "glass") {
          return (
            <mesh key={i} position={[cx, p.y0 + ph / 2, 0]}>
              <boxGeometry args={[w, ph, t * 0.25]} />
              <meshPhysicalMaterial color={GLASS} transparent opacity={0.35} roughness={0.05} metalness={0.1} />
            </mesh>
          );
        }
        return (
          <group key={i}>
            <mesh position={[cx, p.y0 + ph / 2, 0]} castShadow={shadows} receiveShadow={shadows}>
              <boxGeometry args={[w, ph, t]} />
              <meshStandardMaterial color={color} roughness={0.92} />
            </mesh>
            <mesh position={[cx, p.y1 + CAP_H / 2, 0]}>
              <boxGeometry args={[w, CAP_H, t + 0.004]} />
              <meshStandardMaterial color={cap} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** An open door leaf swung into the room at a door gap. */
function DoorLeaf({ at, wallAngle }: { at: Pt; wallAngle: number }) {
  return (
    <group position={[at.x, 0, at.y]} rotation={[0, -wallAngle, 0]}>
      <group position={[-DOOR_W / 2, 0, 0]} rotation={[0, -1.05, 0]}>
        <mesh position={[DOOR_W / 2, 0.5, 0]} castShadow>
          <boxGeometry args={[DOOR_W, 1.0, 0.04]} />
          <meshStandardMaterial color="#8a6a48" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

const WALLS_OF: Record<"top" | "right" | "bottom" | "left", number> = { top: 0, right: 1, bottom: 2, left: 3 };

function RoomMesh({ room, c, rating, label, selected, vastu, shadows, onSelect }: {
  room: Room;
  c: Pt;
  rating?: RoomRating;
  label: string;
  selected: boolean;
  vastu: boolean;
  shadows: boolean;
  onSelect: (id: string) => void;
}) {
  const cx = room.x + room.w / 2 - c.x;
  const cz = room.y + room.h / 2 - c.y;
  // Walls inset by half their thickness, so neighbours form one double-width wall without z-fighting.
  const i = ROOM_T / 2;
  const x0 = room.x - c.x + i;
  const x1 = room.x + room.w - c.x - i;
  const z0 = room.y - c.y + i;
  const z1 = room.y + room.h - c.y - i;
  const edges: [Pt, Pt][] = [
    [{ x: x0, y: z0 }, { x: x1, y: z0 }],
    [{ x: x1, y: z0 }, { x: x1, y: z1 }],
    [{ x: x1, y: z1 }, { x: x0, y: z1 }],
    [{ x: x0, y: z1 }, { x: x0, y: z0 }],
  ];
  const openingsPerWall: Opening[][] = [[], [], [], []];
  const doors: { at: Pt; angle: number }[] = [];
  for (const f of room.fixtures) {
    const wi = WALLS_OF[f.wall];
    const [a, b] = edges[wi];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    // top/right run with t; bottom/left run against it.
    const along = wi < 2 ? f.t * len : (1 - f.t) * len;
    openingsPerWall[wi].push({ at: along, width: f.kind === "door" ? DOOR_W : WINDOW_W, kind: f.kind });
    if (f.kind === "door") {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      doors.push({ at: { x: a.x + Math.cos(ang) * along, y: a.y + Math.sin(ang) * along }, angle: ang });
    }
  }
  const tint = rating ? RATING_TINT[rating.ratingKey] : "#ffffff";
  const issue = vastu && rating?.ratingKey === "harmful";

  return (
    <group>
      <mesh
        position={[cx, 0.006, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={shadows}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(room.id);
        }}
      >
        <planeGeometry args={[room.w - 0.02, room.h - 0.02]} />
        <meshStandardMaterial color={floorColor(room.type)} roughness={0.85} />
        {selected && <Edges color={CAP_SELECTED} lineWidth={2.5} />}
      </mesh>
      {vastu && rating && (
        <mesh position={[cx, 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[room.w - 0.12, room.h - 0.12]} />
          <meshBasicMaterial color={tint} transparent opacity={issue ? 0.62 : 0.5} depthWrite={false} toneMapped={false} />
          {issue && <Edges color="#FF6767" lineWidth={2} />}
        </mesh>
      )}
      {edges.map(([a, b], wi) => (
        <Wall
          key={wi}
          a={a}
          b={b}
          h={ROOM_H}
          t={ROOM_T}
          openings={openingsPerWall[wi]}
          color={vastu ? WALL_VASTU : WALL}
          cap={selected ? CAP_SELECTED : CAP}
          shadows={shadows}
        />
      ))}
      {doors.map((d, k) => <DoorLeaf key={k} at={d.at} wallAngle={d.angle} />)}
      <group position={[cx, 0.012, cz]}>
        <Furniture room={room} />
      </group>
      <Html position={[cx, ROOM_H + 0.35, cz]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div
          className="whitespace-nowrap rounded-full px-2 py-[3px] text-[10.5px] font-semibold leading-none shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors"
          style={{
            background: selected ? "rgba(26,20,6,0.92)" : "rgba(12,12,15,0.78)",
            color: selected ? "#F4D675" : "#EDEBE6",
            border: `1px solid ${vastu && rating ? tint : selected ? "#D4AF37" : "rgba(255,255,255,0.12)"}`,
            backdropFilter: "blur(6px)",
          }}
        >
          <span className="mr-1">{rating?.emoji}</span>
          {label}
          {(vastu || selected) && rating && <span style={{ color: tint, marginLeft: 5 }}>{rating.zone}</span>}
        </div>
      </Html>
    </group>
  );
}

/** Eases the camera to its goal; hands control straight back if the user grabs the view. */
function CameraRig({ controls, goalKey, target, mode, radius }: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  goalKey: string;
  target: THREE.Vector3;
  mode: CameraMode;
  radius: number;
}) {
  const { camera, invalidate } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const dist = (radius / Math.sin(fov / 2)) * 1.02;
    const dir = mode === "top" ? new THREE.Vector3(0, 1, 0.0001) : new THREE.Vector3(0.56, 0.72, 0.66);
    goal.current = { pos: target.clone().add(dir.normalize().multiplyScalar(dist)), target: target.clone() };
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalKey, mode, radius]);

  useEffect(() => {
    const c = controls.current as unknown as THREE.EventDispatcher<{ start: object }> | null;
    if (!c) return;
    const stop = () => {
      goal.current = null;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent ease
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.005 && c.target.distanceTo(g.target) < 0.005) goal.current = null;
    else invalidate();
  });
  return null;
}

export default function VastuScene3D({ plan, ratingById, labelForType, selectedId, onSelect, vastu, cameraMode, resetNonce }: {
  plan: Plan;
  ratingById: Record<string, RoomRating>;
  labelForType: (type: string) => string;
  /** Kept for API parity with the 2D canvas; room identity comes from floors + labels here. */
  colorForType?: (type: string) => string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Vastu mode: rooms tinted by rating, issues outlined, compass + zones on the ground. */
  vastu: boolean;
  cameraMode: CameraMode;
  /** Bump to recentre on the whole home. */
  resetNonce: number;
}) {
  const centre = planCenter(plan);
  const c = useMemo(() => ({ x: centre.x, y: centre.y }), [centre.x, centre.y]);
  const bb = bbox(plan.plot);
  const houseR = maxVertexDist(plan);
  const controls = useRef<OrbitControlsImpl | null>(null);
  // Drop to cheaper rendering on phones that can't keep up.
  const [quality, setQuality] = useState<"high" | "low">("high");
  const shadows = quality === "high";

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

  // Outer walls, with openings wherever a room's door/window sits on the outline.
  const outer = useMemo(() => {
    const pts = plan.plot.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
    return pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const openings: Opening[] = [];
      for (const r of plan.rooms) {
        for (const f of r.fixtures) {
          const fp = fixturePoint(r, f.wall, f.t);
          const px = fp.x - c.x - a.x;
          const py = fp.y - c.y - a.y;
          const along = px * ux + py * uy;
          const off = Math.abs(px * uy - py * ux);
          if (off < 0.3 && along > 0 && along < len) openings.push({ at: along, width: f.kind === "door" ? DOOR_W : WINDOW_W, kind: f.kind });
        }
      }
      return { a, b, openings };
    });
  }, [plan.plot, plan.rooms, c]);

  const selected = selectedId ? plan.rooms.find((r) => r.id === selectedId) : undefined;
  const target = useMemo(
    () => (selected ? new THREE.Vector3(selected.x + selected.w / 2 - c.x, 0.3, selected.y + selected.h / 2 - c.y) : new THREE.Vector3(0, 0.2, 0)),
    // Re-aim only when the selection changes, not on every drag in 2D.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, resetNonce],
  );
  const radius = selected ? Math.max(2.2, Math.max(selected.w, selected.h) * 0.95) : houseR + 0.9;
  const goalKey = `${selectedId ?? "home"}:${resetNonce}`;

  const nr = houseR + 1.4;
  const nb = (-plan.northOffsetDeg * Math.PI) / 180;
  const bg = vastu ? "#06060a" : "#0d0e12";
  const span = Math.max(bb.w, bb.h, 6);
  const planKey = useMemo(() => JSON.stringify([plan.plot, plan.rooms.map((r) => [r.x, r.y, r.w, r.h])]), [plan.plot, plan.rooms]);

  return (
    <Canvas
      frameloop="demand"
      shadows={shadows ? "soft" : false}
      dpr={quality === "high" ? [1, 1.75] : 1}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      // Start overhead so opening 3D reads as the plan rising into a house.
      camera={{ fov: 34, position: [0, span * 2.4, 0.01], near: 0.1, far: 400 }}
      onPointerMissed={() => onSelect(null)}
      style={{ touchAction: "none" }}
      data-testid="vastu-3d-canvas"
    >
      <PerformanceMonitor onDecline={() => setQuality("low")} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, span * 2.6, span * 6]} />

      {/* Soft studio light, built in code (no downloads). */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={0.5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={0.35} color="#ffe7c4" position={[8, 3, 6]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.25} color="#c9d7ff" position={[-8, 3, -6]} scale={[6, 3, 1]} />
      </Environment>
      <hemisphereLight args={["#fff4e0", "#1a1b22", vastu ? 0.28 : 0.32]} />
      <directionalLight
        position={[span * 0.7, span * 1.3, span * 0.9]}
        intensity={vastu ? 0.85 : 1.05}
        color="#fff1dc"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 5}
      />

      {/* Ground, slab and a soft contact shadow under the house */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.23, 0]} receiveShadow={shadows}>
        <circleGeometry args={[span * 3, 64]} />
        <meshStandardMaterial color={vastu ? "#09090d" : "#15161b"} roughness={1} />
      </mesh>
      <ContactShadows key={planKey} position={[0, -0.225, 0]} scale={span * 2.2} blur={2.4} opacity={0.6} far={2} frames={1} resolution={512} color="#000000" />
      {/* The bevel adds 0.02 on top, so the slab sits 0.22 down and its top is exactly y = 0. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]} receiveShadow={shadows} castShadow={shadows}>
        <extrudeGeometry args={[floorShape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 }]} />
        <meshStandardMaterial color={vastu ? SLAB_VASTU : SLAB} roughness={0.9} />
      </mesh>

      {/* Vastu: Brahmasthan + compass zones on the ground, turned to real north */}
      {vastu && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
            <circleGeometry args={[brahmasthanRadius(plan), 48]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.28} depthWrite={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]} raycast={() => null}>
            <ringGeometry args={[brahmasthanRadius(plan) * 0.94, brahmasthanRadius(plan), 64]} />
            <meshBasicMaterial color="#D4AF37" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.215, 0]} raycast={() => null}>
            <ringGeometry args={[nr - 0.92, nr - 0.86, 128]} />
            <meshBasicMaterial color="#D4AF37" transparent opacity={0.75} />
          </mesh>
          {DIR8_CW.map((d) => {
            const edge = ((DIR_BEARING[d] + 22.5 - plan.northOffsetDeg) * Math.PI) / 180;
            const mid = ((DIR_BEARING[d] - plan.northOffsetDeg) * Math.PI) / 180;
            const r0 = brahmasthanRadius(plan);
            const r1 = nr - 0.89;
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
                  opacity={0.4}
                  dashed
                  dashSize={0.25}
                  gapSize={0.18}
                />
                <Html center position={[Math.sin(mid) * (nr - 0.4), -0.1, -Math.cos(mid) * (nr - 0.4)]} style={{ pointerEvents: "none" }}>
                  <span className="text-[11px] font-bold tracking-wide" style={{ color: d === "N" ? "#f87171" : "rgba(223,181,100,0.95)" }}>{d}</span>
                </Html>
              </group>
            );
          })}
        </group>
      )}

      {outer.map(({ a, b, openings }, i) => (
        <Wall key={i} a={a} b={b} h={OUTER_H} t={OUTER_T} openings={openings} color={vastu ? WALL_VASTU : WALL} cap={CAP} shadows={shadows} />
      ))}

      {plan.rooms.map((r) => (
        <RoomMesh
          key={r.id}
          room={r}
          c={c}
          rating={ratingById[r.id]}
          label={labelForType(r.type)}
          selected={r.id === selectedId}
          vastu={vastu}
          shadows={shadows}
          onSelect={onSelect}
        />
      ))}

      {/* North marker (always) */}
      <group position={[Math.sin(nb) * (nr + 0.2), -0.2, -Math.cos(nb) * (nr + 0.2)]}>
        <mesh rotation={[-Math.PI / 2, 0, -nb]} raycast={() => null}>
          <circleGeometry args={[0.42, 3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {!vastu && (
          <Html center position={[0, 0.25, 0]} style={{ pointerEvents: "none" }}>
            <span className="text-[11px] font-extrabold text-red-400">N</span>
          </Html>
        )}
      </group>

      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={2}
        maxDistance={span * 4}
        rotateSpeed={0.55}
        zoomSpeed={0.8}
        panSpeed={0.7}
        screenSpacePanning
      />
      <CameraRig controls={controls} goalKey={goalKey} target={target} mode={cameraMode} radius={radius} />
    </Canvas>
  );
}
