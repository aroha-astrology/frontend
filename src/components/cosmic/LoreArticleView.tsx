import Link from 'next/link';
import { Planet3DHero } from '@/components/3d/Planet3DHero';
import { ScrollReveal } from '@/components/ui/motion-primitives';
import { RelatedLoreList } from './RelatedLoreList';
import type { LoreArticle } from '@/data/cosmic/types';
import { getRelated } from '@/data/cosmic/lore';

interface LoreArticleViewProps {
  article: LoreArticle;
}

export function LoreArticleView({ article }: LoreArticleViewProps) {
  const related = getRelated(article.slug);

  return (
    <article className="pb-8">
      {/* Hero planet */}
      <Planet3DHero planet={article.heroPlanet} height={240} withStars />

      {/* Title area */}
      <div className="px-4 mt-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{article.icon}</span>
          <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(155,127,232,0.70)' }}>
            {article.category}
          </span>
          <span className="text-[9px] text-text-muted">· {article.readMinutes} min read</span>
        </div>
        <h1 className="text-2xl font-bold leading-snug" style={{ color: '#F0F0FF' }}>
          {article.title}
        </h1>
        <p className="mt-1.5 text-[11px] text-text-secondary leading-relaxed">{article.excerpt}</p>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-4">
        {article.sections.map((section, i) => (
          <ScrollReveal key={i}>
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(15,16,32,0.70)', border: '1px solid rgba(123,95,202,0.18)', backdropFilter: 'blur(8px)' }}
            >
              <h2 className="text-sm font-bold mb-2" style={{ color: '#F0F0FF' }}>
                {section.heading}
              </h2>
              <p className="text-[11px] text-text-secondary leading-relaxed">{section.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* CTA */}
      {article.cta && (
        <div className="px-4 mt-6 flex justify-center">
          <Link
            href={article.cta.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-all active:scale-[0.97]"
            style={{
              background: '#7B5FCA',
              color: '#fff',
              boxShadow: '0 0 20px rgba(123,95,202,0.40)',
            }}
          >
            {article.cta.label} ›
          </Link>
        </div>
      )}

      {/* Related lore */}
      <RelatedLoreList articles={related} />
    </article>
  );
}
