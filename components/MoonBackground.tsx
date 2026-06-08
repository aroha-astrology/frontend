"use client";

import { motion } from "framer-motion";

export default function MoonBackground() {
  return (
    <>
      <motion.div
        animate={{ y: [-20, 20, -20] }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        className="fixed top-20 right-[-80px] w-56 h-56 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ y: [20, -20, 20] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
        className="fixed bottom-40 left-[-60px] w-40 h-40 rounded-full bg-yellow-400/5 blur-3xl pointer-events-none"
      />
    </>
  );
}
