'use client';

interface Finding {
  id: string;
  kind: string;
  claim: string;
  evidence?: Record<string, unknown>;
}

interface DoshaCardProps {
  doshas: Finding[];
  className?: string;
}

export default function DoshaCard({ doshas, className = '' }: DoshaCardProps) {
  if (!doshas.length) return null;

  return (
    <div className={className}>
      <h3 className="text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-3 flex items-center gap-2">
        <span className="text-red-400 text-xs">⚠</span>
        Doshas Detected
        <span className="h-px flex-1 bg-gradient-to-r from-red-400/30 to-transparent" />
      </h3>

      <div className="space-y-2">
        {doshas.map((d) => {
          const name = d.claim.split(' — ')[0] ?? d.id;
          const desc = d.claim.split(' — ')[1] ?? d.claim;
          return (
            <div
              key={d.id}
              className="p-3 rounded-xl border border-red-500/15 bg-red-500/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-400 text-xs">⚠</span>
                <span className="text-xs font-bold text-red-400">{name}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed pl-5">{desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
