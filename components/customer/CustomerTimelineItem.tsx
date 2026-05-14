import type { ReactNode } from "react";

export type CustomerTimelineVisualTone = "done" | "current" | "upcoming";

export default function CustomerTimelineItem({
  title,
  meta,
  children,
  tone,
  isLast,
}: {
  title: string;
  meta?: string;
  children?: ReactNode;
  tone: CustomerTimelineVisualTone;
  isLast?: boolean;
}) {
  const dot =
    tone === "current"
      ? "bg-teal-dark ring-4 ring-white"
      : tone === "done"
        ? "bg-teal-dark/55 ring-4 ring-white"
        : "bg-charcoal/30 ring-4 ring-white";

  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        {!isLast ? <span className="mt-1 w-px flex-1 bg-gold/35 min-h-[1.25rem]" aria-hidden /> : null}
      </div>
      <div className={`min-w-0 pb-6 ${isLast ? "pb-0" : ""}`}>
        <p className="text-[13px] font-semibold text-charcoal leading-snug">{title}</p>
        {meta ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-charcoal/45 mt-1">{meta}</p>
        ) : null}
        {children ? <div className="mt-2 text-[13px] text-charcoal/70 leading-relaxed">{children}</div> : null}
      </div>
    </li>
  );
}
