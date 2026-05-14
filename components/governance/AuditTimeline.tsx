import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";

export type AuditTimelineRow = {
  id: string;
  actor: string;
  verb: string;
  target: string;
  relativeTime: string;
  severity: StatusPillVariant;
  severityLabel: string;
};

type Props = {
  rows: AuditTimelineRow[];
  className?: string;
};

export default function AuditTimeline({ rows, className = "" }: Props) {
  return (
    <ul className={`space-y-0 divide-y divide-cream-dark/55 ${className}`} role="list">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[13px] text-charcoal leading-snug">
              <span className="font-semibold text-charcoal">{row.actor}</span>
              <span className="text-charcoal/55"> {row.verb} </span>
              <span className="text-teal-dark/90">{row.target}</span>
            </p>
            <p className="text-[11px] text-charcoal/45 uppercase tracking-[0.12em]">{row.relativeTime}</p>
          </div>
          <StatusPill variant={row.severity} className="shrink-0 self-start sm:mt-0.5">
            {row.severityLabel}
          </StatusPill>
        </li>
      ))}
    </ul>
  );
}
