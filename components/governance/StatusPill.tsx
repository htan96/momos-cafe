export type StatusPillVariant = "ok" | "degraded" | "down" | "neutral" | "warning" | "critical";

type Props = {
  variant: StatusPillVariant;
  children: React.ReactNode;
  className?: string;
};

const tone: Record<StatusPillVariant, string> = {
  ok: "border-teal/20 bg-teal/[0.08] text-teal-dark/90",
  degraded: "border-gold/35 bg-gold/[0.12] text-charcoal/80",
  down: "border-charcoal/15 bg-charcoal/[0.07] text-charcoal/72",
  neutral: "border-cream-dark/80 bg-cream-mid/60 text-charcoal/70",
  warning: "border-gold/40 bg-gold/[0.15] text-espresso/90",
  critical: "border-red/22 bg-red/[0.08] text-red-dark/92",
};

export default function StatusPill({ variant, children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.12em] ${tone[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
