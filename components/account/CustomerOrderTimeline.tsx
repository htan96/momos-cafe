import type { CustomerTimelineEvent } from "@/lib/account/orderPresentation";
import { formatOrderInstant } from "@/lib/account/orderPresentation";

export default function CustomerOrderTimeline({ events }: { events: CustomerTimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-charcoal/55">No timeline entries yet.</p>;
  }

  return (
    <ol className="relative border-l-2 border-gold/35 pl-6 space-y-6 ml-2">
      {events.map((e, i) => (
        <li key={`${e.id}-${i}`} className="relative">
          <span
            className={`absolute -left-[9px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${
              e.tone === "current"
                ? "bg-teal-dark"
                : e.tone === "muted"
                  ? "bg-charcoal/35"
                  : "bg-teal-dark/55"
            }`}
            aria-hidden
          />
          <p className="text-[13px] font-semibold text-charcoal leading-snug">{e.title}</p>
          <p className="text-[11px] uppercase tracking-wider text-charcoal/45 mt-1">
            {formatOrderInstant(e.at)}
          </p>
          {e.detail ? (
            <p className="text-[13px] text-charcoal/70 mt-1.5 leading-relaxed">{e.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
