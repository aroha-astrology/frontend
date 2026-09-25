"use client";

import type { Room } from "@/lib/vastu/types";

/**
 * Generic low-poly silhouettes that say what a room is at a glance — not a
 * furniture catalogue. Everything is sized from the room so it always fits.
 * Local coordinates: origin at the room's centre, floor at y = 0.
 */
const WOOD = "#8a6a4a";
const FABRIC = "#c9b89a";
const STONE = "#9aa0a6";
const WHITE = "#e8e4dc";

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={[p[0], p[1] + s[1] / 2, p[2]]}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

export default function Furniture({ room }: { room: Room }) {
  const w = room.w;
  const d = room.h;
  const m = Math.min(w, d);
  const k = Math.min(1, m / 3); // scale down in small rooms

  switch (room.type) {
    case "master_bed":
    case "bed_2":
    case "kids_room": {
      const bw = (room.type === "master_bed" ? 1.8 : 1.3) * k;
      const bl = 2 * k;
      const z = -d / 2 + bl / 2 + 0.15;
      return (
        <group>
          <Box p={[0, 0, z]} s={[bw, 0.45 * k, bl]} c={FABRIC} />
          <Box p={[0, 0.45 * k, z - bl / 2 + 0.25 * k]} s={[bw * 0.85, 0.12, 0.35 * k]} c={WHITE} />
          <Box p={[0, 0, -d / 2 + 0.06]} s={[bw + 0.1, 0.9 * k, 0.1]} c={WOOD} />
        </group>
      );
    }
    case "living": {
      const sw = Math.min(w * 0.7, 2.4);
      return (
        <group>
          <Box p={[0, 0, d / 2 - 0.55]} s={[sw, 0.45, 0.8]} c={FABRIC} />
          <Box p={[0, 0, d / 2 - 0.2]} s={[sw, 0.8, 0.2]} c={FABRIC} />
          <Box p={[0, 0, 0]} s={[sw * 0.45, 0.35, 0.6]} c={WOOD} />
        </group>
      );
    }
    case "dining": {
      const tw = Math.min(w * 0.55, 1.6);
      const td = Math.min(d * 0.45, 0.9);
      return (
        <group>
          <Box p={[0, 0, 0]} s={[tw, 0.75, td]} c={WOOD} />
          {[-1, 1].map((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} p={[(sx * tw) / 3, 0, sz * (td / 2 + 0.3)]} s={[0.4, 0.45, 0.4]} c={FABRIC} />))}
        </group>
      );
    }
    case "kitchen":
      return (
        <group>
          <Box p={[0, 0, -d / 2 + 0.35]} s={[w * 0.9, 0.9, 0.6]} c={STONE} />
          <Box p={[-w / 2 + 0.35, 0, 0]} s={[0.6, 0.9, d * 0.6]} c={STONE} />
        </group>
      );
    case "puja_room":
      return (
        <group>
          <Box p={[0, 0, -d / 2 + 0.4]} s={[Math.min(w * 0.6, 1.2), 0.5, 0.6]} c={WOOD} />
          <Box p={[0, 0.5, -d / 2 + 0.4]} s={[Math.min(w * 0.4, 0.8), 0.45, 0.45]} c="#d4af37" />
          <Box p={[0, 0.95, -d / 2 + 0.4]} s={[0.25, 0.3, 0.25]} c="#f4d675" />
        </group>
      );
    case "bathroom":
      return (
        <group>
          <Box p={[w / 2 - 0.4, 0, -d / 2 + 0.4]} s={[0.45, 0.45, 0.6]} c={WHITE} />
          <Box p={[-w / 2 + 0.55, 0, -d / 2 + 0.55]} s={[0.9, 0.06, 0.9]} c="#7fb3c9" />
        </group>
      );
    case "stairs": {
      const n = 6;
      return (
        <group>
          {Array.from({ length: n }, (_, i) => (
            <Box key={i} p={[0, 0, -d / 2 + ((i + 0.5) * d) / n]} s={[w * 0.6, (i + 1) * 0.28, d / n]} c={STONE} />
          ))}
        </group>
      );
    }
    case "store":
      return (
        <group>
          <Box p={[0, 0, -d / 2 + 0.25]} s={[w * 0.8, 1.6, 0.4]} c={WOOD} />
          <Box p={[w / 4, 0, 0]} s={[0.5, 0.5, 0.5]} c={FABRIC} />
        </group>
      );
    case "parking":
      return (
        <group>
          <Box p={[0, 0, 0]} s={[Math.min(w * 0.55, 1.8), 0.6, Math.min(d * 0.8, 3.8)]} c="#5b6b7b" />
          <Box p={[0, 0.6, 0]} s={[Math.min(w * 0.45, 1.5), 0.45, Math.min(d * 0.4, 2)]} c="#7d8c9b" />
        </group>
      );
    case "water_tank":
      return (
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[m * 0.3, m * 0.3, 1.2, 20]} />
          <meshStandardMaterial color="#4f8fbf" roughness={0.5} />
        </mesh>
      );
    case "balcony":
      return <Box p={[0, 0, d / 2 - 0.05]} s={[w, 0.9, 0.06]} c={STONE} />;
    case "entrance":
      return <Box p={[0, 0, 0]} s={[Math.min(w * 0.5, 1.2), 0.02, Math.min(d * 0.35, 0.7)]} c="#b5533c" />;
    default:
      return null;
  }
}
