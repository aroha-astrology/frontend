'use client';

import Link from 'next/link';
import { Telescope, ScrollText, User } from 'lucide-react';
import { Stardust } from '@/components/cosmic/Stardust';
import { Planet3DHero } from '@/components/3d/Planet3DHero';

const NAV_CARDS = [
  {
    href: '/explorer',
    icon: Telescope,
    title: 'Graha Explorer',
    desc: 'Journey through the nine sacred planets',
  },
  {
    href: '/lore',
    icon: ScrollText,
    title: 'Forbidden Lore',
    desc: 'Ancient knowledge, decoded',
  },
  {
    href: '/cosmic-profile',
    icon: User,
    title: 'Astro Profile',
    desc: 'Your destiny, charted',
  },
] as const;

export default function HomePage() {
  return (
    <>
      {/* Stardust background */}
      <Stardust />

      {/* Page content */}
      <div
        className="relative min-h-screen flex flex-col items-center overflow-y-auto"
        style={{
          background: 'radial-gradient(circle at top right, #1a1c1c, #121414)',
          zIndex: 1,
          color: '#e2e2e2',
          fontFamily: 'Inter, sans-serif',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Status bar placeholder */}
        <div className="w-full flex justify-between items-center px-6 pt-12 pb-0 text-xs font-semibold" style={{ color: '#e2e2e2' }}>
          <span>9:41</span>
        </div>

        {/* Hero section */}
        <section className="w-full px-6 pt-6 pb-4 flex flex-col items-start">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2 italic" style={{ color: 'rgba(229,193,0,0.70)' }}>
            Vedic Astrology · AI-Powered
          </p>
          <h1
            className="text-5xl font-bold leading-none mb-3"
            style={{ fontFamily: 'var(--font-playfair, var(--font-cinzel, serif))', color: '#fff' }}
          >
            Aroha
          </h1>
          <p className="text-base leading-relaxed mb-8" style={{ color: '#a1a1aa', fontWeight: 300 }}>
            Ancient wisdom meets modern insight. Your personal Jyotish companion.
          </p>
        </section>

        {/* Hero planet */}
        <div className="w-full flex justify-center mb-6" style={{ height: 220 }}>
          <div className="w-full max-w-[320px]">
            <Planet3DHero planet="Jupiter" height={220} withStars />
          </div>
        </div>

        {/* CTAs */}
        <section className="w-full px-6 flex flex-col gap-3 mb-8">
          <Link
            href="/explorer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold no-underline transition-all active:scale-[0.97]"
            style={{
              background: '#e5c100',
              color: '#3a3000',
              boxShadow: '0 0 24px rgba(229,193,0,0.30)',
            }}
          >
            <Telescope size={18} strokeWidth={2} />
            Enter the Cosmos
          </Link>
          <Link
            href="/lore"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold no-underline transition-all active:scale-[0.97]"
            style={{
              background: 'rgba(229,193,0,0.08)',
              color: '#e5c100',
              border: '1px solid rgba(229,193,0,0.30)',
            }}
          >
            <ScrollText size={18} strokeWidth={1.5} />
            Explore Lore
          </Link>
        </section>

        {/* Nav cards */}
        <section className="w-full px-6 pb-24">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'rgba(229,193,0,0.60)' }}>
            Quick Access
          </p>
          <div className="flex flex-col gap-3">
            {NAV_CARDS.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="no-underline flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(55,57,58,0.40)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(229,193,0,0.12)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229,193,0,0.10)', border: '1px solid rgba(229,193,0,0.20)', color: '#e5c100' }}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f4f4f4', fontFamily: 'var(--font-playfair, var(--font-cinzel, serif))' }}>
                    {title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#a1a1aa' }}>{desc}</p>
                </div>
                <span className="ml-auto" style={{ color: '#a1a1aa', fontSize: 14 }}>›</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
