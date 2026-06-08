// Shared Framer Motion animation constants used across the app

export const MOON_FLOAT = {
  animate: { y: [0, -15, 0] },
  transition: { duration: 8, repeat: Infinity, ease: "easeInOut" as const }
}

export const LOGO_SHIMMER = {
  animate: { backgroundPosition: ["200% center", "-200% center"] },
  transition: { duration: 3, repeat: Infinity, ease: "linear" as const }
}

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: "easeInOut" as const }
}

export const FADE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const }
}

export const STAGGER_CONTAINER = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export const SCALE_IN = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: "easeOut" as const }
}
