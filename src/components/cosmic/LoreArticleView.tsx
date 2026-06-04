import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/motion-primitives';
import { RelatedLoreList } from './RelatedLoreList';
import type { LoreArticle } from '@/data/cosmic/types';
import { getRelated } from '@/data/cosmic/lore';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';

interface LoreArticleViewProps {
  article: LoreArticle;
}

export function LoreArticleView({ article }: LoreArticleViewProps) {
  const related = getRelated(article.slug);
  const v = PLANET_VISUAL[article.heroPlanet];

  return (
    <article className="pb-8 relative overflow-hidden">
      {/* Purple + gold radial glows */}
      <div className="fixed top-20 -right-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: '#8b5cf6', filter: 'blur(100px)', opacity: 0.15, mixBlendMode: 'screen', zIndex: 0 }} />
      <div className="fixed bottom-40 -left-10 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: '#e5c100', filter: 'blur(80px)', opacity: 0.08, mixBlendMode: 'screen', zIndex: 0 }} />

      {/* Hero section: text left + planet graphic right */}
      <div className="relative px-6 pt-2 pb-10 flex flex-col z-10">
        {/* Planet graphic — top right */}
        <div
          className="absolute right-0 top-8"
          style={{
            width: 192, height: 192,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${v.color} 0%, ${v.color}99 40%, ${v.color}22 100%)`,
            border: '1px solid rgba(229,193,0,0.30)',
            boxShadow: '0 0 40px rgba(229,193,0,0.30)',
            transform: 'translateX(25%)',
            opacity: 0.90,
          }}
        />

        {/* Text content: occupies 2/3 width */}
        <div className="w-2/3 z-10 relative pr-4">
          <p className="text-sm italic mb-2" style={{ color: '#e5c100' }}>{article.category}…</p>
          <h2
            className="font-bold leading-tight mb-6 text-white drop-shadow-md"
            style={{
              fontFamily: 'var(--font-cinzel, serif)',
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              lineHeight: 1.05,
            }}
          >
            {article.title}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(226,213,248,0.80)', fontWeight: 300 }}>
            {article.excerpt}
          </p>
          {article.cta && (
            <Link
              href={article.cta.href}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium no-underline transition-all active:scale-[0.97]"
              style={{
                background: '#8b5cf6',
                color: '#fff',
                boxShadow: '0 10px 25px -5px rgba(139,92,246,0.30), 0 8px 10px -6px rgba(139,92,246,0.20)',
                border: '1px solid rgba(229,193,0,0.30)',
              }}
            >
              {article.cta.label}
            </Link>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 space-y-4 relative z-10">
        {article.sections.map((section, i) => (
          <ScrollReveal key={i}>
            <div
              className="cd-glass-card p-5"
            >
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: '#fff', fontFamily: 'var(--font-cinzel, serif)' }}
              >
                {section.heading}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: '#a8a8a8' }}>
                {section.body}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <RelatedLoreList articles={related} />
    </article>
  );
}
