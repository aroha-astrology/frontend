"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getPlanet, type PlanetId } from "./planet-registry";
import {
  createPlanetTextures,
  createRingTexture,
  type PlanetTextures,
} from "./procedural-planet-textures";

// Cache textures across mounts so we only rasterize each planet once.
const textureCache = new Map<PlanetId, PlanetTextures>();
function getTextures(id: PlanetId): PlanetTextures {
  let t = textureCache.get(id);
  if (!t) {
    t = createPlanetTextures(getPlanet(id));
    textureCache.set(id, t);
  }
  return t;
}

// Build a ring mesh whose UV.u is remapped to radial distance, so the strip
// texture (inner→outer) paints concentric bands instead of streaks.
function useRingGeometry(inner: number, outer: number) {
  return useMemo(() => {
    const geo = new THREE.RingGeometry(inner, outer, 180, 1);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const r = v3.length();
      const u = (r - inner) / (outer - inner);
      uv.setXY(i, u, 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, [inner, outer]);
}

function Sphere({ id }: { id: PlanetId }) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const v = getPlanet(id);
  const { map, bumpMap } = useMemo(() => getTextures(id), [id]);
  const hasRings = id === "saturn";
  const ringTex = useMemo(
    () => (hasRings ? createRingTexture(v) : null),
    [hasRings, v]
  );
  const ringGeo = useRingGeometry(1.35, 2.25);

  useFrame((_, delta) => {
    if (sphereRef.current) sphereRef.current.rotation.y += delta * 0.06; // slow spin
  });

  return (
    // Axial tilt for the whole system (Saturn ≈ 26.7°)
    <group ref={groupRef} rotation={[0.32, 0, 0.12]}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial
          map={map}
          bumpMap={bumpMap}
          bumpScale={2.5}
          roughness={v.roughness}
          metalness={0}
          emissive={new THREE.Color(v.emissive)}
          emissiveIntensity={0.45}
        />
      </mesh>

      {hasRings && ringTex && (
        <mesh geometry={ringGeo} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            map={ringTex}
            side={THREE.DoubleSide}
            transparent
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

export default function PlanetOrb3D({
  planet = "moon",
  className,
  style,
}: {
  planet?: PlanetId;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Pull the camera back when rings are present so the full system fits.
  const camZ = planet === "saturn" ? 5.6 : 2.7;
  return (
    <Canvas
      className={className}
      style={style}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, camZ], fov: 45 }}
    >
      {/* soft fill so the night side blends into black instead of cutting hard */}
      <ambientLight intensity={0.35} />
      {/* key light from top-left, matching the hero composition */}
      <directionalLight position={[-3, 2.5, 3]} intensity={2.6} color="#fff6e0" />
      {/* faint warm rim from the opposite side */}
      <pointLight position={[3, -1, -2]} intensity={0.6} color="#dfb564" />
      <Sphere id={planet} />
    </Canvas>
  );
}
