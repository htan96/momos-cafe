import Link from "next/link";

export default function RewardsSummaryCard({
  tierLabel,
  tagline,
  progressLabel,
  progressPercent,
  actionHref,
  actionLabel,
}: {
  tierLabel: string;
  tagline: string;
  progressLabel: string;
  progressPercent: number;
  actionHref?: string;
  actionLabel?: string;
}) {
  const pct = Math.min(100, Math.max(0, progressPercent));
  return (
    <div className="rounded-2xl border border-gold/35 bg-gradient-to-br from-cream via-white to-cream-dark/30 p-6 md:p-7 shadow-[0_8px_30px_rgba(24,20,16,0.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">Moments with Momo’s</p>
      <p className="mt-3 font-display text-2xl text-charcoal tracking-tight">{tierLabel}</p>
      <p className="mt-2 text-[14px] text-charcoal/68 leading-relaxed">{tagline}</p>
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-charcoal/55">
          <span>{progressLabel}</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-cream-dark/50">
          <div
            className="h-full rounded-full bg-teal-dark/85 transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex text-[13px] font-semibold text-red hover:text-red-dark underline-offset-4 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
