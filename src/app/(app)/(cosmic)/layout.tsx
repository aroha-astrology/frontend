import './cosmic.css';
import { Stardust } from '@/components/cosmic/Stardust';
import { CosmicTabBar } from '@/components/cosmic/CosmicTabBar';

export default function CosmicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Stardust />
      <div
        className="cosmic-theme relative mx-auto w-full"
        style={{
          maxWidth: 480,
          minHeight: '100dvh',
          paddingBottom: 96,
          zIndex: 1,
          background: 'radial-gradient(circle at top right, #1a1c1c, #121414)',
        }}
      >
        {children}
      </div>
      <CosmicTabBar />
    </>
  );
}
