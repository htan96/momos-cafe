import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";

type Props = {
  orderRef: string;
  carrier: string;
  code: string;
  detail: string;
  attemptedAt: string;
  variant: OpsStatusVariant;
};

export default function ShipmentExceptionRow({
  orderRef,
  carrier,
  code,
  detail,
  attemptedAt,
  variant,
}: Props) {
  return (
    <article className="rounded-xl border border-cream-dark/80 bg-cream/[0.35] px-4 py-3.5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-charcoal text-[14px]">{orderRef}</p>
          <OpsStatusPill variant={variant} />
          <span className="text-[11px] font-mono text-charcoal/55">{code}</span>
        </div>
        <p className="text-[12px] text-charcoal/55 mt-1">{carrier}</p>
        <p className="text-[13px] text-charcoal/72 mt-2 leading-snug">{detail}</p>
      </div>
      <p className="text-[11px] text-charcoal/45 sm:text-right whitespace-nowrap">{attemptedAt}</p>
    </article>
  );
}
