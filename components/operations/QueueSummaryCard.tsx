import OpsPanel from "@/components/operations/OpsPanel";
import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";

type Props = {
  name: string;
  depth: number;
  oldestWait: string;
  slaHint: string;
  assignee: string | null;
  status: OpsStatusVariant;
};

export default function QueueSummaryCard({ name, depth, oldestWait, slaHint, assignee, status }: Props) {
  return (
    <OpsPanel className="h-full flex flex-col" title={name}>
      <div className="space-y-3 -mt-1">
        <p className="text-[11px] text-charcoal/50">
          {assignee ? <span>{assignee}</span> : <span className="italic">Assignee placeholder · pooled</span>}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1 min-w-0">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Depth</dt>
              <dd className="font-display text-2xl text-charcoal">{depth}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal/45">Oldest wait</dt>
              <dd className="font-semibold text-charcoal">{oldestWait}</dd>
            </div>
          </dl>
          <OpsStatusPill variant={status} />
        </div>
        <p className="text-[12px] text-charcoal/55 leading-snug">{slaHint}</p>
      </div>
    </OpsPanel>
  );
}
