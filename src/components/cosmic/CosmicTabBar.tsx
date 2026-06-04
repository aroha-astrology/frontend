'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const TABS = [
  { label: 'Explorer', href: '/explorer',       glyph: '◎' },
  { label: 'Lore',     href: '/lore',            glyph: '✦' },
  { label: 'Profile',  href: '/cosmic-profile',  glyph: '⬡' },
] as const;

export function CosmicTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[52] md:hidden"
      style={{ width: 'calc(100% - 32px)', maxWidth: 448 }}
    >
      <div
        className="flex items-center justify-around px-2.5 py-2 rounded-full border border-border shadow-[0_0_18px_rgba(212,175,55,0.30),0_-4px_24px_rgba(0,0,0,0.55)] backdrop-blur-[14px]"
        style={{ background: 'var(--glass-3-bg)' }}
      >
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 justify-center no-underline"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="flex flex-col items-center gap-0.5 flex-1 py-0.5">
                <div className="relative flex h-10 w-12 items-center justify-center rounded-full transition-all duration-200">
                  {isActive && (
                    <motion.div
                      layoutId="cosmicTabPill"
                      className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#D4AF37,#B8893F)] shadow-[0_0_14px_rgba(242,202,80,0.55)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className="relative z-10 text-base leading-none select-none"
                    style={{ color: isActive ? 'var(--bg)' : 'var(--text-muted)' }}
                  >
                    {tab.glyph}
                  </span>
                </div>
                <span
                  className="text-[9px] tracking-[0.02em] whitespace-nowrap"
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
