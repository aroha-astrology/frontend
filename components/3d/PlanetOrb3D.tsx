"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { type PlanetId } from "./planet-registry";

// ─────────────────────────────────────────────────────────────────────────────
// ASSET SWAP: official NASA glTF models (downloaded to /public/models) replace
// the old procedural <sphereGeometry>. Each .glb is a real NASA/JPL asset from
// science.nasa.gov/3d-resources. `tint` is the fallback-sphere color used while
// a model streams in (or if it fails to load).
// ─────────────────────────────────────────────────────────────────────────────
type Body = { id: string; name: string; url: string; tint: string };

const BODIES: Body[] = [
  { id: "mercury", name: "Mercury", url: "/models/mercury.glb", tint: "#b8b2a7" },
  { id: "venus", name: "Venus", url: "/models/venus.glb", tint: "#e6c98a" },
  { id: "earth", name: "Earth", url: "/models/earth.glb", tint: "#3b5b7a" },
  { id: "mars", name: "Mars", url: "/models/mars.glb", tint: "#c1502e" },
  { id: "jupiter", name: "Jupiter", url: "/models/jupiter.glb", tint: "#d8b48a" },
  { id: "saturn", name: "Saturn", url: "/models/saturn.glb", tint: "#e3cf9e" },
  { id: "uranus", name: "Uranus", url: "/models/uranus.glb", tint: "#9fd8e3" },
  { id: "neptune", name: "Neptune", url: "/models/neptune.glb", tint: "#3a5bd0" },
  { id: "pluto", name: "Pluto", url: "/models/pluto.glb", tint: "#caa37a" },
];

/**
 * AssetErrorBoundary — Suspense ONLY covers the loading (pending) state; a failed
 * fetch (404 / network / corrupt file) is a thrown error that Suspense lets through
 * and would crash the whole React tree. This boundary catches that and renders a
 * fallback 3D object instead, so the UI degrades gracefully. Re-key it per body so
 * a previous load error doesn't stick when we cycle to the next planet.
 */
class AssetErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("PlanetOrb3D: failed to load 3D asset —", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * FallbackPlanet — shown while a model streams in, or if it can't load. Keeps the
 * same unit radius, axial tilt, and auto-rotation so the scene still reads right.
 */
function FallbackPlanet({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.06;
  });
  return (
    <group rotation={[0.32, 0, 0.12]}>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * PlanetModel — loads a NASA glTF and applies the SAME axial tilt + auto-rotation
 * the old <sphereGeometry> mesh had.
 *
 * ▸ Auto-rotation: identical `delta * 0.06` slow spin on the Y axis.
 * ▸ Position/tilt:  identical group rotation [0.32, 0, 0.12] (axial tilt).
 * ▸ Scale:          NASA models are modeled at REAL proportions (Jupiter ≫ Earth),
 *                   so we auto-fit each one — center it and scale by its bounding
 *                   box to a uniform ~unit radius. This keeps every planet the same
 *                   on-screen size and the camera framing identical across the cycle.
 */
function PlanetModel({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    // Auto-fit: recenter on origin and normalize size to a ~2-unit diameter
    // (matches the old radius-1 sphere → camera at z=2.7 frames it the same).
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 2 / maxDim;
    cloned.scale.setScalar(s);
    cloned.position.set(-center.x * s, -center.y * s, -center.z * s);
    return cloned;
  }, [scene]);

  // UNCHANGED auto-rotation: same slow spin rate as the original sphereRef.
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    // UNCHANGED axial tilt for the whole system.
    <group rotation={[0.32, 0, 0.12]}>
      <group ref={groupRef}>
        {/* ── ASSET SWAP: the NASA glTF (ships with its own NASA/JPL textures) ── */}
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function PlanetOrb3D({
  planet = "moon",
  cycle = true,
  cycleMs = 5000,
  className,
  style,
}: {
  /** Starting body. If it matches a NASA model it sets the cycle's start point. */
  planet?: PlanetId;
  /** Auto-advance through all planets (default true). */
  cycle?: boolean;
  /** Milliseconds per planet (default 5000 = swap every 5s). */
  cycleMs?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const start = Math.max(0, BODIES.findIndex((b) => b.id === planet));
  const [index, setIndex] = useState(start);

  // Advance to the next planet every `cycleMs` (5s by default).
  useEffect(() => {
    if (!cycle) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % BODIES.length);
    }, cycleMs);
    return () => clearInterval(id);
  }, [cycle, cycleMs]);

  const body = BODIES[index];

  // Warm up the NEXT model while the current one is on screen, so the 5s swap is
  // seamless instead of flashing the fallback sphere each time.
  useEffect(() => {
    useGLTF.preload(BODIES[(index + 1) % BODIES.length].url);
  }, [index]);

  return (
    <Canvas
      className={className}
      style={style}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 2.7], fov: 45 }}
    >
      {/* UNCHANGED lighting rig ───────────────────────────────────────────── */}
      {/* soft fill so the night side blends into black instead of cutting hard */}
      <ambientLight intensity={0.35} />
      {/* key light from top-left, matching the hero composition */}
      <directionalLight position={[-3, 2.5, 3]} intensity={2.6} color="#fff6e0" />
      {/* faint warm rim from the opposite side */}
      <pointLight position={[3, -1, -2]} intensity={0.6} color="#dfb564" />

      {/* Error boundary (load failures) + Suspense (loading state) make each
          external asset safe. Both are keyed by body.id so cycling resets state
          cleanly. Suspense shows the tinted fallback sphere while the model loads. */}
      <AssetErrorBoundary key={body.id} fallback={<FallbackPlanet color={body.tint} />}>
        <Suspense fallback={<FallbackPlanet color={body.tint} />}>
          <PlanetModel url={body.url} />
        </Suspense>
      </AssetErrorBoundary>
    </Canvas>
  );
}
