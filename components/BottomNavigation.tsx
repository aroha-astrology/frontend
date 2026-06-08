"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, ScrollText, Heart, Flame } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/ai-chat", icon: MessageCircle, label: "AI Chat" },
  { href: "/kundli", icon: ScrollText, label: "Kundli" },
  { href: "/compatibility", icon: Heart, label: "Match" },
  { href: "/remedies", icon: Flame, label: "Remedies" },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-gold" : "text-[var(--text-muted)]"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
