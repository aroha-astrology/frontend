"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScrollText, Heart, User } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/kundli", icon: ScrollText, label: "Kundli" },
  { href: "/compatibility", icon: Heart, label: "Match" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: "rgba(5,6,10,0.82)",
        borderColor: "var(--border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto relative">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                active ? "text-gold" : "text-[var(--text-muted)]"
              )}
            >
              {/* Sliding underline indicator */}
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "var(--gold)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
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
