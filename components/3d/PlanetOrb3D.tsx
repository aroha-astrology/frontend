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
import { getPlanet, type PlanetId } from "./planet-registry";
import { createPlanetTextures } from "./procedural-planet-textures";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

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
  const reducedMotion = usePrefersReducedMotion();
  useFrame((_, delta) => {
    if (reducedMotion) return;
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
  const reducedMotion = usePrefersReducedMotion();
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
  // Reduced-motion users get the same framing, just held still.
  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    // UNCHANGED axial tilt for the whole system.
    <group rotation={[0.32, 0, 0.12]}>
      <group ref={groupRef}>
        {/* ── ASSET SWAP: the NASA glTF (ships with its own NASA/JPL textures) ──
            dispose={null}: `model` is a clone of `scene`, which useGLTF/useLoader
            caches and shares across every future mount of this same url (the
            cycle repeats through all 9 bodies forever). Without this, R3F's
            default auto-dispose-on-unmount destroys the geometry/material/
            textures the clone shares with that cache when we swap to the next
            body every 5s — so a planet's SECOND appearance renders from
            already-disposed GPU resources. Repeated dispose+reuse like that is
            what was corrupting the GPU driver state and eventually taking down
            the whole WebGL context (reproduced live: a burst of "Shader
            compilation failed" / "Pipeline create failed" immediately preceding
            "THREE.WebGLRenderer: Context Lost", after a few minutes of cycling). */}
        <primitive object={model} dispose={null} />
      </group>
    </group>
  );
}

/** Procedural bodies covered here — the two `PlanetId`s with no NASA glTF asset. */
type ProceduralId = "moon" | "sun";

/**
 * ProceduralPlanet — renders `moon`/`sun` with the canvas-based textures from
 * procedural-planet-textures.ts (colors/roughness/texture style come from the
 * shared planet-registry, same as the CSS fallback orb). These two bodies
 * aren't in BODIES (no NASA glTF exists for either), so they never go through
 * PlanetModel/useGLTF at all — this is a parallel, always-pinned rendering
 * path, not a fallback for a failed GLB load.
 *
 * Matches the SAME visual contract as PlanetModel/FallbackPlanet: unit-radius
 * sphere, identical `delta * 0.06` Y-axis spin, identical [0.32, 0, 0.12]
 * axial tilt, so swapping between a GLB weekday ruler and Sun/Moon never
 * changes the framing.
 */
function ProceduralPlanet({ id }: { id: ProceduralId }) {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();
  const visual = useMemo(() => getPlanet(id), [id]);
  const textures = useMemo(() => createPlanetTextures(visual), [visual]);

  // Canvas textures hold their own GPU-side image data — dispose explicitly
  // instead of relying on the mesh's default disposal, since `textures` is
  // recreated (not cached/shared) whenever `visual` changes.
  useEffect(() => {
    return () => {
      textures.map.dispose();
      textures.bumpMap.dispose();
    };
  }, [textures]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group rotation={[0.32, 0, 0.12]}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={textures.map}
            bumpMap={textures.bumpMap}
            bumpScale={0.015}
            roughness={visual.roughness}
            emissive={visual.emissive}
            emissiveIntensity={id === "sun" ? 0.8 : 0.15}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function PlanetOrb3D({
  planet = "moon",
  cycle = false,
  cycleMs = 5000,
  className,
  style,
}: {
  /**
   * Body to show. `moon`/`sun` are always pinned (rendered procedurally —
   * there's no GLB for either, so `cycle` never applies to them). Any of the
   * other 7 GLB-backed ids sets the cycle's start point when `cycle` is true.
   */
  planet?: PlanetId;
  /**
   * Auto-advance through the 9 GLB-backed planets. No-op when `planet` is
   * `moon`/`sun`. Defaults to OFF: cycling holds every visited model in
   * useGLTF's cache forever (`dispose={null}` below never releases them), so
   * a background left open walks the whole 21 MB of public/models — including
   * earth.glb at 12.9 MB and pluto.glb at 7 MB — and OOMs the Android WebView
   * renderer. Capacitor registers no WebViewListener, so `onRenderProcessGone`
   * returns false and Android kills the whole app process: the user sees the
   * app vanish. Only turn this on somewhere the models are small and the view
   * is short-lived.
   */
  cycle?: boolean;
  /** Milliseconds per planet (default 5000 = swap every 5s). */
  cycleMs?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  // `moon` and `sun` have no NASA glTF (BODIES only covers the other 7 —
  // mercury/venus/earth/mars/jupiter/saturn/uranus/neptune/pluto) — they're
  // rendered procedurally below instead. Previously `BODIES.findIndex` fell
  // through to -1 for these two, `Math.max(0, -1)` silently landed on index 0
  // (mercury), and — since `cycle` defaulted to true back then — the component
  // cycled through all 9 GLB bodies instead of showing the requested moon/sun
  // at all. Pin explicitly instead of ever falling into that cycle.
  const isProcedural = planet === "moon" || planet === "sun";

  const foundIndex = BODIES.findIndex((b) => b.id === planet);
  const start = foundIndex === -1 ? 0 : foundIndex;
  const [index, setIndex] = useState(start);

  // Advance to the next planet every `cycleMs` (5s by default). Procedural
  // bodies (moon/sun) are always pinned — there's no GLB list for them to
  // cycle through, and a caller asking for "moon" wants the moon, not a
  // slideshow of whatever BODIES happens to contain.
  useEffect(() => {
    if (!cycle || isProcedural) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % BODIES.length);
    }, cycleMs);
    return () => clearInterval(id);
  }, [cycle, cycleMs, isProcedural]);

  const body = BODIES[index];

  // Warm up the NEXT model while the current one is on screen, so the 5s swap is
  // seamless instead of flashing the fallback sphere each time. Skipped for
  // procedural bodies — nothing to preload, and it would otherwise fetch an
  // unrelated GLB (e.g. mercury.glb) on every "moon"/"sun" render.
  useEffect(() => {
    if (isProcedural) return;
    useGLTF.preload(BODIES[(index + 1) % BODIES.length].url);
  }, [index, isProcedural]);

  return (
    <Canvas
      className={className}
      style={style}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 2.7], fov: 45 }}
      onCreated={({ gl }) => {
        // WebGL only auto-restores a lost context if the "webglcontextlost"
        // listener calls preventDefault() — without it (the previous state:
        // no listener at all) a loss is permanent until the whole page
        // reloads. This is a safety net on top of the dispose={null} fix
        // above; a loss from unrelated memory pressure should now at least
        // recover instead of leaving a dead canvas (and, per the WebView bug
        // this surfaced, an unresponsive rest-of-page) behind.
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          console.warn("PlanetOrb3D: WebGL context lost, attempting to restore");
        });
        gl.domElement.addEventListener("webglcontextrestored", () => {
          console.warn("PlanetOrb3D: WebGL context restored");
        });
      }}
    >
      {/* UNCHANGED lighting rig ───────────────────────────────────────────── */}
      {/* soft fill so the night side blends into black instead of cutting hard */}
      <ambientLight intensity={0.35} />
      {/* key light from top-left, matching the hero composition */}
      <directionalLight position={[-3, 2.5, 3]} intensity={2.6} color="#fff6e0" />
      {/* faint warm rim from the opposite side */}
      <pointLight position={[3, -1, -2]} intensity={0.6} color="#dfb564" />

      {isProcedural ? (
        // moon/sun: no NASA glTF exists for either, so render the canvas-textured
        // procedural sphere instead of trying (and silently failing) to find a GLB.
        <ProceduralPlanet key={planet} id={planet as "moon" | "sun"} />
      ) : (
        // Error boundary (load failures) + Suspense (loading state) make each
        // external asset safe. Both are keyed by body.id so cycling resets state
        // cleanly. Suspense shows the tinted fallback sphere while the model loads.
        <AssetErrorBoundary key={body.id} fallback={<FallbackPlanet color={body.tint} />}>
          <Suspense fallback={<FallbackPlanet color={body.tint} />}>
            <PlanetModel url={body.url} />
          </Suspense>
        </AssetErrorBoundary>
      )}
    </Canvas>
  );
}
