import OpsPanel from "@/components/operations/OpsPanel";
import type { OpsStatusVariant } from "@/components/operations/opsTokens";
import WorkflowTimelineRow from "@/components/operations/WorkflowTimelineRow";

export type WorkflowTimelineStep = {
  id: string;
  label: string;
  meta: string;
  at: string;
  variant: OpsStatusVariant;
};

type Props = {
  eyebrow?: string;
  title: string;
  steps: WorkflowTimelineStep[];
};

export default function WorkflowTimeline({ eyebrow = "Timeline", title, steps }: Props) {
  const lastIdx = steps.length - 1;
  return (
    <OpsPanel eyebrow={eyebrow} title={title}>
      <div className="space-y-0">
        {steps.map((s, i) => (
          <WorkflowTimelineRow key={s.id} {...s} emphasize={i === lastIdx && s.variant !== "delivered"} />
        ))}
      </div>
    </OpsPanel>
  );
}
