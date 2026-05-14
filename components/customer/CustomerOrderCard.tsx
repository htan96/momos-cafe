import Link from "next/link";
import CustomerStatusChip, { type CustomerStatusVariant } from "@/components/customer/CustomerStatusChip";

export type { CustomerStatusVariant };

export default function CustomerOrderCard({
  href,
  orderNumber,
  placedAt,
  summary,
  totalLabel,
  status,
  etaReassurance,
  pipelineBadges,
  className = "",
}: {
  href?: string;
  orderNumber: string;
  placedAt: string;
  summary: string;
  totalLabel?: string;
  status: CustomerStatusVariant;
  etaReassurance?: string;
  pipelineBadges?: string[];
  className?: string;
}) {
  const body = (
    <div
      className={`group block rounded-2xl border border-charcoal/[0.08] bg-white/95 p-5 md:p-6 shadow-[0_6px_24px_rgba(24,20,16,0.05)] transition-all hover:border-teal/25 hover:shadow-[0_14px_40px_rgba(24,20,16,0.07)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-dark">Order #{orderNumber}</p>
          <p className="mt-1.5 text-[15px] font-medium text-charcoal">{placedAt}</p>
          <p className="mt-2 text-[13px] text-charcoal/68 leading-snug">{summary}</p>
          {pipelineBadges && pipelineBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {pipelineBadges.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-cream-dark bg-cream/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/70"
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <CustomerStatusChip variant={status} />
          {totalLabel ? (
            <p className="font-display text-2xl text-charcoal tracking-tight">{totalLabel}</p>
          ) : null}
          {href ? (
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-dark group-hover:underline underline-offset-4">
              View details →
            </p>
          ) : null}
        </div>
      </div>
      {etaReassurance ? (
        <p className="mt-5 border-t border-cream-dark/80 pt-4 text-[13px] text-charcoal/65 leading-relaxed">
          {etaReassurance}
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-dark">
        {body}
      </Link>
    );
  }

  return body;
}
