'use client';

import { MotionPage, FadeIn } from '@/components/ui/motion-primitives';
import { CosmicHeader } from '@/components/cosmic/CosmicHeader';
import { ProfileOrb } from '@/components/cosmic/ProfileOrb';
import { DestinyStatus } from '@/components/cosmic/DestinyStatus';
import { LineageProfile } from '@/components/cosmic/LineageProfile';
import { DEMO_PROFILE } from '@/data/cosmic/profile';

export default function CosmicProfilePage() {
  const profile = DEMO_PROFILE;

  return (
    <MotionPage className="pb-6">
      <CosmicHeader
        eyebrow="Vedic Astrology"
        title="Astro Profile"
      />

      <FadeIn delay={0.05}>
        <ProfileOrb planet={profile.currentMahadasha.planet} />
      </FadeIn>

      <FadeIn delay={0.12}>
        <DestinyStatus profile={profile} />
      </FadeIn>

      <FadeIn delay={0.2}>
        <LineageProfile profile={profile} />
      </FadeIn>
    </MotionPage>
  );
}
