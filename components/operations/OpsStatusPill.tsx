import { type OpsStatusVariant, opsStatusTone } from "@/components/operations/opsTokens";

export type { OpsStatusVariant };

type Props = {
  variant: OpsStatusVariant;
  children?: React.ReactNode;
  className?: string;
};

/** Subdued fulfillment / shipment / support states — intentionally separate from governance StatusPill. */
export default function OpsStatusPill({ variant, children, className = "" }: Props) {
  const t = opsStatusTone[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.12em] ${t.className} ${className}`}
    >
      {children ?? t.label}
    </span>
  );
}
