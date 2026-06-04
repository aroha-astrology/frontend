import Link from 'next/link';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';
import type { LoreArticle } from '@/data/cosmic/types';

interface RelatedLoreListProps {
  articles: LoreArticle[];
}

export function RelatedLoreList({ articles }: RelatedLoreListProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-5">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-primary/70 uppercase mb-3 px-4">
        Related Lore
      </p>
      <div className="space-y-2 px-4">
        {articles.map(article => {
          const v = PLANET_VISUAL[article.heroPlanet];
          return (
            <Link
              key={article.slug}
              href={`/lore/${article.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/40 no-underline transition-all hover:border-accent/30 active:scale-[0.98]"
              style={{ background: 'var(--glass-3-bg)', WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{
                  background: `${v.color}22`,
                  border: `1px solid ${v.color}44`,
                }}
              >
                {article.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">{article.title}</p>
                <p className="text-[9px] text-text-muted mt-0.5">{article.category} · {article.readMinutes} min</p>
              </div>
              <span className="text-text-muted text-xs shrink-0">›</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
