'use client';

interface Finding {
  id: string;
  kind: string;
  claim: string;
  evidence?: Record<string, unknown>;
}

interface YogaCardProps {
  yogas: Finding[];
  className?: string;
}

export default function YogaCard({ yogas, className = '' }: YogaCardProps) {
  if (!yogas.length) return null;

  return (
    <div className={className}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-accent text-xs">✦</span>
        Yogas Detected
        <span className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
      </h3>

      <div className="space-y-2">
        {yogas.map((y) => {
          const name = y.claim.split(' — ')[0] ?? y.id;
          const desc = y.claim.split(' — ')[1] ?? y.claim;
          return (
            <div
              key={y.id}
              className="p-3 rounded-xl border border-green-500/15 bg-green-500/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400 text-xs">✦</span>
                <span className="text-xs font-bold text-green-400">{name}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed pl-5">{desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
