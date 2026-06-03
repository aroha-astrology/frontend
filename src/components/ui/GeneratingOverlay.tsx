'use client';

import { WisdomLoader } from './wisdom-loader';

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

interface Props {
  visible: boolean;
  type: 'kundli' | 'report';
  name?: string;
  onContinue: () => void;
}

export function GeneratingOverlay({ visible, type, name, onContinue }: Props) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: 'rgba(17,19,26,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      {/* Card */}
      <div
        className="relative w-[316px] rounded-[32px] px-8 py-9 text-center overflow-hidden bg-surface border border-border"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Top shimmer */}
        <div
          className="absolute top-0 left-6 right-6 h-[1.5px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55,0.60), transparent)' }}
        />
        {/* Radial bg glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212, 175, 55,0.07) 0%, transparent 62%)' }}
        />

        {/* Zodiac wheel */}
        <div className="relative mx-auto mb-7" style={{ width: 132, height: 132 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: '1px dashed rgba(212, 175, 55,0.25)' }}
          />
          <div
            className="absolute"
            style={{ inset: 12, borderRadius: '50%', border: '1px solid rgba(212, 175, 55,0.12)' }}
          />

          {/* Zodiac symbols */}
          {ZODIAC.map((sym, i) => {
            const rad = (i * 30 - 90) * (Math.PI / 180);
            const r = 52;
            return (
              <span
                key={sym}
                className="absolute text-[11px] select-none"
                style={{
                  left: `calc(50% + ${r * Math.cos(rad)}px - 7px)`,
                  top: `calc(50% + ${r * Math.sin(rad)}px - 8px)`,
                  color: 'rgba(212, 175, 55,0.55)',
                }}
              >
                {sym}
              </span>
            );
          })}

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl">{type === 'kundli' ? '♃' : '♄'}</span>
          </div>
        </div>

        {/* Heading */}
        <p className="j-eyebrow mb-2">
          ✦ &nbsp;Yogi Baba
        </p>
        <h3 className="text-[16px] font-semibold text-text leading-snug mb-0.5">
          is handcrafting your
        </h3>
        <h3 className="j-display text-[22px] text-primary mb-1.5 leading-tight">
          {type === 'kundli' ? 'Kundli' : 'Report'}
        </h3>
        {name && (
          <p className="text-[12px] text-text-muted mb-5">
            for{' '}
            <span className="font-semibold text-text">{name}</span>
          </p>
        )}

        {/* Cycling wisdom text */}
        <div className="flex justify-center mb-6">
          <WisdomLoader section="kundli" size="sm" />
        </div>

        {/* CTA button */}
        <button
          onClick={onContinue}
          className="w-full rounded-2xl py-3.5 text-[13px] font-bold border-none cursor-pointer mb-4 bg-primary text-white"
          style={{ boxShadow: '0 4px 16px rgba(212, 175, 55,0.30)' }}
        >
          Continue exploring →
        </button>

        <p className="text-[10px] leading-relaxed text-text-muted">
          We&apos;ll notify you the moment
          <br />
          your {type === 'kundli' ? 'cosmic blueprint' : 'report'} is ready
        </p>
      </div>
    </div>
  );
}
