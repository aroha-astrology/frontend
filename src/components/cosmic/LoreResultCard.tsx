import Link from 'next/link';
import { BookOpen, Swords, ScrollText, Sparkles, Flame, Star, Orbit } from 'lucide-react';
import type { LoreArticle } from '@/data/cosmic/types';

interface LoreResultCardProps {
  article: LoreArticle;
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  Doshas:    Flame,
  Dashas:    Orbit,
  Nakshatras: Star,
  Yogas:     Sparkles,
  Grahas:    Swords,
  Basics:    BookOpen,
};

export function LoreResultCard({ article }: LoreResultCardProps) {
  const Icon = CATEGORY_ICON[article.category] ?? ScrollText;

  return (
    <Link
      href={`/lore/${article.slug}`}
      className="block no-underline"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <article
        className="cd-glass-card flex gap-4 items-start p-4 transition-all active:scale-[0.98]"
        style={{ borderRadius: '1rem' }}
      >
        {/* Gold icon box */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: 'rgba(18,20,20,0.50)',
            border: '1px solid #37393a',
            color: '#e5c100',
          }}
        >
          <Icon size={20} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <h2
            className="text-base font-semibold mb-1 leading-snug"
            style={{ color: '#f4f4f4', fontFamily: 'var(--font-playfair, var(--font-cinzel, serif))' }}
          >
            {article.title}
          </h2>
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#a8a8a8' }}>
            {article.excerpt}
          </p>
        </div>
      </article>
    </Link>
  );
}
