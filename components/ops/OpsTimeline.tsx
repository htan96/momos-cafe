export interface OpsTimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  ts: Date | string;
}

export default function OpsTimeline({ items }: { items: OpsTimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[#c9bba8]/80 text-sm py-6 border border-dashed border-[#3d3830] rounded-lg text-center">
        No timeline entries yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-[#3d3830] ml-2 space-y-5 pl-6 py-1">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-[#2f6d66] ring-4 ring-[#1c1916]" />
          <p className="text-[13px] font-semibold text-[#f5e5c0]">{item.title}</p>
          {item.subtitle ? (
            <p className="text-[12px] text-[#c9bba8]/90 mt-0.5">{item.subtitle}</p>
          ) : null}
          <time className="text-[11px] text-[#c9bba8]/60 mt-1 block">
            {typeof item.ts === "string" ? item.ts : item.ts.toLocaleString()}
          </time>
        </li>
      ))}
    </ol>
  );
}
