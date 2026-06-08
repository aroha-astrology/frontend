interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-gold font-display">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}
