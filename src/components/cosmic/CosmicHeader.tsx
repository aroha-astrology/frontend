import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CosmicHeaderProps {
  eyebrow?: string;
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  action?: React.ReactNode;
}

export function CosmicHeader({
  eyebrow,
  title,
  backHref,
  backLabel,
  className,
  action,
}: CosmicHeaderProps) {
  return (
    <header className={cn('px-4 pt-4 pb-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1 no-underline transition-colors"
              style={{ color: 'rgba(155,127,232,0.70)' }}
            >
              ‹ {backLabel ?? 'Back'}
            </Link>
          )}
          {eyebrow && !backHref && (
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-0.5" style={{ color: 'rgba(155,127,232,0.70)' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl font-bold tracking-wide truncate" style={{ color: '#F0F0FF' }}>
            {title}
          </h1>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
