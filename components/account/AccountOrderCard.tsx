import { formatMoney } from "@/lib/commerce/fulfillmentPreview";
import type { LoadedCommerceAccountOrder } from "@/lib/account/dashboardData";
import {
  formatOrderInstant,
  groupStatusHeadline,
  orderDisplayNumber,
  pipelineLabel,
} from "@/lib/account/orderPresentation";
import Link from "next/link";

export default function AccountOrderCard({ row }: { row: LoadedCommerceAccountOrder }) {
  const num = orderDisplayNumber(row.id);
  const n = row.fulfillmentGroups.length;
  const brief =
    n === 0 ? "Order details" : `${n} way${n === 1 ? "" : "s"} your order comes together`;

  return (
    <Link
      href={`/account/orders/${row.id}`}
      className="block rounded-2xl border border-cream-dark bg-white hover:border-teal-dark/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all p-5 md:p-6 group"
    >
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-teal-dark">Order #{num}</p>
          <p className="mt-1 text-[15px] font-medium text-charcoal">
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(row.createdAt)}
          </p>
          <p className="mt-2 text-[13px] text-charcoal/65 leading-snug capitalize">{brief}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {row.fulfillmentGroups.map((g) => (
              <span
                key={g.id}
                className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-teal/10 text-teal-dark border border-teal/20"
              >
                {pipelineLabel(g.pipeline)}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-charcoal">{formatMoney(row.totalCents / 100)}</p>
          <p className="mt-2 text-[12px] text-teal-dark font-semibold uppercase tracking-wide group-hover:underline">
            View · Track
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-cream-dark/80 space-y-2">
        {row.fulfillmentGroups.map((g) => (
          <p key={g.id} className="text-[13px] text-charcoal/75 flex gap-2">
            <span className="text-charcoal shrink-0">▸</span>
            <span>
              <span className="font-medium text-charcoal">{pipelineLabel(g.pipeline)}:</span>{" "}
              {groupStatusHeadline(g.pipeline, g.status)}
              {g.estimatedReadyAt ? (
                <span className="text-charcoal/55"> · approx. {formatOrderInstant(g.estimatedReadyAt)}</span>
              ) : null}
            </span>
          </p>
        ))}
      </div>
    </Link>
  );
}
