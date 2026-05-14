import CustomerTimelineItem, { type CustomerTimelineVisualTone } from "@/components/customer/CustomerTimelineItem";

export type CustomerTimelineStep = {
  id: string;
  title: string;
  meta?: string;
  tone: CustomerTimelineVisualTone;
  detail?: string;
};

export default function CustomerTimeline({ steps }: { steps: CustomerTimelineStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="mt-1">
      {steps.map((s, i) => (
        <CustomerTimelineItem
          key={s.id}
          title={s.title}
          meta={s.meta}
          tone={s.tone}
          isLast={i === steps.length - 1}
        >
          {s.detail}
        </CustomerTimelineItem>
      ))}
    </ol>
  );
}
