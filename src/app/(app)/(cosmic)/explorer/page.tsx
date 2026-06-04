'use client';

import { MotionPage } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { GrahaExplorer } from '@/components/cosmic/GrahaExplorer';

export default function ExplorerPage() {
  return (
    <MotionPage className="flex flex-col min-h-[100dvh]">
      <CosmicHeader
        eyebrow="Planetary System"
        title="Graha Explorer"
        pillLabel="System Map"
        pillHref="/lore"
      />
      <GrahaExplorer />
    </MotionPage>
  );
}
