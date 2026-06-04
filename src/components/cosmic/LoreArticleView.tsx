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
          <span className="text-[9px] font-semibold tracking-[0.2em] uppercase text-primary/70">
            {article.category}
          </span>
          <span className="text-[9px] text-text-muted">· {article.readMinutes} min read</span>
        </div>
        <h1 className="font-[family-name:var(--font-serif)] text-xl font-bold text-text leading-snug j-text-gold">
          {article.title}
        </h1>
        <p className="mt-1.5 text-[11px] text-text-secondary leading-relaxed">{article.excerpt}</p>
      </div>

      {/* Sections */}
      <div className="px-4 space-y-4">
        {article.sections.map((section, i) => (
          <ScrollReveal key={i}>
            <div
              className="rounded-2xl border border-border/40 p-4"
              style={{ background: 'var(--glass-3-bg)', backdropFilter: 'blur(8px)' }}
            >
              <h2 className="font-[family-name:var(--font-serif)] text-sm font-bold text-text mb-2">
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold no-underline transition-all active:scale-[0.97] shadow-[0_0_20px_rgba(212,175,55,0.30)]"
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #B8893F)',
              color: '#11131A',
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
