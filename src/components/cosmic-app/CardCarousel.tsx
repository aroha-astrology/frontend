'use client';

import { User } from 'lucide-react';

const CARDS = [
  {
    id: 1,
    title: 'YOUR ASTROLOGER',
    subtitle: 'Pandit Sharma',
    icon: <User size={24} className="text-yellow-400" />,
    content: 'Available for consultation. Your chart indicates strong career shifts today.',
    bg: 'radial-gradient(circle at top right, rgba(138,43,226,0.20), transparent 70%)',
    borderTop: 'rgba(138,43,226,0.30)',
  },
  {
    id: 2,
    title: 'MOON SIGN',
    subtitle: 'Cancer (Karka)',
    icon: <span className="text-2xl leading-none">♋</span>,
    content: 'Emotions run deep today. Trust your intuition over logic in family matters.',
    bg: 'radial-gradient(circle at top right, rgba(65,105,225,0.20), transparent 70%)',
    borderTop: 'rgba(65,105,225,0.30)',
  },
  {
    id: 3,
    title: 'SUN SIGN',
    subtitle: 'Leo (Simha)',
    icon: <span className="text-2xl leading-none">♌</span>,
    content: 'Your natural leadership is highlighted. Take charge of new projects with confidence.',
    bg: 'radial-gradient(circle at top right, rgba(218,165,32,0.20), transparent 70%)',
    borderTop: 'rgba(218,165,32,0.30)',
  },
];

export function CardCarousel() {
  return (
    <div
      className="w-full overflow-x-auto hide-scrollbar card-snap-x flex gap-4 pt-4 pb-8 pl-4"
      aria-label="Astrology cards"
    >
      {CARDS.map(card => (
        <div
          key={card.id}
          className="card-snap-item glass-panel flex-shrink-0 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between"
          style={{
            width: '82vw',
            maxWidth: 320,
            height: 192,
            backgroundImage: card.bg,
            borderTop: `2px solid ${card.borderTop}`,
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] tracking-[0.20em] text-gray-400 uppercase font-bold">
                {card.title}
              </p>
              <h3 className="cinzel-font text-xl mt-1 text-white">{card.subtitle}</h3>
            </div>
            <div className="p-2 rounded-full bg-black/30 border border-white/5">
              {card.icon}
            </div>
          </div>

          <p className="text-sm text-gray-300 font-light leading-relaxed line-clamp-2 mt-4">
            {card.content}
          </p>

          {/* Decorative bottom line */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        </div>
      ))}
      {/* trailing spacer */}
      <div className="flex-shrink-0 w-4" />
    </div>
  );
}
