'use client';

import { cn } from '@/lib/utils';

interface DataChipProps {
  kind: string;
  label: string;
  value?: number | string | null;
  sentiment?: 'high' | 'neutral' | 'low';
  className?: string;
}

const sentimentStyles = {
  high: 'bg-green-500/10 text-green-400 border-green-500/20',
  neutral: 'bg-primary/10 text-primary border-primary/20',
  low: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function DataChip({
  kind,
  label,
  value,
  sentiment = 'neutral',
  className,
}: DataChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        sentimentStyles[sentiment],
        className,
      )}
    >
      {label}
      {value != null && (
        <span className="font-bold">{value}</span>
      )}
    </span>
  );
}
