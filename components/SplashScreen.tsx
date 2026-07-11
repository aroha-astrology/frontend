"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
import { useTheme } from "next-themes";
import ZodiacSilhouette from "./ZodiacSilhouette";
import BrandLogo from "./ui/BrandLogo";

const SPLASH_SHOWN_KEY = "aroha_splash_shown";

export default function SplashScreen({ onDone }: { onDone?: () => void } = {}) {
  const [visible, setVisible] = useState(true);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Default to the dark splash until the theme resolves client-side, matching
  // the app's default — avoids a flash of the wrong background on first paint.
  const isLight = mounted && resolvedTheme === "light";

  useLayoutEffect(() => {
    // Only play the full multi-second splash once per browser session —
    // repeat visits to "/" (e.g. tapping Home in the bottom nav) shouldn't
    // replay the logo animation every time. This must run as a layout
    // effect (before paint), not a regular effect — otherwise the initial
    // `visible=true` render still paints for one frame, flashing the logo
    // over the home screen on every repeat visit.
    if (sessionStorage.getItem(SPLASH_SHOWN_KEY) === "1") {
      setVisible(false);
      onDone?.();
      return;
    }
    // Increase duration slightly so the user can enjoy the premium loading animation
    const t = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(SPLASH_SHOWN_KEY, "1");
      onDone?.();
    }, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: isLight ? "#FAF7F0" : "#05060A" }}
        >
          {/* Subtle star particle effect behind the wheel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent opacity-50" />

          {/* Massive rotating Zodiac Wheel in the background — screen-blend
              brightens against the dark splash; on the light splash that blend
              mode washes it out to nothing, so switch to multiply there. */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            className={`absolute flex items-center justify-center pointer-events-none ${
              isLight ? "opacity-15 mix-blend-multiply" : "opacity-20 mix-blend-screen"
            }`}
          >
            <ZodiacSilhouette src="/zodiac_wheel.png" className="w-[800px] h-[800px] text-gold drop-shadow-[0_0_15px_rgba(223,181,100,0.3)]" />
          </motion.div>

          {/* Central Logo and Branding */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="z-20"
            >
              <BrandLogo size={250} priority className="drop-shadow-[0_0_20px_rgba(223,181,100,0.6)]" />
            </motion.div>
          </div>

          {/* Ambient Glows to create depth */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
