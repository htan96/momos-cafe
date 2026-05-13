import { formatOrderInstant } from "@/lib/account/orderPresentation";
import type { LoadedCommerceAccountOrder } from "@/lib/account/dashboardData";
import { pipelineLabel, groupStatusHeadline } from "@/lib/account/orderPresentation";

export default function OrderFulfillmentTree({
  fulfillmentGroups,
}: {
  fulfillmentGroups: LoadedCommerceAccountOrder["fulfillmentGroups"];
}) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-white overflow-hidden shadow-sm">
      <div className="bg-teal-dark/95 text-cream px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cream/85">Your order</p>
        <p className="font-display text-lg mt-0.5 leading-tight">
          Every part of this visit, lined up in one place
        </p>
      </div>
      <ul className="divide-y divide-cream-dark">
        {fulfillmentGroups.map((g, idx) => {
          const shipment = g.shipments[0];
          const isLast = idx === fulfillmentGroups.length - 1;
          const branch = idx === 0 ? "┌─" : isLast ? "└─" : "├─";
          return (
            <li key={g.id} className="p-5 md:p-6">
              <div className="flex gap-3 items-start">
                <span className="text-teal-dark/80 font-mono text-sm pt-0.5 select-none" aria-hidden>
                  {branch}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-dark">
                    {pipelineLabel(g.pipeline)}
                  </p>
                  <p className="text-[16px] font-medium text-charcoal leading-snug">
                    {groupStatusHeadline(g.pipeline, g.status)}
                  </p>
                  {g.estimatedReadyAt ? (
                    <p className="text-[13px] text-charcoal/70">
                      Target ready · <span className="font-medium">{formatOrderInstant(g.estimatedReadyAt)}</span>
                    </p>
                  ) : null}
                  {g.pickupWindow ? (
                    <p className="text-[13px] text-charcoal/65">{g.pickupWindow.label}</p>
                  ) : null}
                  {shipment?.trackingNumber ? (
                    <p className="text-[13px] text-charcoal/80 mt-2">
                      Tracking ·{" "}
                      <span className="font-mono tracking-tight">{shipment.trackingNumber}</span>
                      {shipment.carrier ? (
                        <span className="text-charcoal/55"> ({shipment.carrier})</span>
                      ) : null}
                      {shipment.shippingService ? (
                        <span className="block text-charcoal/55">{shipment.shippingService}</span>
                      ) : null}
                    </p>
                  ) : shipment && g.pipeline.toUpperCase() === "RETAIL" ? (
                    <p className="text-[13px] text-charcoal/55 italic mt-2">Tracking arrives as soon as your shipper scans it.</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
