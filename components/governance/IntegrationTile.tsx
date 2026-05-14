import StatusPill, { type StatusPillVariant } from "@/components/governance/StatusPill";

type Props = {
  name: string;
  envLabel: string;
  status: StatusPillVariant;
  statusLabel: string;
  lastSyncLine: string;
};

export default function IntegrationTile({ name, envLabel, status, statusLabel, lastSyncLine }: Props) {
  return (
    <div className="rounded-xl border border-cream-dark/65 bg-cream-mid/30 px-4 py-3.5 min-w-[160px] flex-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[15px] text-teal-dark truncate">{name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/45 mt-0.5">{envLabel}</p>
        </div>
        <StatusPill variant={status} className="shrink-0">
          {statusLabel}
        </StatusPill>
      </div>
      <p className="text-[11px] text-charcoal/55 mt-2.5 leading-relaxed">{lastSyncLine}</p>
    </div>
  );
}
