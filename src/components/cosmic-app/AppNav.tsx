'use client';

import { Home, MessageCircle, Heart } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home',  label: 'Home',    Icon: Home },
  { id: 'chat',  label: 'AI Chat', Icon: MessageCircle },
  { id: 'match', label: 'Match',   Icon: Heart },
] as const;

type TabId = typeof NAV_ITEMS[number]['id'];

interface AppNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function AppNav({ activeTab, onTabChange }: AppNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md ca-bottom-nav px-6 py-4 flex justify-between items-center rounded-t-3xl z-50">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 relative bg-transparent border-0 p-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* Gold glow indicator above active icon */}
            {isActive && (
              <div
                className="absolute -top-3 w-8 h-1 rounded-full"
                style={{
                  background: 'linear-gradient(to right, transparent, #DAA520, transparent)',
                  boxShadow: '0 0 10px rgba(218,165,32,0.80)',
                }}
              />
            )}
            <div
              className="transition-all duration-300"
              style={{
                color: isActive ? '#FACC15' : '#6b7280',
                transform: isActive ? 'translateY(-2px)' : 'none',
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
            </div>
            <span
              className="text-[10px] font-medium tracking-wider"
              style={{ color: isActive ? '#FACC15' : '#6b7280' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { TabId };
