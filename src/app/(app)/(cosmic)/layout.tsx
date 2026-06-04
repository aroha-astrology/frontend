import './cosmic.css';
import { RuneField } from '@/components/cosmic/RuneField';
import { CosmicTabBar } from '@/components/cosmic/CosmicTabBar';

export default function CosmicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RuneField />
      <div
        className="cosmic-theme relative mx-auto w-full"
        style={{ maxWidth: 480, minHeight: '100dvh', paddingBottom: 96, zIndex: 1, background: '#080910' }}
      >
        {children}
      </div>
      <CosmicTabBar />
    </>
  );
}
