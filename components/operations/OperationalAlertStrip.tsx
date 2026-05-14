import Link from "next/link";
import type { OpsAlert } from "@/lib/operations/mockAdminOps";

const levelTone: Record<OpsAlert["level"], string> = {
  info: "border-charcoal/[0.1] bg-cream/80 text-charcoal/75",
  watch: "border-gold/40 bg-gold/[0.1] text-espresso/[0.9]",
  urgent: "border-red/28 bg-red/[0.07] text-red-dark/85",
};

type Props = {
  alerts: OpsAlert[];
};

export default function OperationalAlertStrip({ alerts }: Props) {
  if (!alerts.length) return null;
  return (
    <div role="region" aria-label="Operational alerts" className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] leading-snug ${levelTone[a.level]}`}
        >
          <p className="min-w-0 flex-1">{a.message}</p>
          {a.href && a.hrefLabel ? (
            <Link
              href={a.href}
              className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark hover:underline underline-offset-4"
            >
              {a.hrefLabel} →
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
