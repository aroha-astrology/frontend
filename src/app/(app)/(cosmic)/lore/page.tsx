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
    <MotionPage className="pb-6">
      <CosmicHeader eyebrow="Vedic Astrology" title="Forbidden Lore" />

      <LoreSearchBar value={query} onChange={setQuery} />

      {/* Category filter pills */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto hide-scrollbar pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className="shrink-0 text-[10px] font-semibold tracking-wide px-3 py-1.5 rounded-full border transition-all duration-150"
            style={{
              WebkitTapHighlightColor: 'transparent',
              background: category === cat ? '#7B5FCA' : 'rgba(15,16,32,0.75)',
              color: category === cat ? '#fff' : 'rgba(106,106,138,0.80)',
              borderColor: category === cat ? '#7B5FCA' : 'rgba(123,95,202,0.20)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-4 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">✦</p>
            <p className="text-sm text-text-secondary">No lore found for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <StaggerList className="space-y-3">
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
