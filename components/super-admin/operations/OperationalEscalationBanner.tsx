import type { ReactNode } from "react";

import { operationalDashboardSeverityIsEscalated } from "@/lib/operations/incidentEscalationSemantics";

type Props = {
  severity?: string | null;
  /** When true, show banner even if severity string is missing (call sites own the gate). */
  forceShow?: boolean;
  title?: string;
  children: ReactNode;
};

/**
 * Lightweight escalation strip when rollup severity is HIGH/CRITICAL (see incidentEscalationSemantics).
 */
export default function OperationalEscalationBanner({ severity, forceShow, title = "Escalation", children }: Props) {
  const match = operationalDashboardSeverityIsEscalated(severity);
  if (!forceShow && !match) return null;

  return (
    <div className="rounded-xl border border-amber-300/90 bg-amber-50/90 px-4 py-3 shadow-sm text-[13px] text-charcoal/85 leading-snug space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/80">{title}</p>
      {children}
    </div>
  );
}
