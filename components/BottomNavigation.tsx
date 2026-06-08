"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScrollText, Star, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const regularTabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/kundli", icon: ScrollText, label: "Kundli" },
  { href: "/horoscope", icon: Star, label: "Horoscope" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-4 px-4">
      <div
        className="max-w-sm mx-auto flex items-center justify-between px-2 h-16 rounded-2xl"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background: "rgba(11, 13, 18, 0.85)",
          border: "1px solid rgba(212, 175, 55, 0.15)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.05)",
        }}
      >
        {/* Home & Kundli */}
        {regularTabs.slice(0, 2).map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 w-14 relative"
              style={{ color: active ? "var(--gold)" : "var(--text-muted)" }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute w-14 h-12 rounded-xl"
                  style={{
                    background: "rgba(212, 175, 55, 0.12)",
                    top: "50%",
                    left: "50%",
                    x: "-50%",
                    y: "-50%",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}

        {/* Ask AI — center special button */}
        <Link
          href="/ai-chat"
          className="flex flex-col items-center justify-center gap-0.5"
        >
          <motion.div
            className="flex items-center justify-center w-14 h-14 rounded-full"
            style={{
              background:
                "linear-gradient(135deg, #D4AF37 0%, #F4D675 50%, #D4AF37 100%)",
              boxShadow:
                "0 0 24px rgba(212,175,55,0.5), 0 4px 12px rgba(0,0,0,0.4)",
              marginTop: -24,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles size={22} color="#05060A" />
          </motion.div>
          <span
            className="text-[9px]"
            style={{ color: "var(--text-muted)", marginTop: 2 }}
          >
            Ask AI
          </span>
        </Link>

        {/* Horoscope & Profile */}
        {regularTabs.slice(2).map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 w-14 relative"
              style={{ color: active ? "var(--gold)" : "var(--text-muted)" }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute w-14 h-12 rounded-xl"
                  style={{
                    background: "rgba(212, 175, 55, 0.12)",
                    top: "50%",
                    left: "50%",
                    x: "-50%",
                    y: "-50%",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
