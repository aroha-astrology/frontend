import Link from 'next/link';
import type { LoreArticle } from '@/data/cosmic/types';

interface RelatedLoreListProps {
  articles: LoreArticle[];
}

export function RelatedLoreList({ articles }: RelatedLoreListProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-6 px-6 relative z-10">
      <p
        className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3"
        style={{ color: 'rgba(229,193,0,0.60)' }}
      >
        Related Lore
      </p>
      <div className="flex flex-col gap-3">
        {articles.map(article => (
          <Link
            key={article.slug}
            href={`/lore/${article.slug}`}
            className="cd-glass-card flex items-center gap-3 p-3 no-underline transition-all active:scale-[0.98]"
            style={{ borderRadius: '0.75rem', WebkitTapHighlightColor: 'transparent' }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(18,20,20,0.50)', border: '1px solid #37393a', color: '#e5c100' }}
            >
              {article.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#f4f4f4', fontFamily: 'var(--font-playfair, var(--font-cinzel, serif))' }}>
                {article.title}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: '#a8a8a8' }}>{article.category} · {article.readMinutes} min</p>
            </div>
            <span style={{ color: '#a1a1aa', fontSize: 12 }}>›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
