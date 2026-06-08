"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GiLotusFlower } from "react-icons/gi";
import ZodiacSilhouette from "./ZodiacSilhouette";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Increase duration slightly so the user can enjoy the premium loading animation
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#05060A]"
        >
          {/* Subtle star particle effect behind the wheel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/5 via-transparent to-transparent opacity-50" />

          {/* Massive rotating Zodiac Wheel in the background */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            className="absolute flex items-center justify-center opacity-20 mix-blend-screen pointer-events-none"
          >
            <ZodiacSilhouette src="/zodiac_wheel.png" className="w-[800px] h-[800px] text-gold drop-shadow-[0_0_15px_rgba(223,181,100,0.3)]" />
          </motion.div>

          {/* Central Logo and Branding */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing Lotus Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="mb-4 z-20"
            >
              <GiLotusFlower className="w-16 h-16 text-gold drop-shadow-[0_0_20px_rgba(223,181,100,0.6)]" />
            </motion.div>

            {/* Archo Text Fade In */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="text-[32px] font-normal tracking-[0.3em] text-gold font-display leading-none"
            >
              ARCHO
            </motion.h1>

            {/* Subtitle Fade In */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-3 text-[10px] tracking-[0.5em] text-white/70 uppercase font-light"
            >
              Astrology
            </motion.p>
          </div>
          
          {/* Ambient Glows to create depth */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-[100px] pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
