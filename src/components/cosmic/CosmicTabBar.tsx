'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Telescope, ScrollText, User } from 'lucide-react';

const TABS = [
  { label: 'Explorer', href: '/explorer',      Icon: Telescope },
  { label: 'Lore',     href: '/lore',           Icon: ScrollText },
  { label: 'Profile',  href: '/cosmic-profile', Icon: User },
] as const;

export function CosmicTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[52] w-full"
      style={{ maxWidth: 480 }}
    >
      <div
        className="flex justify-around items-center h-20 px-2 border-t backdrop-blur-lg"
        style={{
          background: 'rgba(18,20,20,0.92)',
          borderColor: 'rgba(55,57,58,1)',
        }}
      >
        {TABS.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 gap-1 no-underline pb-2"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.5}
                style={{ color: isActive ? '#e5c100' : 'rgba(161,161,170,0.70)' }}
              />
              <span
                className="text-[10px] font-medium tracking-wide"
                style={{ color: isActive ? '#e5c100' : 'rgba(161,161,170,0.60)' }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-12 h-0.5 rounded-full"
                  style={{ background: '#e5c100', boxShadow: '0 0 8px rgba(229,193,0,0.6)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
      {/* iOS home indicator */}
      <div
        className="flex justify-center pb-2"
        style={{ background: 'rgba(18,20,20,0.92)' }}
      >
        <div className="w-1/3 h-1 bg-white/30 rounded-full" />
      </div>
    </nav>
  );
}
