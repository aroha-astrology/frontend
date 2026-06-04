import Link from 'next/link';
import { PLANET_VISUAL } from '@/components/3d/planet-registry';
import type { LoreArticle } from '@/data/cosmic/types';

interface LoreResultCardProps {
  article: LoreArticle;
}

const CATEGORY_COLOR: Record<string, string> = {
  Doshas:    '#FF6B55',
  Dashas:    '#F2CA50',
  Nakshatras:'#C0C8D8',
  Yogas:     '#5DD4A4',
  Grahas:    '#F091B8',
  Basics:    '#9CA8BC',
};

export function LoreResultCard({ article }: LoreResultCardProps) {
  const v = PLANET_VISUAL[article.heroPlanet];
  const catColor = CATEGORY_COLOR[article.category] ?? 'var(--accent)';

  return (
    <Link
      href={`/lore/${article.slug}`}
      className="block no-underline"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="flex items-start gap-3 p-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
        style={{ background: 'rgba(15,16,32,0.70)', border: '1px solid rgba(123,95,202,0.18)', backdropFilter: 'blur(8px)' }}
      >
        {/* Icon orb */}
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${v.color}55 0%, ${v.color}22 100%)`,
            border: `1px solid ${v.color}44`,
          }}
        >
          {article.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-text truncate">{article.title}</p>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full"
              style={{ color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}33` }}
            >
              {article.category}
            </span>
            <span className="text-[9px] text-text-muted">{article.readMinutes} min read</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">{article.excerpt}</p>
        </div>

        <span className="shrink-0 text-text-muted text-xs self-center">›</span>
      </div>
    </Link>
  );
}
