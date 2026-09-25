// Palette for the 3D explorer. Calm, architectural, readable on the dark app:
// ivory walls with dark cut caps (the classic plan "poché"), floors by use.

export const WALL = "#f1ece2";
export const WALL_VASTU = "#8d8a95";
export const CAP = "#26252b";
export const CAP_SELECTED = "#D4AF37";
export const SLAB = "#bfb29c";
export const SLAB_VASTU = "#4a4753";
export const GLASS = "#9fe7f0";

/** Floor finish by room type. */
export function floorColor(type: string): string {
  switch (type) {
    case "kitchen":
    case "bathroom":
    case "entrance":
    case "water_tank":
      return "#c9c4b8"; // tile
    case "puja_room":
      return "#dccda9"; // marble
    case "parking":
    case "stairs":
    case "store":
      return "#8f8c86"; // concrete
    case "balcony":
      return "#8a6a4a"; // deck
    default:
      return "#a87a4f"; // warm wood
  }
}

export const RATING_TINT = {
  ideal: "#21D88A",
  acceptable: "#A3E635",
  poor: "#F3C74B",
  harmful: "#FF6767",
  center: "#D4AF37",
} as const;
