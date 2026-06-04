'use client';

import { MotionPage } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { GrahaExplorer } from '@/components/cosmic/GrahaExplorer';

export default function ExplorerPage() {
  return (
    <MotionPage>
      <CosmicHeader
        eyebrow="Vedic Astrology"
        title="Graha Explorer"
      />
      <GrahaExplorer />
    </MotionPage>
  );
}
