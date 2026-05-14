type Props = {
  label: string;
  value: string;
  hint?: string;
};

/** Sparse KPI line for ops dashboards */
export default function OpsMetricQuiet({ label, value, hint }: Props) {
  return (
    <div className="rounded-lg border border-cream-dark/60 bg-white/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/45">{label}</p>
      <p className="font-display text-xl text-charcoal mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-charcoal/52 mt-1 leading-snug">{hint}</p> : null}
    </div>
  );
}
