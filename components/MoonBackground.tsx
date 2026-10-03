"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { getPlanet, type PlanetId } from "./3d/planet-registry";
import { useLowEndDevice } from "@/hooks/useLowEndDevice";

// WebGL is client-only — never render the canvas on the server.
const PlanetOrb3D = dynamic(() => import("./3d/PlanetOrb3D"), { ssr: false });

/**
 * Hero background: one large celestial body, top-left.
 * Renders a real 3D sphere (procedural texture, slow spin) on capable devices,
 * and falls back to a pure-CSS orb on low-end hardware / reduced-motion.
 *
 * Switch the shown body by passing a different `planet` — the visuals come from
 * the shared planet-registry, so 3D and CSS stay consistent.
 */
export default function MoonBackground({
  planet = "moon",
}: {
  planet?: PlanetId;
}) {
  const lowEnd = useLowEndDevice();
  const v = getPlanet(planet);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The orb's shaded/dark side is drawn to blend into a black night sky. On the
  // light theme's ivory background that shading reads as a stray dark ring, so
  // light mode lifts the night side instead (brighter fill light in 3D, a warm
  // limb in the CSS orb) and keeps the planet itself clearly visible. Fading the
  // whole orb out instead left a flat, colorless grey disc.
  const isLight = mounted && resolvedTheme === "light";

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
        className="absolute -top-[80px] -left-[160px] w-[460px] h-[460px] transition-opacity duration-300"
        style={{
          opacity: 0.7,
          // Daytime-moon look: pale and warm, so the greeting text that sits
          // on top of the orb on phones stays readable.
          filter: isLight ? "sepia(0.25) contrast(0.85) brightness(1.45)" : undefined,
        }}
      >
        {/* Atmospheric halo that bleeds into the night sky */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 38%, ${v.glow} 0%, transparent 62%)`,
            filter: "blur(8px)",
          }}
        />

        {/* The orb — soft edge mask so the sphere blends into black, no hard cutout */}
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, #000 64%, rgba(0,0,0,0.7) 82%, transparent 97%)",
            maskImage:
              "radial-gradient(circle at 50% 50%, #000 64%, rgba(0,0,0,0.7) 82%, transparent 97%)",
          }}
        >
          {lowEnd ? (
            <CssOrb planet={planet} light={isLight} />
          ) : (
            <PlanetOrb3D planet={planet} light={isLight} className="!absolute inset-0" />
          )}
        </div>
      </motion.div>

      {/* Ambient glow on the opposite side */}
      <motion.div
        animate={{ opacity: isLight ? [0.1, 0.18, 0.1] : [0.25, 0.45, 0.25] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        className="absolute top-24 right-[-100px] w-72 h-72 rounded-full bg-gold/5 blur-[90px]"
      />
    </div>
  );
}

/** Pure-CSS fallback orb (no WebGL) — reads colors from the same registry. */
function CssOrb({ planet, light = false }: { planet: PlanetId; light?: boolean }) {
  const v = getPlanet(planet);
  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: light
          ? `radial-gradient(circle at 36% 32%, ${v.highlight} 0%, ${v.base} 40%, ${v.shadow} 100%)`
          : `radial-gradient(circle at 36% 32%, ${v.highlight} 0%, ${v.base} 30%, ${v.shadow} 70%, #14130f 95%)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-full mix-blend-multiply opacity-80"
        style={{
          background: [
            `radial-gradient(circle at 30% 28%, ${v.shadow} 0%, transparent 6%)`,
            `radial-gradient(circle at 52% 22%, ${v.shadow} 0%, transparent 5%)`,
            `radial-gradient(circle at 44% 44%, ${v.shadow} 0%, transparent 9%)`,
            `radial-gradient(circle at 24% 52%, ${v.shadow} 0%, transparent 7%)`,
            `radial-gradient(circle at 58% 60%, ${v.shadow} 0%, transparent 6%)`,
            `radial-gradient(circle at 38% 68%, ${v.shadow} 0%, transparent 8%)`,
          ].join(","),
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: light
            ? "radial-gradient(circle at 32% 28%, transparent 50%, rgba(120,95,60,0.18) 85%, rgba(120,95,60,0.3) 100%)"
            : "radial-gradient(circle at 32% 28%, transparent 40%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </div>
  );
}
