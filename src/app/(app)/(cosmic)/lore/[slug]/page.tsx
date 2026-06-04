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
        <p className="text-3xl mb-3">✦</p>
        <p className="text-sm font-bold text-text mb-1">Lore not found</p>
        <p className="text-xs text-text-secondary">This scroll does not exist in the archive.</p>
      </MotionPage>
    );
  }

  return (
    <MotionPage>
      <CosmicHeader
        title={article.title}
        backHref="/lore"
        backLabel="Lore"
      />
      <LoreArticleView article={article} />
    </MotionPage>
  );
}
