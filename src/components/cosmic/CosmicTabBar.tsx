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
        className="flex items-center justify-around px-2.5 py-2 rounded-full border backdrop-blur-[14px]"
        style={{
          background: 'rgba(8,9,20,0.85)',
          borderColor: 'rgba(123,95,202,0.30)',
          boxShadow: '0 0 18px rgba(123,95,202,0.25), 0 -4px 24px rgba(0,0,0,0.55)',
        }}
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
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 9999,
                        background: '#7B5FCA', boxShadow: '0 0 14px rgba(123,95,202,0.55)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span
                    className="relative z-10 text-base leading-none select-none"
                    style={{ color: isActive ? '#fff' : 'rgba(106,106,138,0.80)' }}
                  >
                    {tab.glyph}
                  </span>
                </div>
                <span
                  className="text-[9px] tracking-[0.02em] whitespace-nowrap"
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#9B7FE8' : 'rgba(106,106,138,0.80)',
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
