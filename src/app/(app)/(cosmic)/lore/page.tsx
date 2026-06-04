'use client';

import { useState, useMemo } from 'react';
import { MotionPage, StaggerList, StaggerItem } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { LoreSearchBar } from '@/components/cosmic/LoreSearchBar';
import { LoreResultCard } from '@/components/cosmic/LoreResultCard';
import { LORE_ARTICLES } from '@/data/cosmic/lore';

const CATEGORIES = ['All', 'Doshas', 'Dashas', 'Nakshatras', 'Yogas', 'Grahas', 'Basics'] as const;

export default function LorePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return LORE_ARTICLES.filter(a => {
      const matchesCategory = category === 'All' || a.category === category;
      const matchesQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <MotionPage className="pb-8">
      <CosmicHeader title="Forbidden Lore" />

      <LoreSearchBar value={query} onChange={setQuery} />

      {/* Category filter pills */}
      <div className="flex gap-2 px-6 mb-5 overflow-x-auto hide-scrollbar pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="shrink-0 text-[10px] font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-150"
            style={{
              WebkitTapHighlightColor: 'transparent',
              background: category === cat ? '#e5c100' : 'rgba(26,28,28,0.80)',
              color: category === cat ? '#121414' : 'rgba(168,168,168,0.80)',
              borderColor: category === cat ? '#e5c100' : '#37393a',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2" style={{ color: '#e5c100' }}>✦</p>
            <p className="text-sm" style={{ color: '#a8a8a8' }}>No lore found for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <StaggerList className="flex flex-col gap-4">
            {filtered.map(article => (
              <StaggerItem key={article.slug}>
                <LoreResultCard article={article} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </MotionPage>
  );
}
