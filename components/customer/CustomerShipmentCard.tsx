import CustomerStatusChip, { type CustomerStatusVariant } from "@/components/customer/CustomerStatusChip";
import CustomerTimeline, { type CustomerTimelineStep } from "@/components/customer/CustomerTimeline";

export default function CustomerShipmentCard({
  orderRef,
  carrier,
  destination,
  trackingMasked,
  status,
  delayed,
  timeline,
  className = "",
}: {
  orderRef: string;
  carrier: string;
  destination?: string;
  trackingMasked: string;
  status: CustomerStatusVariant;
  delayed?: boolean;
  timeline: CustomerTimelineStep[];
  className?: string;
}) {
  return (
    <article
      className={`rounded-2xl border border-charcoal/[0.08] bg-white/95 p-5 md:p-6 shadow-[0_6px_24px_rgba(24,20,16,0.05)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-dark">{orderRef}</p>
          <p className="mt-2 font-display text-lg text-charcoal tracking-tight">{carrier}</p>
          {destination ? <p className="mt-1 text-[13px] text-charcoal/60">{destination}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <CustomerStatusChip variant={status} />
          {delayed ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/50">
              Running a touch behind
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-5 font-mono text-[13px] tracking-tight text-charcoal/80">Tracking · {trackingMasked}</p>
      <div className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45">Progress</p>
        <div className="mt-3">
          <CustomerTimeline steps={timeline} />
        </div>
      </div>
    </article>
  );
}
