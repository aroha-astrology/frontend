'use client';

import { MotionPage } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { ProfileOrb } from '@/components/cosmic/ProfileOrb';
import { DestinyStatus } from '@/components/cosmic/DestinyStatus';
import { LineageProfile } from '@/components/cosmic/LineageProfile';
import { DEMO_PROFILE } from '@/data/cosmic/profile';

export default function CosmicProfilePage() {
  const profile = DEMO_PROFILE;

  return (
    <MotionPage className="flex flex-col overflow-y-auto hide-scrollbar pb-8">
      <CosmicHeader title="Astro Profile" />
      <ProfileOrb />
      <DestinyStatus profile={profile} />
      <LineageProfile profile={profile} />
    </MotionPage>
  );
}
