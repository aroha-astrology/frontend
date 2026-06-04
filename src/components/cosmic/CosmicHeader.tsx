import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CosmicHeaderProps {
  eyebrow?: string;
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  pillLabel?: string;
  pillHref?: string;
  pillStyle?: 'gold' | 'purple';
}

export function CosmicHeader({
  eyebrow,
  title,
  backHref,
  backLabel,
  className,
  pillLabel,
  pillHref,
  pillStyle = 'gold',
}: CosmicHeaderProps) {
  const pillClass =
    pillStyle === 'purple'
      ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#a78bfa]'
      : 'bg-[#e5c100]/10 border border-[#e5c100]/30 text-[#e5c100]';

  return (
    <header className={cn('px-6 pt-12 pb-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2 no-underline transition-colors"
          style={{ color: 'rgba(229,193,0,0.60)' }}
        >
          ‹ {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {eyebrow && !backHref && (
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1 italic"
              style={{ color: 'rgba(229,193,0,0.70)' }}>
              {eyebrow}
            </p>
          )}
          <h1
            className="text-3xl font-bold leading-tight tracking-wide truncate"
            style={{ fontFamily: 'var(--font-playfair, var(--font-cinzel, serif))', color: '#fff' }}
          >
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pillLabel && (
            pillHref
              ? <Link href={pillHref} className={cn('px-3 py-1 text-xs rounded-full font-semibold uppercase tracking-wider no-underline backdrop-blur-sm', pillClass)}>{pillLabel}</Link>
              : <span className={cn('px-3 py-1 text-xs rounded-full font-semibold uppercase tracking-wider backdrop-blur-sm', pillClass)}>{pillLabel}</span>
          )}
        </div>
      </div>
    </header>
  );
}
