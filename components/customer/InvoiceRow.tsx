import type { ReactNode } from "react";

export default function InvoiceRow({
  label,
  subtitle,
  amount,
  date,
  status,
  actions,
}: {
  label: string;
  subtitle?: string;
  amount: string;
  date: string;
  status: "paid" | "due" | "draft";
  actions?: ReactNode;
}) {
  const statusClass =
    status === "paid"
      ? "bg-emerald-50 text-emerald-950/80 border-emerald-200/70"
      : status === "due"
        ? "bg-amber-50 text-amber-950/85 border-amber-200/70"
        : "bg-cream-dark/40 text-charcoal/65 border-cream-dark";

  const statusLabel = status === "paid" ? "Paid" : status === "due" ? "Due" : "Draft";

  return (
    <div className="flex flex-col gap-4 border-b border-cream-dark/80 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-charcoal">{label}</p>
        {subtitle ? <p className="mt-0.5 text-[12px] text-charcoal/55 font-mono tracking-tight">{subtitle}</p> : null}
        <p className="mt-2 text-[12px] text-charcoal/50">{date}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass}`}
        >
          {statusLabel}
        </span>
        <p className="font-display text-xl text-charcoal tracking-tight tabular-nums">{amount}</p>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
