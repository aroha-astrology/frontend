"use client";

import { Menu, Crown } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 border-b backdrop-blur-xl"
      style={{ background: "rgba(5,6,10,0.85)", borderColor: "var(--border)" }}
    >
      <button
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
        style={{ color: "var(--text-muted)" }}
        aria-label="Menu"
      >
        <Menu size={22} />
      </button>

      <div className="text-center">
        <p className="font-display font-bold text-gold tracking-[0.25em] text-base leading-none">
          AROHO
        </p>
        <p className="font-display text-[9px] tracking-[0.35em] text-[var(--text-muted)] leading-none mt-0.5">
          ASTROLOGY
        </p>
      </div>

      <button
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
        style={{ color: "var(--gold)" }}
        aria-label="Premium"
      >
        <Crown size={20} />
      </button>
    </header>
  );
}
