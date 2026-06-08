// Single source of truth for planet visuals.
// Both the 3D sphere and the CSS fallback read from here, so they stay consistent.

export type PlanetId =
  | "moon"
  | "sun"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "rahu"
  | "ketu";

export type TextureStyle = "cratered" | "gaseous" | "fiery";

export interface PlanetVisual {
  id: PlanetId;
  name: string;
  /** Dominant surface tone */
  base: string;
  /** Darker tone for craters / bands / shadow side */
  shadow: string;
  /** Light tone for highlights / lit rims */
  highlight: string;
  /** Outer atmospheric halo color (rgba) */
  glow: string;
  /** Emissive tint applied to the material so the orb never goes fully black */
  emissive: string;
  /** 0 = mirror, 1 = matte */
  roughness: number;
  /** How the procedural texture is drawn */
  texture: TextureStyle;
}

export const PLANETS: Record<PlanetId, PlanetVisual> = {
  moon: {
    id: "moon",
    name: "Moon",
    base: "#f5efe2",
    shadow: "#b8a89e",
    highlight: "#ffffff",
    glow: "rgba(223,181,100,0.35)",
    emissive: "#3a3833",
    roughness: 0.95,
    texture: "cratered",
  },
  sun: {
    id: "sun",
    name: "Sun",
    base: "#ffb347",
    shadow: "#d9731a",
    highlight: "#fff0c2",
    glow: "rgba(255,170,60,0.35)",
    emissive: "#ff8c00",
    roughness: 0.6,
    texture: "fiery",
  },
  mercury: {
    id: "mercury",
    name: "Mercury",
    base: "#b8b2a7",
    shadow: "#6b665d",
    highlight: "#e8e2d6",
    glow: "rgba(200,190,170,0.2)",
    emissive: "#332f2a",
    roughness: 0.95,
    texture: "cratered",
  },
  venus: {
    id: "venus",
    name: "Venus",
    base: "#e6c98a",
    shadow: "#b08a3e",
    highlight: "#fff3d0",
    glow: "rgba(230,200,120,0.28)",
    emissive: "#4a3a1a",
    roughness: 0.7,
    texture: "gaseous",
  },
  mars: {
    id: "mars",
    name: "Mars",
    base: "#c1502e",
    shadow: "#7a2d18",
    highlight: "#e8895f",
    glow: "rgba(200,80,40,0.25)",
    emissive: "#3d160b",
    roughness: 0.9,
    texture: "cratered",
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    base: "#d8b48a",
    shadow: "#9c7045",
    highlight: "#f3ddc0",
    glow: "rgba(216,180,138,0.25)",
    emissive: "#3a2c1c",
    roughness: 0.75,
    texture: "gaseous",
  },
  saturn: {
    id: "saturn",
    name: "Saturn",
    base: "#e3cf9e",
    shadow: "#a8895a",
    highlight: "#f7ecc9",
    glow: "rgba(227,207,158,0.25)",
    emissive: "#3d3320",
    roughness: 0.75,
    texture: "gaseous",
  },
  rahu: {
    id: "rahu",
    name: "Rahu",
    base: "#4a4a55",
    shadow: "#1f1f26",
    highlight: "#7a7a8a",
    glow: "rgba(120,120,150,0.2)",
    emissive: "#14141a",
    roughness: 0.95,
    texture: "cratered",
  },
  ketu: {
    id: "ketu",
    name: "Ketu",
    base: "#5c4a3a",
    shadow: "#2e231b",
    highlight: "#8a7058",
    glow: "rgba(150,110,80,0.2)",
    emissive: "#1a130d",
    roughness: 0.95,
    texture: "cratered",
  },
};

export const getPlanet = (id: PlanetId): PlanetVisual => PLANETS[id];
