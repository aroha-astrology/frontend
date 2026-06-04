import { ChevronRight, Calendar, Heart, Lock } from 'lucide-react';

const FEATURES = [
  { title: 'Daily Horoscope',                  icon: Calendar,  locked: false, badge: '100%' },
  { title: 'Kundli Matching',                   icon: Heart,     locked: false, badge: 'New' },
  { title: 'Sherlock Mode (Partner Analysis)',   icon: Lock,      locked: true,  badge: 'Unlock' },
  { title: 'Detailed Transit Report',            icon: Lock,      locked: true,  badge: 'Unlock' },
];

export function FeatureList() {
  return (
    <div className="px-4 pb-28">
      <h3 className="cinzel-font text-lg text-gray-300 mb-4 px-2">Mystic Features</h3>
      <div className="flex flex-col gap-3">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="glass-panel p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-colors hover:bg-white/5 active:bg-white/10"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${item.locked ? 'bg-gray-800/50 text-gray-500' : 'bg-blue-900/40 text-blue-300'}`}>
                  <Icon size={18} />
                </div>
                <span className={`font-medium text-sm ${item.locked ? 'text-gray-400' : 'text-gray-200'}`}>
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{item.badge}</span>
                {!item.locked && <ChevronRight size={16} className="text-gray-500" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
