"use client";

import type { ReactNode } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import LanguagePicker from "@/components/LanguagePicker";
import ThemeSwitch from "@/components/ThemeSwitch";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="cosmic-bg min-h-screen relative overflow-hidden text-foreground">
      <ParticleBackground />

      {/* Top bar: language + theme — always visible */}
      <div className="relative z-20 flex justify-end items-center gap-2 px-5 pt-5">
        <LanguagePicker />
        <ThemeSwitch />
      </div>

      {children}
    </div>
  );
}
