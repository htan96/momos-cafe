type Props = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

export default function MetricQuiet({ label, value, hint }: Props) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-cream-dark/40 last:border-0">
      <div className="min-w-0">
        <p className="text-[12px] text-charcoal/55 uppercase tracking-[0.1em] font-semibold">{label}</p>
        {hint ? <p className="text-[11px] text-charcoal/45 mt-0.5">{hint}</p> : null}
      </div>
      <div className="text-right text-[15px] font-semibold text-charcoal tabular-nums shrink-0">{value}</div>
    </div>
  );
}
