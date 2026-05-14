import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";

type Props = {
  id: string;
  orders: number;
  skuMix: string;
  station: string;
  queuedAt: string;
  variant: OpsStatusVariant;
};

export default function FulfillmentBatchRow({
  id,
  orders,
  skuMix,
  station,
  queuedAt,
  variant,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-dark/70 px-4 py-3 bg-white/85">
      <div className="min-w-0">
        <p className="font-display text-[15px] text-teal-dark">{id}</p>
        <p className="text-[13px] text-charcoal/70 mt-1">
          <span className="font-semibold text-charcoal">{orders}</span> orders · {skuMix}
        </p>
        <p className="text-[12px] text-charcoal/50 mt-1">{station}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <OpsStatusPill variant={variant} />
        <span className="text-[11px] text-charcoal/45">{queuedAt}</span>
      </div>
    </div>
  );
}
