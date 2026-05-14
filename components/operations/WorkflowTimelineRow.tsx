import OpsStatusPill from "@/components/operations/OpsStatusPill";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";

type Props = {
  label: string;
  meta: string;
  at: string;
  variant: OpsStatusVariant;
  emphasize?: boolean;
};

export default function WorkflowTimelineRow({ label, meta, at, variant, emphasize }: Props) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-l-2 border-cream-dark pl-4 py-2 ${emphasize ? "bg-cream/40 rounded-r-xl -mr-3 pr-3" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-charcoal">{label}</p>
          <OpsStatusPill variant={variant} />
        </div>
        <p className="text-[12px] text-charcoal/58 mt-1 leading-snug">{meta}</p>
      </div>
      <p className="text-[11px] font-medium text-charcoal/45 whitespace-nowrap text-right">{at}</p>
    </div>
  );
}
