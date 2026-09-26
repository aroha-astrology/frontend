"use client";

import { RoundedBox } from "@react-three/drei";
import type { Room } from "@/lib/vastu/types";

/**
 * Generic, softened silhouettes that say what a room is at a glance — not a
 * furniture catalogue. Sized from the room so they always fit.
 * Local coordinates: origin at the room's centre, floor at y = 0.
 */
const WOOD = "#7b5a3d";
const LINEN = "#efe9df";
const FABRIC = "#b9a58a";
const ACCENT = "#6d7f8f";
const STONE = "#c8c6c0";
const STEEL = "#8c96a0";

type V3 = [number, number, number];

function Soft({ p, s, c, r = 0.06 }: { p: V3; s: V3; c: string; r?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(r, s[0] / 2.2, s[1] / 2.2, s[2] / 2.2)} smoothness={3} position={[p[0], p[1] + s[1] / 2, p[2]]} castShadow receiveShadow>
      <meshStandardMaterial color={c} roughness={0.8} />
    </RoundedBox>
  );
}

export default function Furniture({ room }: { room: Room }) {
  const w = room.w;
  const d = room.h;
  const m = Math.min(w, d);
  const k = Math.max(0.55, Math.min(1, m / 3.2));

  switch (room.type) {
    case "master_bed":
    case "bed_2":
    case "kids_room": {
      const bw = (room.type === "master_bed" ? 1.8 : room.type === "kids_room" ? 1.1 : 1.4) * k;
      const bl = 2.05 * k;
      const z = -d / 2 + bl / 2 + 0.2;
      return (
        <group>
          <Soft p={[0, 0, z]} s={[bw, 0.32 * k, bl]} c={WOOD} r={0.04} />
          <Soft p={[0, 0.32 * k, z + 0.1]} s={[bw * 0.96, 0.14, bl * 0.8]} c={room.type === "kids_room" ? "#9cc3d6" : ACCENT} r={0.05} />
          {(room.type === "master_bed" ? [-1, 1] : [0]).map((i) => (
            <Soft key={i} p={[(i * bw) / 4, 0.32 * k, z - bl / 2 + 0.28]} s={[room.type === "master_bed" ? bw * 0.4 : bw * 0.7, 0.12, 0.34]} c={LINEN} r={0.06} />
          ))}
          <Soft p={[0, 0, -d / 2 + 0.12]} s={[bw + 0.12, 0.85 * k, 0.1]} c={WOOD} r={0.03} />
          {w > 2.6 && <Soft p={[bw / 2 + 0.35, 0, -d / 2 + 0.35]} s={[0.4, 0.45, 0.4]} c={WOOD} />}
        </group>
      );
    }
    case "living": {
      const sw = Math.min(w * 0.7, 2.4);
      return (
        <group>
          <Soft p={[0, 0, d / 2 - 0.6]} s={[sw, 0.42, 0.85]} c={FABRIC} r={0.1} />
          <Soft p={[0, 0.42, d / 2 - 0.3]} s={[sw, 0.36, 0.22]} c={FABRIC} r={0.08} />
          {[-1, 1].map((i) => <Soft key={i} p={[(i * (sw - 0.2)) / 2, 0.42, d / 2 - 0.6]} s={[0.2, 0.22, 0.85]} c={FABRIC} r={0.08} />)}
          <Soft p={[0, 0, -0.1]} s={[sw * 0.42, 0.34, 0.6]} c={WOOD} r={0.04} />
          <Soft p={[0, 0, -d / 2 + 0.2]} s={[Math.min(w * 0.5, 1.6), 0.5, 0.35]} c="#3f3f46" r={0.03} />
        </group>
      );
    }
    case "dining": {
      const tw = Math.min(w * 0.55, 1.7);
      const td = Math.min(d * 0.45, 0.95);
      return (
        <group>
          <Soft p={[0, 0, 0]} s={[tw, 0.74, td]} c={WOOD} r={0.04} />
          {[-1, 1].map((sx) => [-1, 1].map((sz) => <Soft key={`${sx}${sz}`} p={[(sx * tw) / 3.2, 0, sz * (td / 2 + 0.28)]} s={[0.42, 0.46, 0.42]} c={FABRIC} r={0.06} />))}
        </group>
      );
    }
    case "kitchen":
      return (
        <group>
          <Soft p={[0, 0, -d / 2 + 0.33]} s={[w * 0.9, 0.9, 0.6]} c={STONE} r={0.03} />
          <Soft p={[-w / 2 + 0.33, 0, 0.1]} s={[0.6, 0.9, d * 0.55]} c={STONE} r={0.03} />
          <Soft p={[w * 0.18, 0.9, -d / 2 + 0.33]} s={[0.55, 0.03, 0.45]} c="#26262b" r={0.01} />
          {w > 2.4 && d > 2.4 && <Soft p={[w * 0.12, 0, d * 0.12]} s={[Math.min(1.2, w * 0.35), 0.9, 0.6]} c={WOOD} r={0.03} />}
        </group>
      );
    case "puja_room":
      return (
        <group>
          <Soft p={[0, 0, -d / 2 + 0.4]} s={[Math.min(w * 0.6, 1.2), 0.5, 0.6]} c={WOOD} r={0.03} />
          <Soft p={[0, 0.5, -d / 2 + 0.4]} s={[Math.min(w * 0.42, 0.8), 0.42, 0.45]} c="#d4af37" r={0.04} />
          <mesh position={[0, 1.1, -d / 2 + 0.4]} castShadow>
            <coneGeometry args={[0.22, 0.35, 4]} />
            <meshStandardMaterial color="#f4d675" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      );
    case "bathroom":
      return (
        <group>
          <Soft p={[w / 2 - 0.4, 0, -d / 2 + 0.38]} s={[0.42, 0.42, 0.62]} c={LINEN} r={0.1} />
          <Soft p={[-w / 2 + 0.6, 0, -d / 2 + 0.6]} s={[1, 0.05, 1]} c="#9ccbd9" r={0.02} />
          <Soft p={[w / 2 - 0.35, 0, d / 2 - 0.35]} s={[0.55, 0.8, 0.45]} c={LINEN} r={0.04} />
        </group>
      );
    case "stairs": {
      const n = 7;
      return (
        <group>
          {Array.from({ length: n }, (_, i) => (
            <Soft key={i} p={[0, 0, -d / 2 + ((i + 0.5) * d) / n]} s={[w * 0.66, (i + 1) * 0.16, d / n]} c={STONE} r={0.02} />
          ))}
        </group>
      );
    }
    case "store":
      return (
        <group>
          <Soft p={[0, 0, -d / 2 + 0.25]} s={[w * 0.8, 1.5, 0.4]} c={WOOD} r={0.03} />
          <Soft p={[w / 4, 0, 0.1]} s={[0.5, 0.5, 0.5]} c={FABRIC} r={0.04} />
          <Soft p={[w / 4, 0.5, 0.1]} s={[0.4, 0.35, 0.4]} c={FABRIC} r={0.04} />
        </group>
      );
    case "parking":
      return (
        <group>
          <Soft p={[0, 0.12, 0]} s={[Math.min(w * 0.55, 1.8), 0.55, Math.min(d * 0.8, 4)]} c={STEEL} r={0.2} />
          <Soft p={[0, 0.67, -0.1]} s={[Math.min(w * 0.45, 1.5), 0.42, Math.min(d * 0.4, 2)]} c="#56606b" r={0.18} />
        </group>
      );
    case "water_tank":
      return (
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[m * 0.3, m * 0.3, 1.3, 28]} />
          <meshStandardMaterial color="#4f8fbf" roughness={0.45} />
        </mesh>
      );
    case "balcony":
      return (
        <group>
          <Soft p={[0, 0, d / 2 - 0.05]} s={[w, 0.9, 0.05]} c="#cfd6dc" r={0.01} />
          <mesh position={[-w / 4, 0.25, 0]} castShadow>
            <sphereGeometry args={[0.28, 16, 12]} />
            <meshStandardMaterial color="#4f7f4a" roughness={0.9} />
          </mesh>
        </group>
      );
    case "entrance":
      return <Soft p={[0, 0, 0]} s={[Math.min(w * 0.5, 1.2), 0.02, Math.min(d * 0.35, 0.7)]} c="#a8543f" r={0.01} />;
    default:
      return null;
  }
}
