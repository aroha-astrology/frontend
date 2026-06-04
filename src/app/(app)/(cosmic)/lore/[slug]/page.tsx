'use client';

import { useParams } from 'next/navigation';
import { MotionPage } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { LoreArticleView } from '@/components/cosmic/LoreArticleView';
import { getLoreBySlug } from '@/data/cosmic/lore';

export default function LoreDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = getLoreBySlug(slug);

  if (!article) {
    return (
      <MotionPage className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-3xl mb-3" style={{ color: '#e5c100' }}>✦</p>
        <p className="text-sm font-bold" style={{ color: '#e2e2e2' }}>Lore not found</p>
        <p className="text-xs mt-1" style={{ color: '#a1a1aa' }}>This scroll does not exist in the archive.</p>
      </MotionPage>
    );
  }

  return (
    <MotionPage>
      <CosmicHeader
        title=""
        backHref="/lore"
        backLabel="Lore"
        pillLabel="Lore Page"
        pillStyle="purple"
      />
      <LoreArticleView article={article} />
    </MotionPage>
  );
}
