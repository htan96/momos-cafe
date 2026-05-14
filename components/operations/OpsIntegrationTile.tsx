import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";

type Props = {
  name: string;
  hint: string;
  statusVariant: OpsStatusVariant;
  statusLabel?: string;
  detail: string;
};

/** Ops-flavored integration surface (Shippo/email/webhook framing). */
export default function OpsIntegrationTile({
  name,
  hint,
  statusVariant,
  statusLabel,
  detail,
}: Props) {
  return (
    <div className="rounded-xl border border-cream-dark/70 bg-white/85 px-4 py-4 min-w-[180px] flex-1 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[15px] text-charcoal truncate">{name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/42 mt-0.5">{hint}</p>
        </div>
        <OpsStatusPill variant={statusVariant}>{statusLabel}</OpsStatusPill>
      </div>
      <p className="text-[12px] text-charcoal/58 mt-2.5 leading-relaxed">{detail}</p>
    </div>
  );
}
